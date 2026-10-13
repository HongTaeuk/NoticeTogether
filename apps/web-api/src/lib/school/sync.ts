import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeNotice, type ChecklistItemDraft } from "@/lib/ai/summarize";
import { isMissingMigrationError } from "@/lib/household/members";
import { fetchDetail, listPosts, SUPPORTED_FAMILIES, type BoardRef } from "./adapters";
import { discoverBoards, type FoundBoard } from "./discover";
import { extractAttachmentText } from "./extract";
import { fetchBinary } from "./http";

/**
 * 학교 가정통신문 → 가정의 알림. 앱이 열릴 때(Pull, PRD FR-2와 같은 방식) 부르면 그 사이 올라온 글을 가져온다.
 * - 게시판 목록은 학교 단위로 30분에 한 번만 읽는다(학교 서버 부담·REPORT §9.2).
 * - 글 상세·첨부 글자·AI 요약은 학교 단위로 한 번만 만들고(school_posts), 가정마다 알림으로 복사한다.
 * - 한 번 호출에 몇 건만 처리하고(서버리스 시간 제한) 남은 건수를 알려 준다 — 앱이 이어서 다시 부른다.
 */
export const SCHOOL_MIGRATION_MESSAGE = "학교 연결을 쓰려면 DB 업데이트(0006)가 필요해요. 관리자에게 알려주세요.";

const LIST_REFRESH_MS = 30 * 60 * 1000;
const DISCOVER_RETRY_MS = 24 * 60 * 60 * 1000;
const FIRST_WINDOW_DAYS = 14; // 처음 연결할 때 최근 2주 글까지 가져온다
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_TEXT = 14000;

type Db = SupabaseClient;

export type SchoolRow = {
  household_id: string;
  atpt_code: string;
  atpt_name: string | null;
  school_code: string;
  school_name: string;
  homepage: string | null;
  grade: number | null;
  linked_at: string;
  boards_checked_at: string | null;
};

type BoardRow = BoardRef & {
  id: string;
  school_code: string;
  kind: "notice" | "office_notice" | "weekly";
  label: string;
  last_checked_at: string | null;
  last_error: string | null;
};

type PostRow = {
  id: string;
  board_id: string;
  post_key: string;
  title: string;
  posted_on: string | null;
  url: string;
  body_text: string | null;
  ai_summary: string | null;
  ai_items: ChecklistItemDraft[] | null;
  status: "listed" | "ready" | "failed";
};

export type BoardStatus = { label: string; kind: string; supported: boolean; lastCheckedAt: string | null; error: string | null };
export type SchoolStatus = {
  linked: boolean;
  needsMigration?: boolean;
  school?: { name: string; atptName: string | null; grade: number | null; homepage: string | null };
  boards: BoardStatus[];
  supported: boolean;
  lastCheckedAt: string | null;
  delivered?: number;
  pending?: number;
};

export async function loadHouseholdSchool(db: Db, householdId: string): Promise<{ school: SchoolRow | null; needsMigration: boolean }> {
  const { data, error } = await db.from("household_schools").select("*").eq("household_id", householdId).maybeSingle();
  if (error) {
    if (isMissingMigrationError(error)) return { school: null, needsMigration: true };
    throw new Error(error.message);
  }
  return { school: (data as SchoolRow | null) ?? null, needsMigration: false };
}

async function loadBoards(db: Db, schoolCode: string): Promise<BoardRow[]> {
  const { data, error } = await db.from("school_boards").select("*").eq("school_code", schoolCode).order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as BoardRow[];
}

async function saveBoards(db: Db, schoolCode: string, found: FoundBoard[]) {
  if (found.length === 0) return;
  const rows = found.map((b) => ({ school_code: schoolCode, kind: b.kind, label: b.label, family: b.family, list_url: b.list_url, params: b.params }));
  const { error } = await db.from("school_boards").upsert(rows, { onConflict: "school_code,list_url", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/** 이 학교의 게시판을 아직 모르면(또는 하루 지나 다시 볼 때가 됐으면) 홈페이지에서 찾는다. */
export async function ensureBoards(db: Db, school: SchoolRow, force = false): Promise<BoardRow[]> {
  let boards = await loadBoards(db, school.school_code);
  const stale = !school.boards_checked_at || Date.now() - Date.parse(school.boards_checked_at) > DISCOVER_RETRY_MS;
  if ((boards.length === 0 && stale) || force) {
    if (school.homepage) {
      try {
        const { boards: found } = await discoverBoards(school.homepage);
        await saveBoards(db, school.school_code, found);
      } catch {
        // 홈페이지가 잠시 안 열려도 다음 날 다시 찾는다 — 연결 자체는 실패시키지 않는다.
      }
    }
    await db.from("household_schools").update({ boards_checked_at: new Date().toISOString() }).eq("household_id", school.household_id);
    boards = await loadBoards(db, school.school_code);
  }
  return boards;
}

/**
 * 제목·게시판 이름에 적힌 학년. "2026학년도"의 6을 6학년으로 잘못 읽지 않는다(REPORT §6.6 정정 사례).
 * "3-6학년", "5, 6학년", "1~2학년"도 읽는다.
 */
export function gradesIn(text: string): Set<number> {
  const out = new Set<number>();
  const t = text.replace(/\d{4}\s*학년도/g, " ");
  for (const m of t.matchAll(/(?<!\d)([1-6])\s*[~\-–]\s*([1-6])\s*학년(?!도)/g)) {
    for (let g = Number(m[1]); g <= Number(m[2]); g++) out.add(g);
  }
  for (const m of t.matchAll(/(?<!\d)((?:[1-6]\s*[,·]\s*)+[1-6])\s*학년(?!도)/g)) {
    for (const g of m[1].split(/[,·]/)) out.add(Number(g.trim()));
  }
  for (const m of t.matchAll(/(?<![\d~\-–,·]\s?)([1-6])\s*학년(?!도)/g)) out.add(Number(m[1]));
  return out;
}

function forMyGrade(text: string, grade: number | null): boolean {
  if (!grade) return true;
  const gs = gradesIn(text);
  return gs.size === 0 || gs.has(grade);
}

export function boardStatuses(boards: BoardRow[]): BoardStatus[] {
  return boards.map((b) => ({
    label: b.label,
    kind: b.kind,
    // 형식은 알아도 로그인 뒤에 있는 게시판(광주 일부)은 받을 수 없으니 "지원"으로 세지 않는다.
    supported: (SUPPORTED_FAMILIES as string[]).includes(b.family) && !/로그인/.test(b.last_error ?? ""),
    lastCheckedAt: b.last_checked_at,
    error: b.last_error,
  }));
}

export function schoolStatus(school: SchoolRow | null, boards: BoardRow[]): SchoolStatus {
  if (!school) return { linked: false, boards: [], supported: false, lastCheckedAt: null };
  const statuses = boardStatuses(boards);
  const checked = boards.map((b) => b.last_checked_at).filter((v): v is string => !!v).sort();
  return {
    linked: true,
    school: { name: school.school_name, atptName: school.atpt_name, grade: school.grade, homepage: school.homepage },
    boards: statuses,
    supported: statuses.some((b) => b.supported),
    lastCheckedAt: checked[checked.length - 1] ?? null,
  };
}

async function refreshList(db: Db, board: BoardRow) {
  try {
    const posts = await listPosts(board);
    if (posts.length > 0) {
      const rows = posts.map((p) => ({
        board_id: board.id,
        school_code: board.school_code,
        post_key: p.postKey,
        title: p.title,
        posted_on: p.postedOn,
        url: p.url,
      }));
      const { error } = await db.from("school_posts").upsert(rows, { onConflict: "board_id,post_key", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
    await db.from("school_boards").update({ last_checked_at: new Date().toISOString(), last_error: null }).eq("id", board.id);
  } catch (err) {
    await db
      .from("school_boards")
      .update({ last_checked_at: new Date().toISOString(), last_error: err instanceof Error ? err.message.slice(0, 300) : "읽기 실패" })
      .eq("id", board.id);
  }
}

/** 글 상세·첨부 글자를 모으고 AI 요약을 만들어 school_posts에 저장한다(학교 단위로 한 번). */
async function ensureReady(db: Db, school: SchoolRow, board: BoardRow, post: PostRow): Promise<PostRow | null> {
  if (post.status === "ready") return post;
  try {
    const detail = await fetchDetail(board, { postKey: post.post_key, url: post.url });
    const parts: string[] = [];
    // 첨부 정보와 함께 본문 그림 주소도 같은 칸(attachments)에 kind:"image"로 둔다 — 그림으로만 올린 안내를 앱에서 바로 보여 주려고.
    const attachments: ({ name: string; url: string; size: number | null; chars: number } | { kind: "image"; url: string })[] =
      detail.images.map((url) => ({ kind: "image" as const, url }));
    for (const att of detail.attachments.slice(0, MAX_ATTACHMENTS)) {
      let chars = 0;
      if (!att.size || att.size <= MAX_ATTACHMENT_BYTES) {
        const data = await fetchBinary(att.url, MAX_ATTACHMENT_BYTES).catch(() => null);
        const text = data ? await extractAttachmentText(att.name, data) : null;
        if (text && text.trim()) {
          chars = text.length;
          parts.push(`── 첨부: ${att.name} ──\n${text.trim()}`);
        }
      }
      attachments.push({ ...att, chars });
    }
    const body = detail.bodyText.trim();
    const readable = (body + parts.join("")).replace(/\s/g, "").length >= 60;
    const composed = [
      `[${school.school_name} ${board.label}] ${post.title}`,
      post.posted_on ? `게시일: ${post.posted_on}` : null,
      body || null,
      ...parts,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, MAX_TEXT);

    const ai = readable
      ? await summarizeNotice(composed)
      : {
          summary:
            detail.images.length > 0
              ? `${post.title} — 안내가 그림으로 올라와 있어요. 아래 그림에서 확인해 주세요.`
              : `${post.title} — 안내 내용이 글로 올라와 있지 않아요. '학교 홈페이지에서 보기'로 확인해 주세요.`,
          items: [] as ChecklistItemDraft[],
        };
    const update = { body_text: composed, attachments, ai_summary: ai.summary || post.title, ai_items: ai.items, status: "ready", error: null };
    const { error } = await db.from("school_posts").update(update).eq("id", post.id);
    if (error) throw new Error(error.message);
    return { ...post, ...update, status: "ready" };
  } catch (err) {
    // 학교 서버·AI가 잠시 안 될 수 있다 — 'listed'로 두고 다음 동기화 때 다시 해 본다.
    await db
      .from("school_posts")
      .update({ error: err instanceof Error ? err.message.slice(0, 300) : "처리 실패" })
      .eq("id", post.id);
    return null;
  }
}

async function deliver(db: Db, householdId: string, post: PostRow): Promise<boolean> {
  const { data: notice, error } = await db
    .from("notices")
    .insert({
      household_id: householdId,
      raw_text: post.body_text ?? post.title,
      ai_summary: post.ai_summary ?? post.title,
      created_by: null,
      source_post_id: post.id,
    })
    .select("id")
    .single();
  if (error || !notice) return false; // 23505 = 다른 가족이 동시에 받아 이미 있음
  const items = (post.ai_items ?? []).map((item) => ({
    notice_id: notice.id,
    category: item.category,
    title: item.title,
    detail: item.detail,
    due_date: item.dueDate,
    ai_confidence: item.confidence,
    is_edited_by_user: false,
  }));
  if (items.length > 0) {
    const { error: itemsError } = await db.from("checklist_items").insert(items);
    if (itemsError) {
      // 항목 없는 알림만 덩그러니 남지 않게 되돌린다 — 다음 동기화 때 다시 넣는다.
      await db.from("notices").delete().eq("id", notice.id);
      return false;
    }
  }
  return true;
}

/** 게시판을 (필요하면) 찾고, 30분이 지난 게시판 목록을 새로 읽는다. */
async function refreshSchool(db: Db, school: SchoolRow): Promise<{ boards: BoardRow[]; usable: BoardRow[] }> {
  let boards = await ensureBoards(db, school);
  const usableOf = (list: BoardRow[]) =>
    list.filter((b) => (SUPPORTED_FAMILIES as string[]).includes(b.family) && (b.kind !== "weekly" || forMyGrade(b.label, school.grade)));
  const now = Date.now();
  const due = usableOf(boards).filter((b) => !b.last_checked_at || now - Date.parse(b.last_checked_at) > LIST_REFRESH_MS);
  await Promise.all(due.map((b) => refreshList(db, b)));
  if (due.length > 0) boards = await loadBoards(db, school.school_code);
  return { boards, usable: usableOf(boards) };
}

/** 이 가정이 아직 받지 않은 글(기간·학년 조건에 맞는 것). 오래된 글부터 — 목록에서 새 글이 맨 위에 오게. */
async function undeliveredPosts(db: Db, school: SchoolRow, usable: BoardRow[], since: string): Promise<PostRow[]> {
  if (usable.length === 0) return [];
  const { data: postData } = await db
    .from("school_posts")
    .select("id, board_id, post_key, title, posted_on, url, body_text, ai_summary, ai_items, status")
    .in(
      "board_id",
      usable.map((b) => b.id),
    )
    .gte("posted_on", since)
    .order("posted_on", { ascending: true })
    .limit(80);
  const posts = (postData ?? []) as PostRow[];
  if (posts.length === 0) return [];
  const { data: existing } = await db
    .from("notices")
    .select("source_post_id")
    .eq("household_id", school.household_id)
    .in(
      "source_post_id",
      posts.map((p) => p.id),
    );
  const have = new Set((existing ?? []).map((n) => n.source_post_id as string));
  // 같은 글이 학교 게시판 두 곳(예: 가정통신문 + 교육청 소식)에 함께 올라오기도 한다 — 제목·날짜가 같으면 한 번만.
  const keyOf = (p: PostRow) => `${p.title.replace(/\s+/g, "")}|${p.posted_on ?? ""}`;
  const seen = new Set(posts.filter((p) => have.has(p.id)).map(keyOf));
  const out: PostRow[] = [];
  for (const p of posts) {
    if (have.has(p.id)) continue;
    const k = keyOf(p);
    if (seen.has(k)) continue;
    seen.add(k);
    if (forMyGrade(p.title, school.grade)) out.push(p);
  }
  return out;
}

const PARALLEL = 3; // 학교 서버·AI에 한꺼번에 너무 많이 보내지 않을 만큼만 동시에
const MAX_PREPARE_PER_CALL = 6;

/** 준비 안 된 글을 3개씩 동시에 준비하고(상세·첨부·AI 요약), deliverTo가 있으면 그 가정에 넣는다. */
async function prepareAndDeliver(
  db: Db,
  school: SchoolRow,
  boards: BoardRow[],
  posts: PostRow[],
  deadline: number,
  deliverTo: string | null,
): Promise<number> {
  const boardById = new Map(boards.map((b) => [b.id, b]));
  let delivered = 0;
  let tried = 0;
  for (let i = 0; i < posts.length && tried < MAX_PREPARE_PER_CALL && Date.now() < deadline; i += PARALLEL) {
    const batch = posts.slice(i, i + PARALLEL);
    tried += batch.length;
    const results = await Promise.all(
      batch.map(async (post) => {
        const board = boardById.get(post.board_id);
        if (!board) return false;
        const ready = await ensureReady(db, school, board, post);
        return !!ready && !!deliverTo && (await deliver(db, deliverTo, ready));
      }),
    );
    delivered += results.filter(Boolean).length;
  }
  return delivered;
}

function windowStart(fromIso: string): string {
  return new Date(Date.parse(fromIso) - FIRST_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
}

export async function syncHousehold(db: Db, householdId: string, deadline: number): Promise<SchoolStatus> {
  const { school, needsMigration } = await loadHouseholdSchool(db, householdId);
  if (needsMigration) return { linked: false, needsMigration: true, boards: [], supported: false, lastCheckedAt: null };
  if (!school) return { linked: false, boards: [], supported: false, lastCheckedAt: null };

  const { boards, usable } = await refreshSchool(db, school);
  const todo = await undeliveredPosts(db, school, usable, windowStart(school.linked_at));

  // 1) 이미 준비된 글(매일 미리 모으기·같은 학교 다른 가정 덕분)은 바로 넣는다 — 빠르다.
  let delivered = 0;
  for (const post of todo.filter((p) => p.status === "ready")) {
    if (await deliver(db, householdId, post)) delivered += 1;
  }
  // 2) 아직 준비 안 된 글은 시간이 허락하는 만큼 3개씩 동시에.
  delivered += await prepareAndDeliver(db, school, boards, todo.filter((p) => p.status !== "ready"), deadline, householdId);

  return { ...schoolStatus(school, boards), delivered, pending: Math.max(0, todo.length - delivered) };
}

/**
 * 매일 미리 모으기(Vercel Cron): 앱을 열지 않아도 연결된 학교마다 새 글을 읽고 요약해 두고, 각 가정 알림으로 넣는다.
 * 학교 게시판 글은 시간이 지나면 지워지기도 해서(REPORT §5.2) 늦게 모으면 영영 놓친다.
 */
export async function prepareAllSchools(db: Db, deadline: number): Promise<{ schools: number; delivered: number }> {
  const { data, error } = await db.from("household_schools").select("*");
  if (error || !data) return { schools: 0, delivered: 0 };
  const bySchool = new Map<string, SchoolRow[]>();
  for (const row of data as SchoolRow[]) bySchool.set(row.school_code, [...(bySchool.get(row.school_code) ?? []), row]);

  let delivered = 0;
  let schools = 0;
  for (const group of bySchool.values()) {
    if (Date.now() > deadline) break;
    schools += 1;
    const { boards, usable } = await refreshSchool(db, group[0]);
    const since = windowStart(new Date().toISOString());
    for (const hs of group) {
      if (Date.now() > deadline) break;
      const todo = await undeliveredPosts(db, hs, usable, since > windowStart(hs.linked_at) ? since : windowStart(hs.linked_at));
      for (const post of todo.filter((p) => p.status === "ready")) {
        if (await deliver(db, hs.household_id, post)) delivered += 1;
      }
      delivered += await prepareAndDeliver(db, hs, boards, todo.filter((p) => p.status !== "ready"), deadline, hs.household_id);
    }
  }
  return { schools, delivered };
}

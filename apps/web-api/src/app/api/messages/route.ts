import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { isMissingMigrationError, memberLabel, MIGRATION_REQUIRED_MESSAGE } from "@/lib/household/members";

type MessageKind = "message" | "share" | "sticker";
const KINDS: MessageKind[] = ["message", "share", "sticker"];

function migrationRequired() {
  return NextResponse.json({ error: MIGRATION_REQUIRED_MESSAGE, needsMigration: true }, { status: 503 });
}

/**
 * 가족 이야기: 아이와 양육자가 알림장·프로그램 결과를 두고 대화하고, 양육자가 아이를 위해
 * 한 일을 공유하는 곳. 실시간이 아니라 열 때·당겨서 새로고침할 때 가져온다(PRD 하한선과 같은 Pull 방식).
 * `?noticeId=`를 주면 그 알림에 달린 이야기만 준다.
 */
export async function GET(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const noticeId = req.nextUrl.searchParams.get("noticeId");
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("family_messages")
    .select("id, notice_id, user_id, kind, body, created_at")
    .eq("household_id", resolved.householdId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (noticeId) query = query.eq("notice_id", noticeId);

  const { data: rows, error } = await query;
  if (error) {
    if (isMissingMigrationError(error)) return migrationRequired();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: members } = await supabase
    .from("users")
    .select("id, role, display_name")
    .eq("household_id", resolved.householdId);
  const memberById = new Map((members ?? []).map((m) => [m.id as string, m]));

  const noticeIds = [...new Set((rows ?? []).map((r) => r.notice_id).filter(Boolean))] as string[];
  const { data: notices } = noticeIds.length
    ? await supabase.from("notices").select("id, ai_summary").in("id", noticeIds)
    : { data: [] };
  const summaryById = new Map((notices ?? []).map((n) => [n.id as string, n.ai_summary as string | null]));

  const messages = (rows ?? [])
    .map((r) => {
      const author = memberById.get(r.user_id as string);
      return {
        id: r.id,
        noticeId: r.notice_id,
        noticeSummary: r.notice_id ? summaryById.get(r.notice_id as string) ?? null : null,
        userId: r.user_id,
        authorName: memberLabel(author?.role as string | undefined, author?.display_name as string | null),
        authorRole: (author?.role as string | undefined) ?? null,
        kind: r.kind,
        body: r.body,
        createdAt: r.created_at,
      };
    })
    .reverse();

  return NextResponse.json({ messages });
}

type PostBody = { body?: string; kind?: MessageKind; noticeId?: string | null };

export async function POST(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  let payload: PostBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  const body = payload.body?.trim() ?? "";
  if (!body || body.length > 500) {
    return NextResponse.json({ error: "내용은 1~500자로 써 주세요." }, { status: 400 });
  }
  const kind: MessageKind = payload.kind ?? "message";
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "알 수 없는 종류예요." }, { status: 400 });
  }
  // "아이를 위해 한 일 공유"는 양육자가 아이에게 보여주는 기능이다.
  if (kind === "share" && resolved.role === "child") {
    return NextResponse.json({ error: "아이 계정에서는 공유 글을 쓸 수 없어요." }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  const noticeId = payload.noticeId ?? null;
  if (noticeId) {
    const { data: notice } = await supabase
      .from("notices")
      .select("id")
      .eq("id", noticeId)
      .eq("household_id", resolved.householdId)
      .maybeSingle();
    if (!notice) {
      return NextResponse.json({ error: "이 가족의 알림이 아니에요." }, { status: 404 });
    }
  }

  const { data: inserted, error } = await supabase
    .from("family_messages")
    .insert({ household_id: resolved.householdId, notice_id: noticeId, user_id: resolved.userId, kind, body })
    .select("id, created_at")
    .single();
  if (error) {
    if (isMissingMigrationError(error)) return migrationRequired();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id, createdAt: inserted.created_at });
}

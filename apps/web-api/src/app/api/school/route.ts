import { after, NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { forbidChild } from "@/lib/household/members";
import { findSchool, OFFICES } from "@/lib/school/neis";
import { ensureBoards, loadHouseholdSchool, schoolStatus, syncHousehold, SCHOOL_MIGRATION_MESSAGE, type SchoolRow } from "@/lib/school/sync";

export const maxDuration = 60;

async function resolve(req: NextRequest) {
  try {
    return await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

/** 우리 가정이 연결한 학교와 찾은 게시판(지원 여부·마지막 확인 시각). */
export async function GET(req: NextRequest) {
  const resolved = await resolve(req);
  if (resolved instanceof NextResponse) return resolved;
  const db = getSupabaseServerClient();
  const { school, needsMigration } = await loadHouseholdSchool(db, resolved.householdId);
  if (needsMigration) return NextResponse.json({ linked: false, needsMigration: true, boards: [], supported: false, lastCheckedAt: null });
  if (!school) return NextResponse.json(schoolStatus(null, []));
  const { data: boards } = await db.from("school_boards").select("*").eq("school_code", school.school_code).order("created_at");
  return NextResponse.json(schoolStatus(school, (boards ?? []) as Parameters<typeof schoolStatus>[1]));
}

type PutBody = { atptCode?: string; schoolCode?: string; grade?: number | null };

/**
 * 학교 연결(바꾸기). 학교 정보·홈페이지 주소는 앱이 보낸 값을 쓰지 않고 NEIS에서 다시 받는다 —
 * 서버가 아무 주소나 대신 열어 주는 통로가 되지 않게 하기 위해서다.
 */
export async function PUT(req: NextRequest) {
  const resolved = await resolve(req);
  if (resolved instanceof NextResponse) return resolved;
  const childBlock = forbidChild(resolved);
  if (childBlock) return childBlock;

  let body: PutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }
  const office = OFFICES.find((o) => o.code === body.atptCode);
  if (!office || typeof body.schoolCode !== "string" || !/^\d{7}$/.test(body.schoolCode)) {
    return NextResponse.json({ error: "교육청과 학교를 다시 골라 주세요." }, { status: 400 });
  }
  const grade = typeof body.grade === "number" && body.grade >= 1 && body.grade <= 6 ? Math.floor(body.grade) : null;

  let hit;
  try {
    hit = await findSchool(office.code, body.schoolCode);
  } catch {
    return NextResponse.json({ error: "학교 정보를 확인하지 못했어요. 잠시 뒤 다시 해 주세요." }, { status: 502 });
  }
  if (!hit) return NextResponse.json({ error: "학교를 찾지 못했어요." }, { status: 404 });

  const db = getSupabaseServerClient();
  const { school: before, needsMigration } = await loadHouseholdSchool(db, resolved.householdId);
  if (needsMigration) return NextResponse.json({ error: SCHOOL_MIGRATION_MESSAGE, needsMigration: true }, { status: 503 });

  const sameSchool = before?.school_code === hit.schoolCode;
  const row = {
    household_id: resolved.householdId,
    atpt_code: office.code,
    atpt_name: hit.atptName || office.name,
    school_code: hit.schoolCode,
    school_name: hit.name,
    homepage: hit.homepage,
    grade,
    // 학교를 바꾸면 "최근 2주"를 새로 센다. 같은 학교에서 학년만 바꾸면 그대로 둔다.
    ...(sameSchool ? {} : { linked_at: new Date().toISOString(), boards_checked_at: null }),
  };
  const { data: saved, error } = await db.from("household_schools").upsert(row, { onConflict: "household_id" }).select("*").single();
  if (error || !saved) return NextResponse.json({ error: error?.message ?? "저장하지 못했어요." }, { status: 500 });

  const boards = await ensureBoards(db, saved as SchoolRow);
  // 응답을 보낸 뒤에도 바로 글을 읽고 정리하기 시작한다 — 앱이 "오늘 할 일"로 돌아왔을 때 이미 몇 건은 준비돼 있게.
  after(async () => {
    await syncHousehold(db, resolved.householdId, Date.now() + 45_000).catch(() => {});
  });
  return NextResponse.json(schoolStatus(saved as SchoolRow, boards));
}

/** 학교 연결 끊기. 이미 받아 둔 알림은 그대로 남는다. */
export async function DELETE(req: NextRequest) {
  const resolved = await resolve(req);
  if (resolved instanceof NextResponse) return resolved;
  const childBlock = forbidChild(resolved);
  if (childBlock) return childBlock;
  const db = getSupabaseServerClient();
  const { error } = await db.from("household_schools").delete().eq("household_id", resolved.householdId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(schoolStatus(null, []));
}

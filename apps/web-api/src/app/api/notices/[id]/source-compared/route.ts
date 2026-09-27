import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";

/**
 * FR-1: "시스템은 각 추출 항목에 대해 사용자가 원문과 대조했는지... 여부를 구분해
 * 인지할 수 있어야 한다." `notice_events.event_type`에 `source_compared`가 스키마에는
 * 있었지만(0001_init.sql) 실제로 기록하는 코드가 없었다 — "원문 보기" 토글은 화면
 * 동작으로만 존재하고 서버는 그 사실을 몰랐음. 이 엔드포인트가 그 간극을 메운다.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let resolved;
  try {
    resolved = await resolveUser(req, null);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { userId } = resolved;
  const supabase = getSupabaseServerClient();

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select("id, household_id")
    .eq("id", id)
    .single();
  if (noticeError) {
    return NextResponse.json({ error: noticeError.message }, { status: 404 });
  }
  if (notice.household_id !== resolved.householdId) {
    return NextResponse.json({ error: "이 알림에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const { error: insertError } = await supabase.from("notice_events").insert({
    notice_id: id,
    user_id: userId,
    event_type: "source_compared",
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

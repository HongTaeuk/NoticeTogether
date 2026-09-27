import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

type OpenBody = {
  as?: DevRole;
  source?: "banner_tap" | "app_open"; // 배너 미리보기 자체는 이 엔드포인트를 절대 호출하지 않는다(PRD 5단계).
};

/**
 * PRD 5단계 / 02_customer_profile.md 성공 이벤트 모델 전용 엔드포인트.
 * 배너 미리보기(알림 목록에서 슬쩍 보이는 텍스트)는 절대 이 API를 호출하지 않는다 —
 * 오직 사용자가 실제로 앱에 "들어와서" 알림을 펼쳐봤을 때만 호출된다.
 * 그래야 notice_opened가 "진짜 열람"만 의미하게 된다.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: OpenBody = {};
  try {
    body = await req.json();
  } catch {
    // 본문 없이 호출해도 기본값(primary)으로 처리
  }

  let resolved;
  try {
    resolved = await resolveUser(req, body.as);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { userId, role } = resolved;
  const supabase = getSupabaseServerClient();

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select("id, created_by, household_id")
    .eq("id", id)
    .single();
  if (noticeError) {
    return NextResponse.json({ error: noticeError.message }, { status: 404 });
  }
  if (notice.household_id !== resolved.householdId) {
    return NextResponse.json({ error: "이 알림에 접근할 권한이 없습니다." }, { status: 403 });
  }

  // 이미 이 알림에 notice_opened 이벤트가 있고, 지금 여는 사람이 그 최초 열람자와
  // 다른 사람이면 -> partner_view_confirmed(상대방이 확인함). 그 외에는 notice_opened.
  const { data: existingOpens } = await supabase
    .from("notice_events")
    .select("user_id")
    .eq("notice_id", id)
    .eq("event_type", "notice_opened")
    .limit(1);

  const firstOpener = existingOpens?.[0]?.user_id as string | undefined;
  const eventType =
    firstOpener && firstOpener !== userId ? "partner_view_confirmed" : "notice_opened";

  const { error: insertError } = await supabase.from("notice_events").insert({
    notice_id: id,
    user_id: userId,
    event_type: eventType,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ eventType, role });
}

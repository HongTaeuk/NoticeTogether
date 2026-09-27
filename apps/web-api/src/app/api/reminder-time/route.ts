import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

const DEFAULT_HOUR = 21; // PRD 7단계 기본값("예: 매일 21시")
const MIN_SAMPLES = 3; // 이 정도는 쌓여야 "그 사람의 패턴"이라고 믿을 만하다고 봄

/**
 * PRD 8단계: 알림 타이밍 개인화.
 *
 * 실제 화면 잠금 상태의 스크린타임을 읽는 표준 API는 없고(특히 배우자 등
 * 타인의 스크린타임을 앱이 읽는 것 자체가 불가능하다고 이미 결론 내림 —
 * docs/06_prd.md Part 9 위험 요소), 대신 이 앱을 "그 사람이 실제로 연 시각"
 * (notice_events의 notice_opened/partner_view_confirmed) 로그를 근사치로 쓴다.
 *
 * 데이터가 부족하면(MIN_SAMPLES 미만) 억지로 개인화하지 않고 기본값(21시)으로
 * 되돌아간다 — PRD가 스스로 경고한 "근거 부족한 개인화" 위험을 피하기 위함.
 */
export async function GET(req: NextRequest) {
  const as = (req.nextUrl.searchParams.get("as") ?? "primary") as DevRole;
  const { userIds } = await ensureDevHousehold();
  const userId = userIds[as];

  const supabase = getSupabaseServerClient();
  const { data: events, error } = await supabase
    .from("notice_events")
    .select("created_at")
    .eq("user_id", userId)
    .in("event_type", ["notice_opened", "partner_view_confirmed"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!events || events.length < MIN_SAMPLES) {
    return NextResponse.json({ hour: DEFAULT_HOUR, personalized: false, sampleSize: events?.length ?? 0 });
  }

  const hours = events.map((e) => new Date(e.created_at as string).getHours());
  const mostCommonHour = mode(hours);

  return NextResponse.json({ hour: mostCommonHour, personalized: true, sampleSize: events.length });
}

function mode(nums: number[]): number {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = nums[0];
  let bestCount = 0;
  for (const [n, c] of counts) {
    if (c > bestCount) {
      best = n;
      bestCount = c;
    }
  }
  return best;
}

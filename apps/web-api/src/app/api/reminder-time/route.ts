import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

const DEFAULT_HOUR = 21; // PRD 7단계 기본값("예: 매일 21시")
const DEFAULT_DAYS_BEFORE = [1]; // 기본값: 기한 하루 전 1회
const MIN_SAMPLES = 3; // 이 정도는 쌓여야 "그 사람의 패턴"이라고 믿을 만하다고 봄

// FR-4: "확인 빈도가 낮으면 주기를 늘리고, 높으면 줄인다"의 빈도 경계값(주당 열람 횟수).
const HIGH_ENGAGEMENT_PER_WEEK = 5;
const LOW_ENGAGEMENT_PER_WEEK = 2;

/**
 * PRD 8단계 / FR-4: 알림 타이밍 + 빈도(주기) 개인화.
 *
 * 실제 화면 잠금 상태의 스크린타임을 읽는 표준 API는 없고(특히 배우자 등
 * 타인의 스크린타임을 앱이 읽는 것 자체가 불가능하다고 이미 결론 내림 —
 * docs/06_prd.md Part 9 위험 요소), 대신 이 앱을 "그 사람이 실제로 연 시각/빈도"
 * (notice_events의 notice_opened/partner_view_confirmed) 로그를 근사치로 쓴다.
 *
 * FR-4는 시각(hour)뿐 아니라 "주기"도 개인화하라고 명시한다 — 확인 빈도가 낮은
 * 사람은 놓칠 위험이 크므로 기한 전 여러 날에 걸쳐 반복 알림을, 확인 빈도가 높은
 * 사람은 피로를 줄이기 위해 기한 하루 전 1회만 보낸다.
 *
 * 데이터가 부족하면(MIN_SAMPLES 미만) 억지로 개인화하지 않고 기본값으로
 * 되돌아간다 — PRD가 스스로 경고한 "근거 부족한 개인화" 위험을 피하기 위함.
 */
export async function GET(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req, req.nextUrl.searchParams.get("as") as DevRole | null);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { userId } = resolved;

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
    return NextResponse.json({
      hour: DEFAULT_HOUR,
      daysBeforeDue: DEFAULT_DAYS_BEFORE,
      personalized: false,
      sampleSize: events?.length ?? 0,
    });
  }

  const hours = events.map((e) => new Date(e.created_at as string).getHours());
  const mostCommonHour = mode(hours);
  const daysBeforeDue = engagementToDaysBeforeDue(events.map((e) => e.created_at as string));

  return NextResponse.json({
    hour: mostCommonHour,
    daysBeforeDue,
    personalized: true,
    sampleSize: events.length,
  });
}

/** 열람 이벤트의 "주당 빈도"를 근사해서 반복 알림 스케줄(기한 며칠 전부터)로 바꾼다. */
function engagementToDaysBeforeDue(timestamps: string[]): number[] {
  const sorted = timestamps.map((t) => new Date(t).getTime()).sort((a, b) => a - b);
  const spanMs = sorted[sorted.length - 1] - sorted[0];
  const spanWeeks = Math.max(spanMs / (1000 * 60 * 60 * 24 * 7), 1 / 7); // 최소 1일치로 취급
  const perWeek = sorted.length / spanWeeks;

  if (perWeek >= HIGH_ENGAGEMENT_PER_WEEK) return [1];
  if (perWeek < LOW_ENGAGEMENT_PER_WEEK) return [3, 2, 1];
  return [2, 1];
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

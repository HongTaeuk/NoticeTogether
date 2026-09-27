import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

type RefreshBody = { refreshToken?: string };

/**
 * Supabase access token은 기본 1시간이면 만료된다. 모바일은 Supabase에 직접 붙지
 * 않으므로(REST만 거치는 아키텍처), 토큰 갱신도 이 엔드포인트를 거쳐야 한다.
 * 지금까지 모바일이 refreshToken을 저장만 하고 실제로 쓰는 곳이 없어서, 로그인 후
 * 1시간이 지나면 401을 받고 그대로 로그아웃되는 문제가 있었다 — 이 엔드포인트와
 * `apiClient.ts`의 자동 재시도가 그 문제를 고친다.
 */
export async function POST(req: NextRequest) {
  let body: RefreshBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }
  if (!body.refreshToken) {
    return NextResponse.json({ error: "refreshToken이 필요합니다." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: body.refreshToken });
  if (error || !data.session) {
    return NextResponse.json({ error: "세션 갱신에 실패했습니다. 다시 로그인해주세요." }, { status: 401 });
  }

  return NextResponse.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
}

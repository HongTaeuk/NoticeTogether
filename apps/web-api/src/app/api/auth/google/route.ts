import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { createHouseholdForUser } from "@/lib/household/createHouseholdForUser";

type GoogleBody = { idToken?: string; displayName?: string };

/**
 * Google 로그인/가입. 모바일에서 네이티브 Google Sign-In으로 받은 ID 토큰을 그대로 넘기면
 * Supabase가 그 신원으로 계정을 찾거나 새로 만든다.
 *
 * 주의(알려진 제약): 이 로그인은 "새 계정으로 전환"이지 "지금 쓰던 익명 계정을 그 자리에서
 * 승격"이 아니다 — Google 신원으로 식별되는 auth.users 행은 기존 익명 계정과 다른
 * user id를 가지므로, 익명으로 쌓아둔 가정/알림 데이터는 이어지지 않는다(반면
 * `/api/auth/upgrade`의 이메일/비밀번호 승격은 같은 user id를 유지해 데이터가 그대로
 * 이어진다). 익명 데이터를 유지한 채 Google 신원을 "연결"하려면 모바일이 Supabase
 * 세션을 직접 들고 `linkIdentity()`를 호출해야 하는데, 이는 "모바일은 REST만 거친다"는
 * 이 프로젝트의 아키텍처와 상충해 채택하지 않았다(`docs/05_tech_review.md` 3-6 갱신 노트 참고).
 */
export async function POST(req: NextRequest) {
  let body: GoogleBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }
  if (!body.idToken) {
    return NextResponse.json({ error: "idToken이 필요합니다." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: body.idToken,
  });
  if (signInError || !signInData.user || !signInData.session) {
    return NextResponse.json(
      { error: signInError?.message ?? "구글 로그인에 실패했습니다." },
      { status: 401 },
    );
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id, role, display_name, household_id, households(invite_code)")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (existingUser?.household_id) {
    const household = existingUser.households as unknown as { invite_code: string } | null;
    return NextResponse.json({
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      user: { id: existingUser.id, role: existingUser.role, displayName: existingUser.display_name },
      household: { id: existingUser.household_id, inviteCode: household?.invite_code ?? null },
    });
  }

  const displayName = body.displayName?.trim() || signInData.user.user_metadata?.full_name || null;
  let householdId: string;
  let inviteCode: string;
  try {
    ({ householdId, inviteCode } = await createHouseholdForUser(signInData.user.id, displayName));
  } catch (err) {
    const message = err instanceof Error ? err.message : "가정 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: { id: signInData.user.id, role: "primary" as const, displayName },
    household: { id: householdId, inviteCode },
  });
}

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { createHouseholdForUser } from "@/lib/household/createHouseholdForUser";

/**
 * 회원가입 없이 앱을 바로 쓰기 위한 기본 진입점. 기기에 세션이 없으면 앱이 이걸
 * 자동으로 호출해서(사용자가 아무것도 입력하지 않아도) Supabase 익명 계정 + 혼자만의
 * 가정을 만든다. 나중에 `/api/auth/upgrade`(이메일/구글)로 같은 계정을 그대로
 * "정식 계정"으로 승격할 수 있다 — user id가 바뀌지 않으므로 가정/알림/체크 데이터가
 * 그대로 유지된다. 가족(다른 양육자·아이)과 연결하는 것도 가입 없이 초대 코드(`/api/auth/join`)로 된다.
 */
export async function POST() {
  const supabase = getSupabaseServerClient();

  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
  if (anonError || !anonData.user || !anonData.session) {
    return NextResponse.json(
      { error: anonError?.message ?? "익명 계정을 만들지 못했습니다." },
      { status: 500 },
    );
  }

  let householdId: string;
  let inviteCode: string;
  try {
    ({ householdId, inviteCode } = await createHouseholdForUser(anonData.user.id, null));
  } catch (err) {
    await supabase.auth.admin.deleteUser(anonData.user.id).catch(() => {});
    const message = err instanceof Error ? err.message : "가정 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    accessToken: anonData.session.access_token,
    refreshToken: anonData.session.refresh_token,
    user: { id: anonData.user.id, role: "primary" as const, displayName: null },
    household: { id: householdId, inviteCode },
    isAnonymous: true,
  });
}

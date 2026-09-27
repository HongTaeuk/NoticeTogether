import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { createHouseholdForUser } from "@/lib/household/createHouseholdForUser";

type SignupBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

/**
 * 회원가입(선택 사항 — 기본은 익명 사용, `/api/auth/anonymous` 참고). 계정을 만들면
 * 곧바로 혼자만의 가정(household)이 하나 생기고 초대 코드가 발급된다 — 배우자는
 * 나중에 이 코드로 `/api/auth/join`을 호출해 이 가정에 합류한다(정식 연결).
 */
export async function POST(req: NextRequest) {
  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  if (!body.email || !body.password || body.password.length < 8) {
    return NextResponse.json(
      { error: "email과 8자 이상의 password가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "이미 가입된 이메일이거나 계정을 만들 수 없습니다." },
      { status: 409 },
    );
  }

  const displayName = body.displayName?.trim() || null;
  let householdId: string;
  let inviteCode: string;
  try {
    ({ householdId, inviteCode } = await createHouseholdForUser(created.user.id, displayName));
  } catch (err) {
    // 가정 생성이 실패하면 되돌릴 수 없는 "이메일만 등록되고 못 쓰는" 계정이 남는다 —
    // 방금 만든 auth 계정을 롤백해서 사용자가 같은 이메일로 다시 시도할 수 있게 한다.
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => {});
    const message = err instanceof Error ? err.message : "가정 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (signInError || !signInData.session) {
    return NextResponse.json(
      { error: signInError?.message ?? "가입은 됐지만 로그인에 실패했습니다. 다시 로그인해주세요." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: { id: created.user.id, role: "primary" as const, displayName },
    household: { id: householdId, inviteCode },
  });
}

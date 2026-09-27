import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUserFromToken, AuthError } from "@/lib/auth/session";

type UpgradeBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

/**
 * 익명으로 쓰던 계정을 "정식 계정"(이메일+비밀번호)으로 그 자리에서 승격한다.
 * user id를 바꾸지 않고 auth.users 행에 email/password만 채워 넣으므로, 이미 쌓인
 * household/notices/checklist_items 전부 별도 마이그레이션 없이 그대로 유지된다.
 * (배우자 초대·다른 기기 로그인처럼 "동기화"가 필요해질 때만 승격하면 된다.)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: UpgradeBody;
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

  let resolved;
  try {
    resolved = await resolveUserFromToken(authHeader.slice("Bearer ".length));
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const supabase = getSupabaseServerClient();

  const { error: updateError } = await supabase.auth.admin.updateUserById(resolved.userId, {
    email: body.email,
    password: body.password,
    email_confirm: true,
  });
  if (updateError) {
    return NextResponse.json(
      { error: updateError.message.includes("already been registered")
        ? "이미 가입된 이메일입니다."
        : updateError.message },
      { status: 409 },
    );
  }

  const displayName = body.displayName?.trim();
  if (displayName) {
    await supabase.from("users").update({ display_name: displayName }).eq("id", resolved.userId);
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (signInError || !signInData.session) {
    return NextResponse.json(
      { error: "계정 전환은 됐지만 로그인에 실패했습니다. 다시 로그인해주세요." },
      { status: 500 },
    );
  }

  const { data: household } = await supabase
    .from("households")
    .select("invite_code")
    .eq("id", resolved.householdId)
    .maybeSingle();

  return NextResponse.json({
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: { id: resolved.userId, role: resolved.role, displayName: displayName || null },
    household: { id: resolved.householdId, inviteCode: household?.invite_code ?? null },
  });
}

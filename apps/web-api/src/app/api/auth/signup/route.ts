import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/household/inviteCode";

type SignupBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

/**
 * PRD 10단계: 회원가입. 계정을 만들면 곧바로 혼자만의 가정(household)이 하나 생기고
 * 초대 코드가 발급된다 — 배우자는 나중에 이 코드로 `/api/auth/join`을 호출해
 * 이 가정에 합류한다(정식 연결).
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

  let household: { id: string; invite_code: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("households")
      .insert({ invite_code: generateInviteCode() })
      .select("id, invite_code")
      .single();
    if (!error) {
      household = data;
      break;
    }
    if (attempt === 4) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  if (!household) {
    return NextResponse.json({ error: "가정 생성에 실패했습니다." }, { status: 500 });
  }

  const displayName = body.displayName?.trim() || null;
  const { error: userError } = await supabase.from("users").insert({
    id: created.user.id,
    household_id: household.id,
    role: "primary",
    display_name: displayName,
  });
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
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
    household: { id: household.id, inviteCode: household.invite_code },
  });
}

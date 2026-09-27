import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

type LoginBody = { email?: string; password?: string };

export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email과 password가 필요합니다." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (signInError || !signInData.session || !signInData.user) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, role, display_name, household_id, households(invite_code)")
    .eq("id", signInData.user.id)
    .maybeSingle();
  if (userError || !userRow || !userRow.household_id) {
    return NextResponse.json({ error: "가정 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const household = userRow.households as unknown as { invite_code: string } | null;

  return NextResponse.json({
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    user: { id: userRow.id, role: userRow.role, displayName: userRow.display_name },
    household: { id: userRow.household_id, inviteCode: household?.invite_code ?? null },
  });
}

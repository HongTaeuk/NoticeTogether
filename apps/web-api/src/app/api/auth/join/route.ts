import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUserFromToken, AuthError } from "@/lib/auth/session";

type JoinBody = { inviteCode?: string };

/**
 * PRD 10단계 완료 기준: "초대 코드를 입력하면, 임시로 나눠 테스트하던 두 계정이
 * 하나의 가정으로 정식 연결된다." 회원가입 시 각자 혼자만의 가정으로 시작하므로,
 * 배우자의 초대 코드를 입력하면 내 계정을 그 가정으로 옮긴다.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let resolved;
  try {
    resolved = await resolveUserFromToken(authHeader.slice("Bearer ".length));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let body: JoinBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }
  const code = body.inviteCode?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "inviteCode가 필요합니다." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: targetHousehold, error: householdError } = await supabase
    .from("households")
    .select("id, invite_code")
    .eq("invite_code", code)
    .maybeSingle();
  if (householdError) {
    return NextResponse.json({ error: householdError.message }, { status: 500 });
  }
  if (!targetHousehold) {
    return NextResponse.json({ error: "이 코드는 사용할 수 없어요. 코드를 다시 확인해 주세요." }, { status: 404 });
  }
  if (targetHousehold.id === resolved.householdId) {
    return NextResponse.json({ error: "이미 이 가정에 속해 있습니다." }, { status: 400 });
  }

  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id, role")
    .eq("household_id", targetHousehold.id);
  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }
  if ((members?.length ?? 0) >= 2) {
    return NextResponse.json(
      { error: "이 가정에는 이미 보호자 2명이 모두 연결되어 있습니다." },
      { status: 409 },
    );
  }

  const takenRoles = new Set((members ?? []).map((m) => m.role));
  const newRole = takenRoles.has("primary") ? "secondary" : "primary";

  const { error: updateError } = await supabase
    .from("users")
    .update({ household_id: targetHousehold.id, role: newRole })
    .eq("id", resolved.userId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    household: { id: targetHousehold.id, inviteCode: targetHousehold.invite_code },
    role: newRole,
  });
}

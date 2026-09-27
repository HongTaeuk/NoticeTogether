import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUserFromToken, AuthError } from "@/lib/auth/session";

// 로그인 후 앱이 현재 가정 상태(초대 코드, 배우자 연결 여부)를 알기 위해 부르는 엔드포인트.
// PRD 분기 5(배우자가 아직 초대되지 않은 상태)를 화면에서 구분하려면 members 길이가 필요하다.
export async function GET(req: NextRequest) {
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

  const supabase = getSupabaseServerClient();

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, invite_code")
    .eq("id", resolved.householdId)
    .single();
  if (householdError) {
    return NextResponse.json({ error: householdError.message }, { status: 500 });
  }

  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id, role, display_name")
    .eq("household_id", resolved.householdId);
  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  return NextResponse.json({
    user: { id: resolved.userId, role: resolved.role },
    household: { id: household.id, inviteCode: household.invite_code },
    members: members ?? [],
  });
}

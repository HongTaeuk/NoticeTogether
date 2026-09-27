import { getSupabaseServerClient } from "@/lib/supabase/client";
import { generateInviteCode } from "./inviteCode";

/**
 * 신규 사용자(익명/이메일가입/구글 공통) 전용으로 혼자만의 가정(household)을 만들고
 * users 행을 연결한다. signup/anonymous/google 세 경로가 동일한 로직을 쓰므로 공용화했다.
 */
export async function createHouseholdForUser(
  userId: string,
  displayName: string | null,
): Promise<{ householdId: string; inviteCode: string }> {
  const supabase = getSupabaseServerClient();

  let household: { id: string; invite_code: string } | null = null;
  let lastError: { message: string } | null = null;
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
    lastError = error;
  }
  if (!household) {
    throw new Error(lastError?.message ?? "가정 생성에 실패했습니다.");
  }

  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    household_id: household.id,
    role: "primary",
    display_name: displayName,
  });
  if (userError) {
    // 가정은 만들어졌지만 users 연결이 실패하면 이 가정은 고아 상태가 된다 — 굳이 지우지
    // 않아도 이후 주인 없는 households row 하나로 남을 뿐 다른 데이터에 영향은 없다.
    throw new Error(userError.message);
  }

  return { householdId: household.id, inviteCode: household.invite_code };
}

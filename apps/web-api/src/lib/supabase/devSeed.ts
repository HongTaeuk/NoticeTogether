import { getSupabaseServerClient } from "./client";

/**
 * PRD 10단계 빌드 순서(docs/06_prd.md Part 8)상 실제 가입/로그인/초대코드 연결은
 * 의도적으로 맨 마지막 단계다. 그 전까지는 "임시 계정 2개로 상태 동기화 검증"을
 * 위해 고정된 개발용 가구(household)와 보호자 2명(primary/secondary)을 재사용한다.
 *
 * users.id는 auth.users(id)를 FK로 참조하므로, 실제 Supabase Auth 사용자를
 * (없으면) 만들어야 한다. service_role 클라이언트의 admin API를 사용한다.
 */

const DEV_PRIMARY_EMAIL = "dev-primary@noticetogether.local";
const DEV_SECONDARY_EMAIL = "dev-secondary@noticetogether.local";
const DEV_PASSWORD = "dev-temp-password-not-for-real-use";

export type DevRole = "primary" | "secondary";

export type DevHousehold = {
  householdId: string;
  userIds: Record<DevRole, string>;
};

let cached: DevHousehold | null = null;

export async function ensureDevHousehold(): Promise<DevHousehold> {
  if (cached) return cached;

  const supabase = getSupabaseServerClient();

  const primaryId = await ensureAuthUser(DEV_PRIMARY_EMAIL);
  const secondaryId = await ensureAuthUser(DEV_SECONDARY_EMAIL);

  const { data: existingUser } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", primaryId)
    .maybeSingle();

  let householdId = existingUser?.household_id as string | undefined;

  if (!householdId) {
    const { data: household, error: householdError } = await supabase
      .from("households")
      .insert({ name: "개발용 테스트 가구" })
      .select("id")
      .single();
    if (householdError) throw householdError;
    householdId = household.id;

    const { error: usersError } = await supabase.from("users").upsert([
      { id: primaryId, household_id: householdId, role: "primary", display_name: "테스트 보호자 1" },
      { id: secondaryId, household_id: householdId, role: "secondary", display_name: "테스트 보호자 2" },
    ]);
    if (usersError) throw usersError;
  }

  cached = { householdId, userIds: { primary: primaryId, secondary: secondaryId } };
  return cached;
}

async function ensureAuthUser(email: string): Promise<string> {
  const supabase = getSupabaseServerClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  if (!createError && created.user) {
    return created.user.id;
  }

  // 이미 존재하면 목록에서 찾는다 (admin API에 getUserByEmail이 없어 페이지네이션으로 탐색).
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const found = list.users.find((u) => u.email === email);
  if (!found) {
    throw createError ?? new Error(`개발용 계정을 찾거나 만들 수 없습니다: ${email}`);
  }
  return found.id;
}

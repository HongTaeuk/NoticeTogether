import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { ensureDevHousehold, type DevRole } from "@/lib/supabase/devSeed";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export type ResolvedUser = {
  userId: string;
  householdId: string;
  role: DevRole;
};

/**
 * PRD 10단계: 실제 로그인(Authorization: Bearer <access_token>)이 있으면 그것으로
 * 사용자를 식별한다. 없으면 1~9단계에서 써온 개발용 임시 계정(`?as=primary|secondary`)으로
 * 계속 동작한다 — 기존에 검증된 흐름을 깨지 않기 위한 하위호환이다.
 */
export async function resolveUser(
  req: NextRequest,
  fallbackAs?: DevRole | null,
): Promise<ResolvedUser> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return resolveUserFromToken(authHeader.slice("Bearer ".length));
  }

  const { householdId, userIds } = await ensureDevHousehold();
  const role = fallbackAs ?? "primary";
  return { userId: userIds[role], householdId, role };
}

export async function resolveUserFromToken(accessToken: string): Promise<ResolvedUser> {
  const supabase = getSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    throw new AuthError("유효하지 않은 로그인 정보입니다. 다시 로그인해주세요.");
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, household_id, role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (userError) {
    throw new AuthError(userError.message, 500);
  }
  if (!userRow || !userRow.household_id) {
    throw new AuthError("가정 정보를 찾을 수 없습니다.", 404);
  }

  return {
    userId: userRow.id as string,
    householdId: userRow.household_id as string,
    role: userRow.role as DevRole,
  };
}

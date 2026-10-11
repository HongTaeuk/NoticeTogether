import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUserFromToken, AuthError } from "@/lib/auth/session";
import { isMissingMigrationError, MIGRATION_REQUIRED_MESSAGE } from "@/lib/household/members";

type JoinBody = {
  inviteCode?: string;
  /** 양육자(엄마·아빠·조부모 등)로 들어오는지, 아이로 들어오는지. 생략하면 양육자. */
  memberType?: "caregiver" | "child";
  /** 가족 안에서 불릴 호칭(예: 할머니, 민준). */
  displayName?: string;
  /** 아이로 들어올 때, 양육자가 동의 절차를 거쳐 등록해 둔 자녀 정보와 연결한다. */
  childId?: string;
};

// 부부 2명이 아니라 조부모·아이까지 한 가정으로 묶는다. 남용을 막기 위한 상한만 둔다.
const MAX_MEMBERS = 10;

/**
 * 아이가 초대 코드를 넣었을 때 "나는 누구예요?"를 고를 수 있게, 그 가족에 등록된 자녀 이름만 미리 보여준다.
 * 초대 코드는 가족끼리만 주고받는 값이고, 이름 외(출생연도·장애 정보)는 내보내지 않는다.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    await resolveUserFromToken(authHeader.slice("Bearer ".length));
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const code = req.nextUrl.searchParams.get("inviteCode")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "inviteCode가 필요합니다." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: household } = await supabase.from("households").select("id").eq("invite_code", code).maybeSingle();
  if (!household) {
    return NextResponse.json({ error: "이 코드는 사용할 수 없어요. 코드를 다시 확인해 주세요." }, { status: 404 });
  }
  const { data: children } = await supabase
    .from("children")
    .select("id, name")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ children: children ?? [] });
}

/**
 * 가입 없이(익명 계정 그대로) 초대 코드만으로 가족에 합류한다. 앱을 처음 열면 각자
 * 혼자만의 가정으로 시작하므로, 받은 초대 코드를 입력하면 내 계정을 그 가정으로 옮긴다.
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
  if ((members?.length ?? 0) >= MAX_MEMBERS) {
    return NextResponse.json(
      { error: `한 가족에는 최대 ${MAX_MEMBERS}명까지 연결할 수 있어요.` },
      { status: 409 },
    );
  }

  const isChild = body.memberType === "child";
  const displayName = body.displayName?.trim().slice(0, 20) || null;

  let childId: string | null = null;
  if (isChild && body.childId) {
    const { data: child } = await supabase
      .from("children")
      .select("id")
      .eq("id", body.childId)
      .eq("household_id", targetHousehold.id)
      .maybeSingle();
    if (!child) {
      return NextResponse.json({ error: "이 가족에 등록된 자녀가 아니에요." }, { status: 400 });
    }
    childId = child.id as string;
  }

  // 양육자: 정보를 도맡는 사람(primary)이 아직 없으면 primary, 있으면 secondary(원칙 3의 역할 기반 표시).
  const takenRoles = new Set((members ?? []).map((m) => m.role));
  const newRole = isChild ? "child" : takenRoles.has("primary") ? "secondary" : "primary";

  // 가입 전에는 각자 "혼자만의 가정"으로 시작하므로(이 세션의 아키텍처 전환 핵심),
  // 초대 코드로 연결되기 전에 이미 만들어둔 알림/체크리스트/자녀 정보가 있을 수 있다.
  // 계정만 새 가정으로 옮기고 이 데이터를 그대로 두면 "합쳤는데 예전 기록이 사라졌다"는
  // 데이터 유실처럼 보이므로, 원래 가정(옛 solo household)의 데이터를 새 가정으로 함께 옮긴다.
  const oldHouseholdId = resolved.householdId;

  const userUpdate: Record<string, unknown> = { household_id: targetHousehold.id, role: newRole };
  if (displayName) userUpdate.display_name = displayName;
  if (isChild) userUpdate.child_id = childId;

  const { error: updateError } = await supabase.from("users").update(userUpdate).eq("id", resolved.userId);
  if (updateError) {
    if (isMissingMigrationError(updateError)) {
      return NextResponse.json({ error: MIGRATION_REQUIRED_MESSAGE, needsMigration: true }, { status: 503 });
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: noticesMigrateError } = await supabase
    .from("notices")
    .update({ household_id: targetHousehold.id })
    .eq("household_id", oldHouseholdId);
  if (noticesMigrateError) {
    return NextResponse.json({ error: noticesMigrateError.message }, { status: 500 });
  }

  const { error: childrenMigrateError } = await supabase
    .from("children")
    .update({ household_id: targetHousehold.id })
    .eq("household_id", oldHouseholdId);
  if (childrenMigrateError) {
    return NextResponse.json({ error: childrenMigrateError.message }, { status: 500 });
  }

  return NextResponse.json({
    household: { id: targetHousehold.id, inviteCode: targetHousehold.invite_code },
    role: newRole,
    displayName,
    childId,
  });
}

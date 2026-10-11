import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUserFromToken, AuthError, type ResolvedUser } from "@/lib/auth/session";
import { isMissingMigrationError } from "@/lib/household/members";

async function resolveFromHeader(req: NextRequest): Promise<ResolvedUser | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    return await resolveUserFromToken(authHeader.slice("Bearer ".length));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

type MemberRow = { id: string; role: string; display_name: string | null; child_id?: string | null };

// 앱이 현재 가정 상태(초대 코드, 가족 구성원, 내 역할·호칭)를 알기 위해 부르는 엔드포인트.
export async function GET(req: NextRequest) {
  const resolved = await resolveFromHeader(req);
  if (resolved instanceof NextResponse) return resolved;

  const supabase = getSupabaseServerClient();

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, invite_code")
    .eq("id", resolved.householdId)
    .single();
  if (householdError) {
    return NextResponse.json({ error: householdError.message }, { status: 500 });
  }

  // child_id는 0004 마이그레이션 이후에만 있다 — 그 전 DB에서도 이 엔드포인트가 깨지지 않게 한 번 더 시도한다.
  let members: MemberRow[] = [];
  const withChild = await supabase
    .from("users")
    .select("id, role, display_name, child_id")
    .eq("household_id", resolved.householdId);
  if (withChild.error && isMissingMigrationError(withChild.error)) {
    const fallback = await supabase
      .from("users")
      .select("id, role, display_name")
      .eq("household_id", resolved.householdId);
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    members = (fallback.data ?? []) as MemberRow[];
  } else if (withChild.error) {
    return NextResponse.json({ error: withChild.error.message }, { status: 500 });
  } else {
    members = (withChild.data ?? []) as MemberRow[];
  }

  const me = members.find((m) => m.id === resolved.userId);

  return NextResponse.json({
    user: {
      id: resolved.userId,
      role: resolved.role,
      displayName: me?.display_name ?? null,
      childId: me?.child_id ?? null,
    },
    household: { id: household.id, inviteCode: household.invite_code },
    members,
  });
}

type PatchBody = { displayName?: string | null };

/** 가족 안에서 불릴 내 호칭(엄마·할아버지·민준 등)을 바꾼다. */
export async function PATCH(req: NextRequest) {
  const resolved = await resolveFromHeader(req);
  if (resolved instanceof NextResponse) return resolved;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }
  if (body.displayName === undefined) {
    return NextResponse.json({ error: "displayName이 필요합니다." }, { status: 400 });
  }
  const displayName = body.displayName?.trim().slice(0, 20) || null;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("users").update({ display_name: displayName }).eq("id", resolved.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ displayName });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

type CreateChildBody = {
  as?: DevRole;
  name: string;
  birthYear?: number;
  disabilityType?: string;
};

/**
 * PRD FR-5: 동의 없이는 아동 정보를 저장하지 않는다. 반드시 consents 테이블에
 * child_info(+ai_processing)가 granted=true로 먼저 기록돼 있어야 하고,
 * disabilityType을 적으려면 disability_info 동의도 별도로 필요하다.
 */
export async function POST(req: NextRequest) {
  let body: CreateChildBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name이 필요합니다." }, { status: 400 });
  }

  let resolved;
  try {
    resolved = await resolveUser(req, body.as);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { householdId, userId } = resolved;
  const supabase = getSupabaseServerClient();

  const { data: consentRows, error: consentError } = await supabase
    .from("consents")
    .select("consent_type, granted, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (consentError) {
    return NextResponse.json({ error: consentError.message }, { status: 500 });
  }

  const latest: Record<string, boolean> = {};
  for (const row of consentRows ?? []) {
    latest[row.consent_type as string] = row.granted as boolean;
  }

  if (!latest.child_info) {
    return NextResponse.json(
      { error: "아동 정보 저장 동의(child_info)가 필요합니다." },
      { status: 403 },
    );
  }
  if (!latest.ai_processing) {
    return NextResponse.json(
      { error: "AI 처리 동의(ai_processing)가 필요합니다." },
      { status: 403 },
    );
  }
  if (body.disabilityType && !latest.disability_info) {
    return NextResponse.json(
      { error: "장애 유형 정보는 별도 동의(disability_info)가 필요합니다." },
      { status: 403 },
    );
  }

  const { data: child, error } = await supabase
    .from("children")
    .insert({
      household_id: householdId,
      name: body.name.trim(),
      birth_year: body.birthYear ?? null,
      disability_type: body.disabilityType ?? null,
    })
    .select("id, name, birth_year, disability_type")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ child });
}

export async function GET(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req, req.nextUrl.searchParams.get("as") as DevRole | null);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { householdId } = resolved;
  const supabase = getSupabaseServerClient();

  const { data: children, error } = await supabase
    .from("children")
    .select("id, name, birth_year, disability_type")
    .eq("household_id", householdId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ children: children ?? [] });
}

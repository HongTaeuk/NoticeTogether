import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

const CONSENT_TYPES = ["child_info", "disability_info", "ai_processing"] as const;
type ConsentType = (typeof CONSENT_TYPES)[number];

type ConsentBody = {
  as?: DevRole;
  consentType: ConsentType;
  granted: boolean;
};

/**
 * PRD FR-5 / 01_research.md Part 5(법적 요건): 만 14세 미만 아동 정보는
 * 법정대리인 동의 없이는 저장할 수 없고, AI 처리 사실도 고지해야 한다(AI기본법 31조).
 * consents는 append-only 로그 — 동의를 철회해도 과거 기록은 남기고 granted=false를 새로 쌓는다.
 */
export async function POST(req: NextRequest) {
  let body: ConsentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  if (!CONSENT_TYPES.includes(body.consentType) || typeof body.granted !== "boolean") {
    return NextResponse.json(
      { error: `consentType은 ${CONSENT_TYPES.join("|")} 중 하나, granted는 boolean이어야 합니다.` },
      { status: 400 },
    );
  }

  let resolved;
  try {
    resolved = await resolveUser(req, body.as);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { userId } = resolved;
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("consents").insert({
    user_id: userId,
    consent_type: body.consentType,
    granted: body.granted,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// 현재 동의 상태 조회(각 consent_type의 가장 최근 기록 기준).
export async function GET(req: NextRequest) {
  const as = (req.nextUrl.searchParams.get("as") ?? "primary") as DevRole;
  const { userIds } = await ensureDevHousehold();
  const userId = userIds[as];
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("consents")
    .select("consent_type, granted, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const latest: Record<string, boolean> = {};
  for (const row of data ?? []) {
    latest[row.consent_type as string] = row.granted as boolean;
  }

  return NextResponse.json({ consents: latest });
}

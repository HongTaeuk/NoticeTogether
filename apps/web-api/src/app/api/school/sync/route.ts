import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { syncHousehold } from "@/lib/school/sync";

export const maxDuration = 60;

/**
 * 앱이 열릴 때 부른다: 학교 게시판의 새 글을 가져와 우리 가정 알림으로 넣는다.
 * 한 번에 몇 건씩만 처리하고 `pending`(남은 글 수)을 돌려준다 — 남았으면 앱이 이어서 다시 부른다.
 */
export async function POST(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  try {
    const status = await syncHousehold(getSupabaseServerClient(), resolved.householdId, Date.now() + 40_000);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "학교 소식을 가져오지 못했어요." }, { status: 500 });
  }
}

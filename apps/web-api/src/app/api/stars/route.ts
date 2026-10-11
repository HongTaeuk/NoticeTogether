import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { loadRoomContext } from "@/lib/room/load";

/**
 * 아이의 별. "내 방"과 같은 계산(`loadRoomContext`)을 써서 오늘 화면의 별과 방·상점의 별이 어긋나지 않게 한다.
 * stars = 쓸 수 있는 별(번 별 − 상점에서 쓴 별).
 */
export async function GET(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const ctx = await loadRoomContext(getSupabaseServerClient(), resolved);
  return NextResponse.json({
    stars: Math.max(0, ctx.earned - ctx.state.spent),
    earned: ctx.earned,
    spent: ctx.state.spent,
    checkedItems: ctx.checkedItems,
    stickersReceived: ctx.stickersReceived,
  });
}

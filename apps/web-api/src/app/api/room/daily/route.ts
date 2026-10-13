import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { MIGRATION_REQUIRED_MESSAGE } from "@/lib/household/members";
import { dailyGiftFor, kstDate, type RoomState } from "@/lib/room/engine";
import { loadRoomContext, saveRoomState } from "@/lib/room/load";
import { roomPayload } from "@/lib/room/payload";

/**
 * 매일 첫 접속 선물 받기. 오늘 선물은 서버가 같은 규칙(아이·날짜로 정해진 결과)으로 다시 계산해 넣으므로
 * 앱이 무엇을 받을지 정할 수 없다. 하루에 한 번만.
 */
export async function POST(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const supabase = getSupabaseServerClient();
  const ctx = await loadRoomContext(supabase, resolved);
  if (ctx.needsMigration) {
    return NextResponse.json({ error: MIGRATION_REQUIRED_MESSAGE, needsMigration: true }, { status: 503 });
  }
  const today = kstDate(new Date());
  if (ctx.state.dailySeen === today) return NextResponse.json({ error: "오늘 선물은 이미 받았어요. 내일 또 와요!" }, { status: 409 });

  const gift = dailyGiftFor(resolved.userId, today, ctx.state.owned);
  const next: RoomState = { ...ctx.state, dailySeen: today };
  let earned = ctx.earned;
  if (gift.kind === "stars") {
    next.dailyStars = ctx.state.dailyStars + gift.amount;
    earned += gift.amount;
  } else {
    next.owned = [...ctx.state.owned, gift.code];
  }
  await saveRoomState(supabase, resolved.userId, next);
  return NextResponse.json({ ...roomPayload({ ...ctx, state: next, earned }), received: gift });
}

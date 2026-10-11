import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { MIGRATION_REQUIRED_MESSAGE } from "@/lib/household/members";
import { findShopItem } from "@/lib/room/catalog";
import type { RoomState } from "@/lib/room/engine";
import { loadRoomContext, saveRoomState } from "@/lib/room/load";
import { roomPayload } from "@/lib/room/payload";

/**
 * 별 상점에서 산다. 남은 별(번 별 − 쓴 별)은 서버가 계산하고, 산 것은 바로 방에 적용한다.
 * 별은 방 꾸미기 전용이다(돈으로 바꾸는 길이 없다).
 */
export async function POST(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }
  const item = body.code ? findShopItem(body.code) : undefined;
  if (!item) return NextResponse.json({ error: "상점에 없는 물건이에요." }, { status: 404 });

  const supabase = getSupabaseServerClient();
  const ctx = await loadRoomContext(supabase, resolved);
  if (ctx.needsMigration) {
    return NextResponse.json({ error: MIGRATION_REQUIRED_MESSAGE, needsMigration: true }, { status: 503 });
  }
  const state = ctx.state;
  if (item.price === 0 || state.owned.includes(item.code)) {
    return NextResponse.json({ error: "이미 갖고 있어요." }, { status: 409 });
  }
  const balance = ctx.earned - state.spent;
  if (balance < item.price) {
    return NextResponse.json({ error: `별이 ${item.price - balance}개 더 필요해요.` }, { status: 400 });
  }

  const next: RoomState = { ...state, owned: [...state.owned, item.code], spent: state.spent + item.price };
  if (item.category === "rug") next.rug = item.code;
  if (item.category === "wall") next.wall = item.code;
  if (item.category === "floor") next.floor = item.code;

  await saveRoomState(supabase, resolved.userId, next);
  return NextResponse.json(roomPayload({ ...ctx, state: next }));
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { MIGRATION_REQUIRED_MESSAGE } from "@/lib/household/members";
import { COLLECTIBLE_PRICE, COLLECTIBLES, MAX_LEVEL, UPGRADE_PRICE, findDecor, findShopItem, findUpgradable } from "@/lib/room/catalog";
import type { RoomState } from "@/lib/room/engine";
import { loadRoomContext, saveRoomState } from "@/lib/room/load";
import { hasBase, roomPayload } from "@/lib/room/payload";

/**
 * 별 상점에서 산다. 남은 별(번 별 − 쓴 별)은 서버가 계산하고, 산 것은 바로 방에 적용한다.
 * 살 수 있는 것: 러그·벽지·바닥 / 가구·소품(마일스톤 선물을 미리) / 작은 장난감 / 업그레이드("up:bed:2").
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
  const code = typeof body.code === "string" ? body.code : "";

  const supabase = getSupabaseServerClient();
  const ctx = await loadRoomContext(supabase, resolved);
  if (ctx.needsMigration) {
    return NextResponse.json({ error: MIGRATION_REQUIRED_MESSAGE, needsMigration: true }, { status: 503 });
  }
  const state = ctx.state;
  const balance = ctx.earned - state.spent;
  const need = (price: number) =>
    balance < price ? NextResponse.json({ error: `별이 ${price - balance}개 더 필요해요.` }, { status: 400 }) : null;

  let next: RoomState | null = null;

  const shopItem = findShopItem(code);
  const collectible = COLLECTIBLES.find((c) => c.code === code);
  const decor = findDecor(code);
  const upgrade = code.match(/^up:([a-z]+):(\d)$/);

  if (shopItem) {
    if (shopItem.price === 0 || state.owned.includes(shopItem.code)) return NextResponse.json({ error: "이미 갖고 있어요." }, { status: 409 });
    const lack = need(shopItem.price);
    if (lack) return lack;
    next = { ...state, owned: [...state.owned, shopItem.code], spent: state.spent + shopItem.price };
    if (shopItem.category === "rug") next.rug = shopItem.code;
    if (shopItem.category === "wall") next.wall = shopItem.code;
    if (shopItem.category === "floor") next.floor = shopItem.code;
  } else if (collectible || decor) {
    const owned = state.owned.includes(code) || ctx.grants.some((g) => g.code === code);
    if (owned) return NextResponse.json({ error: "이미 갖고 있어요." }, { status: 409 });
    const price = collectible ? COLLECTIBLE_PRICE[collectible.grade] : decor!.price;
    const lack = need(price);
    if (lack) return lack;
    next = { ...state, owned: [...state.owned, code], spent: state.spent + price, hidden: state.hidden.filter((h) => h !== code) };
  } else if (upgrade) {
    const target = findUpgradable(upgrade[1]);
    const level = Number(upgrade[2]);
    if (!target || level < 2 || level > MAX_LEVEL) return NextResponse.json({ error: "알 수 없는 업그레이드예요." }, { status: 404 });
    if (!hasBase(ctx, target.code)) return NextResponse.json({ error: `${target.name}이(가) 먼저 있어야 해요.` }, { status: 400 });
    const current = state.levels[target.code] ?? 1;
    if (level !== current + 1) return NextResponse.json({ error: "이미 올렸거나, 앞 단계부터 올려야 해요." }, { status: 409 });
    const lack = need(UPGRADE_PRICE[level]);
    if (lack) return lack;
    next = { ...state, levels: { ...state.levels, [target.code]: level }, spent: state.spent + UPGRADE_PRICE[level] };
  } else {
    return NextResponse.json({ error: "상점에 없는 물건이에요." }, { status: 404 });
  }

  await saveRoomState(supabase, resolved.userId, next);
  return NextResponse.json(roomPayload({ ...ctx, state: next }));
}

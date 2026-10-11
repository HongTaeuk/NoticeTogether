import { COLLECTIBLES, SHOP, findShopItem } from "./catalog";
import { currentStreak, daysToNextGift, kstDate, type RoomState } from "./engine";
import type { RoomContext } from "./load";

export function isOwned(state: RoomState, code: string): boolean {
  const item = findShopItem(code);
  return !!item && (item.price === 0 || state.owned.includes(code));
}

export function roomPayload(ctx: RoomContext) {
  const today = kstDate(new Date());
  const { state, grants } = ctx;
  const grantByCode = new Map(grants.map((g) => [g.code, g]));
  const latest = grants[grants.length - 1];
  const ceremony =
    latest && (!state.ceremonySeen || latest.date > state.ceremonySeen)
      ? { ...COLLECTIBLES.find((c) => c.code === latest.code)!, date: latest.date }
      : null;

  return {
    needsMigration: ctx.needsMigration,
    today,
    stars: { earned: ctx.earned, spent: state.spent, balance: Math.max(0, ctx.earned - state.spent) },
    checkedItems: ctx.checkedItems,
    stickersReceived: ctx.stickersReceived,
    bonusStars: ctx.bonusStars,
    keptDays: ctx.keptDays.slice(-62),
    keptToday: ctx.keptDays.includes(today),
    keptTotal: ctx.keptDays.length,
    daysToNextGift: daysToNextGift(ctx.keptDays.length),
    streak: currentStreak(ctx.keptDays, today),
    collectibles: COLLECTIBLES.map((c) => {
      const g = grantByCode.get(c.code);
      return { ...c, owned: !!g, date: g?.date ?? null, hidden: state.hidden.includes(c.code) };
    }),
    shop: SHOP.map((s) => ({ ...s, owned: isOwned(state, s.code) })),
    selection: { rug: state.rug, wall: state.wall, floor: state.floor },
    ceremony,
  };
}

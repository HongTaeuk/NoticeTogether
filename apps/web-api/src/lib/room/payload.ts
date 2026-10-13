import {
  COLLECTIBLE_PRICE,
  COLLECTIBLES,
  DECOR,
  MAX_LEVEL,
  SHOP,
  UPGRADABLE,
  UPGRADE_PRICE,
  findShopItem,
} from "./catalog";
import { currentStreak, dailyGiftFor, daysToNextGift, kstDate, type RoomState } from "./engine";
import type { RoomContext } from "./load";

export function isOwned(state: RoomState, code: string): boolean {
  const item = findShopItem(code);
  return !!item && (item.price === 0 || state.owned.includes(code));
}

/** 침대·창문은 처음부터 있고, 책상·책장은 받았거나 샀을 때만 업그레이드할 수 있다. */
export function hasBase(ctx: RoomContext, code: string): boolean {
  if (code === "bed" || code === "window") return true;
  return ctx.grants.some((g) => g.code === code) || ctx.state.owned.includes(code);
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
  const collectibleOwned = (code: string) => grantByCode.has(code) || state.owned.includes(code);

  // 별 상점: 러그·벽지·바닥 + (아직 없는) 가구·소품 + 작은 장난감 + 업그레이드
  const shop = [
    ...SHOP.map((s) => ({ ...s, owned: isOwned(state, s.code) })),
    ...COLLECTIBLES.map((c) => ({
      code: c.code,
      name: c.name,
      category: "furniture" as const,
      glyph: c.glyph,
      price: COLLECTIBLE_PRICE[c.grade],
      owned: collectibleOwned(c.code),
    })),
    ...DECOR.map((d) => ({ code: d.code, name: d.name, category: "decor" as const, glyph: d.glyph, price: d.price, owned: state.owned.includes(d.code) })),
    ...UPGRADABLE.filter((u) => hasBase(ctx, u.code)).flatMap((u) => {
      const level = state.levels[u.code] ?? 1;
      if (level >= MAX_LEVEL) return [];
      const next = level + 1;
      return [
        {
          code: `up:${u.code}:${next}`,
          name: `${u.name} ${next}단계 — ${u.levels[next - 1]}`,
          category: "upgrade" as const,
          glyph: u.code,
          price: UPGRADE_PRICE[next],
          owned: false,
          level: next,
        },
      ];
    }),
  ];

  return {
    needsMigration: ctx.needsMigration,
    today,
    stars: { earned: ctx.earned, spent: state.spent, balance: Math.max(0, ctx.earned - state.spent) },
    checkedItems: ctx.checkedItems,
    stickersReceived: ctx.stickersReceived,
    bonusStars: ctx.bonusStars + ctx.duplicateStars,
    dailyStars: state.dailyStars,
    keptDays: ctx.keptDays.slice(-62),
    keptToday: ctx.keptDays.includes(today),
    keptTotal: ctx.keptDays.length,
    daysToNextGift: daysToNextGift(ctx.keptDays.length),
    streak: currentStreak(ctx.keptDays, today),
    collectibles: COLLECTIBLES.map((c) => {
      const g = grantByCode.get(c.code);
      return { ...c, owned: collectibleOwned(c.code), bought: !g && state.owned.includes(c.code), date: g?.date ?? null, hidden: state.hidden.includes(c.code) };
    }),
    decor: DECOR.map((d) => ({ ...d, owned: state.owned.includes(d.code), hidden: state.hidden.includes(d.code) })),
    levels: Object.fromEntries(UPGRADABLE.map((u) => [u.code, state.levels[u.code] ?? 1])),
    shop,
    selection: { rug: state.rug, wall: state.wall, floor: state.floor },
    ceremony,
    // 오늘 아직 열어 보지 않은 첫 접속 선물(아이 계정에서만 의미가 있다 — 화면은 아이 탭에만 있다).
    dailyGift: state.dailySeen === today || ctx.needsMigration ? null : dailyGiftFor(ctx.userId, today, state.owned),
  };
}

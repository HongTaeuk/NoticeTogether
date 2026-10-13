// apps/web-api의 `lib/room/payload.ts`(GET /api/room) 응답과 같은 모양.
export type RoomCollectible = {
  code: string;
  name: string;
  grade: "COMMON" | "RARE" | "EPIC";
  glyph: string;
  story: string;
  owned: boolean;
  /** 마일스톤 선물로 받기 전에 별로 산 것. */
  bought?: boolean;
  date: string | null;
  hidden: boolean;
};

/** 작은 장난감 — 매일 첫 접속 선물로 오거나 별 상점에서 산다. */
export type RoomDecor = { code: string; name: string; glyph: string; price: number; story: string; owned: boolean; hidden: boolean };

export type RoomShopItem = {
  code: string;
  name: string;
  category: "rug" | "wall" | "floor" | "furniture" | "decor" | "upgrade";
  glyph: string;
  price: number;
  owned: boolean;
  /** 업그레이드면 올라갈 단계. */
  level?: number;
};

export type DailyGift = { kind: "stars"; amount: number } | { kind: "item"; code: string; name: string; glyph: string };

export type RoomData = {
  needsMigration: boolean;
  today: string;
  stars: { earned: number; spent: number; balance: number };
  checkedItems: number;
  stickersReceived: number;
  bonusStars: number;
  dailyStars?: number;
  keptDays: string[];
  keptToday: boolean;
  keptTotal: number;
  /** 다음 선물까지 몇 번 더 준비해야 하는지. 다 모았으면 null. */
  daysToNextGift: number | null;
  streak: number;
  collectibles: RoomCollectible[];
  decor?: RoomDecor[];
  levels?: Record<string, number>;
  shop: RoomShopItem[];
  selection: { rug: string; wall: string; floor: string };
  ceremony: (Omit<RoomCollectible, "owned" | "hidden" | "bought"> & { date: string }) | null;
  /** 오늘 아직 열어 보지 않은 첫 접속 선물. */
  dailyGift?: DailyGift | null;
};

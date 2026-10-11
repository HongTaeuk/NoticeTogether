// apps/web-api의 `lib/room/payload.ts`(GET /api/room) 응답과 같은 모양.
export type RoomCollectible = {
  code: string;
  name: string;
  grade: "COMMON" | "RARE" | "EPIC";
  glyph: string;
  story: string;
  owned: boolean;
  date: string | null;
  hidden: boolean;
};

export type RoomShopItem = {
  code: string;
  name: string;
  category: "rug" | "wall" | "floor";
  glyph: string;
  price: number;
  owned: boolean;
};

export type RoomData = {
  needsMigration: boolean;
  today: string;
  stars: { earned: number; spent: number; balance: number };
  checkedItems: number;
  stickersReceived: number;
  bonusStars: number;
  keptDays: string[];
  keptToday: boolean;
  keptTotal: number;
  /** 다음 선물까지 몇 번 더 준비해야 하는지. 다 모았으면 null. */
  daysToNextGift: number | null;
  streak: number;
  collectibles: RoomCollectible[];
  shop: RoomShopItem[];
  selection: { rug: string; wall: string; floor: string };
  ceremony: (Omit<RoomCollectible, "owned" | "hidden"> & { date: string }) | null;
};

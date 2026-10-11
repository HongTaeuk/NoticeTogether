/**
 * 아이의 "내 방" 카탈로그 — moa 마이룸(GuardianCatalog)을 옮겨 왔다. 방 그림·도감·상점이 같은 표를 본다.
 *
 * - 선물(collectible): 준비한 날이 누적 마일스톤(engine.ts GIFT_MILESTONES)에 닿을 때 등급 추첨으로 온다.
 *   오래 써야 모이게 했다(다 모으려면 한 학기 남짓). 받은 선물은 전부 방 그림에 실제로 그려진다.
 * - 상점(shop): 별로 산다. 러그·벽지·바닥. 처음부터 주는 기본값은 값이 0이다.
 * 캐릭터는 두지 않는다 — 방은 받은 선물(물건)로만 채워진다.
 * `glyph`는 앱의 그림 키(`assets/room/*.png` 또는 벽지·바닥 색 견본)다.
 */
export type Grade = "COMMON" | "RARE" | "EPIC";

export type Collectible = { code: string; name: string; grade: Grade; glyph: string; story: string };

// 사연은 함께알림의 이야기(알림장·준비물·가족)로 쓴다.
export const COLLECTIBLES: Collectible[] = [
  { code: "plant", name: "몬스테라 화분", grade: "COMMON", glyph: "plant", story: "첫 알림을 준비한 날 찾아온 초록 친구예요." },
  { code: "yarn", name: "털실 뭉치", grade: "COMMON", glyph: "yarn", story: "준비를 일찍 끝낸 날, 가족과 목도리를 뜨기로 했어요." },
  { code: "bowl", name: "간식 그릇", grade: "COMMON", glyph: "bowl", story: "준비를 다 마치고 먹는 간식을 담아 두는 그릇이에요." },
  { code: "frame", name: "그린 액자", grade: "COMMON", glyph: "frame", story: "가족이 함께 고른 그림을 벽에 걸었어요." },
  { code: "lamp", name: "스탠드 조명", grade: "COMMON", glyph: "lamp", story: "알림장을 읽는 저녁을 환하게 밝혀 줘요." },
  { code: "shelf", name: "원목 책장", grade: "RARE", glyph: "shelf", story: "교과서랑 준비물을 가지런히 꽂아 둘 수 있어요." },
  { code: "table", name: "사이드테이블", grade: "RARE", glyph: "table", story: "내일 가져갈 준비물을 미리 올려 두는 자리예요." },
  { code: "mood", name: "무드등", grade: "RARE", glyph: "mood", story: "내일 준비를 마치고 편히 자라고 켜 주는 불빛이에요." },
  { code: "sofa", name: "민트 소파", grade: "EPIC", glyph: "sofa", story: "며칠 연속으로 알림을 준비한 친구에게만 오는 특별한 자리예요." },
];

export type ShopCategory = "rug" | "wall" | "floor";
export type ShopItem = { code: string; name: string; category: ShopCategory; glyph: string; price: number };

// 기본값(가격 0)은 처음부터 가진 것 — 고를 게 하나도 없으면 꾸미기가 상점 광고가 된다.
// 별은 준비물 하나에 1개(주 10~20개)라, 가격도 몇 주~두 달씩 모아야 닿게 잡았다.
export const SHOP: ShopItem[] = [
  { code: "rug", name: "핑크 러그", category: "rug", glyph: "rug", price: 0 },
  { code: "rug2", name: "민트 러그", category: "rug", glyph: "rug2", price: 20 },
  { code: "wall_sky", name: "하늘 벽지", category: "wall", glyph: "wall_sky", price: 0 },
  { code: "wall_mint", name: "민트 벽지", category: "wall", glyph: "wall_mint", price: 30 },
  { code: "wall_cream", name: "크림 벽지", category: "wall", glyph: "wall_cream", price: 30 },
  { code: "floor_beige", name: "베이지 바닥", category: "floor", glyph: "floor_beige", price: 0 },
  { code: "floor_wood", name: "다크우드 바닥", category: "floor", glyph: "floor_wood", price: 40 },
  { code: "floor_check", name: "체크 바닥", category: "floor", glyph: "floor_check", price: 40 },
];

export const DEFAULT_SELECTION = { rug: "rug", wall: "wall_sky", floor: "floor_beige" } as const;

export function findShopItem(code: string): ShopItem | undefined {
  return SHOP.find((s) => s.code === code);
}

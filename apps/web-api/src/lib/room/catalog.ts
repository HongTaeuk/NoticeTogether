/**
 * 아이의 "내 방" 카탈로그 — 방 그림·선물 모음·상점이 같은 표를 본다.
 * 등급·마일스톤·상점 구조는 moa 마이룸을 응용했고, 물건·그림·이름은 함께알림(학교 갈 준비·가족)에 맞게 새로 만들었다.
 *
 * - 선물(collectible): 준비한 날이 누적 마일스톤(engine.ts GIFT_MILESTONES)에 닿을 때 등급 추첨으로 온다.
 *   오래 써야 모이게 했다(다 모으려면 한 학기 남짓). 받은 선물은 전부 방 그림에 실제로 그려진다.
 * - 상점(shop): 별로 산다. 러그·벽지·바닥. 처음부터 주는 기본값은 값이 0이다.
 * 캐릭터는 두지 않는다 — 방은 받은 선물(물건)로만 채워진다.
 * `glyph`는 앱의 그림 키(`apps/mobile/src/components/room/roomArt.tsx`)다.
 */
export type Grade = "COMMON" | "RARE" | "EPIC";

export type Collectible = { code: string; name: string; grade: Grade; glyph: string; story: string };

// 사연은 함께알림의 이야기(알림장·준비물·가족)로 쓴다.
export const COLLECTIBLES: Collectible[] = [
  { code: "plant", name: "새싹 화분", grade: "COMMON", glyph: "plant", story: "알림을 준비한 날만큼 쑥쑥 자라는 웃는 새싹이에요." },
  { code: "clock", name: "초록 벽시계", grade: "COMMON", glyph: "clock", story: "아침마다 준비물 챙길 시간을 알려 줘요." },
  { code: "board", name: "알림 게시판", grade: "COMMON", glyph: "board", story: "알림장에서 꼭 챙길 것을 붙여 두는 게시판이에요." },
  { code: "bag", name: "노란 책가방", grade: "COMMON", glyph: "bag", story: "준비물을 다 넣고 내일을 기다리는 가방이에요." },
  { code: "garland", name: "알록달록 가랜드", grade: "COMMON", glyph: "garland", story: "준비를 잘 마친 날을 축하하는 깃발이에요." },
  { code: "shelf", name: "동화 책장", grade: "RARE", glyph: "shelf", story: "교과서랑 좋아하는 동화책을 가지런히 꽂아 둬요." },
  { code: "desk", name: "공부 책상", grade: "RARE", glyph: "desk", story: "숙제도 하고 알림장도 확인하는 나만의 책상이에요." },
  { code: "easel", name: "가족 그림판", grade: "RARE", glyph: "easel", story: "우리 가족 얼굴을 그려 둔 그림판이에요." },
  { code: "tent", name: "비밀 기지 텐트", grade: "EPIC", glyph: "tent", story: "며칠 연속으로 알림을 준비한 친구에게만 오는 아늑한 비밀 기지예요." },
];

export type ShopCategory = "rug" | "wall" | "floor";
export type ShopItem = { code: string; name: string; category: ShopCategory; glyph: string; price: number };

// 기본값(가격 0)은 처음부터 가진 것 — 고를 게 하나도 없으면 꾸미기가 상점 광고가 된다.
// 별은 준비물 하나에 1개(주 10~20개)라, 가격도 몇 주~두 달씩 모아야 닿게 잡았다.
export const SHOP: ShopItem[] = [
  { code: "rug", name: "해님 러그", category: "rug", glyph: "rug", price: 0 },
  { code: "rug2", name: "새싹 러그", category: "rug", glyph: "rug2", price: 20 },
  { code: "wall_sky", name: "구름 벽지", category: "wall", glyph: "wall_sky", price: 0 },
  { code: "wall_mint", name: "민트 줄무늬 벽지", category: "wall", glyph: "wall_mint", price: 30 },
  { code: "wall_cream", name: "노랑 물방울 벽지", category: "wall", glyph: "wall_cream", price: 30 },
  { code: "floor_beige", name: "밝은 마루", category: "floor", glyph: "floor_beige", price: 0 },
  { code: "floor_wood", name: "초코 마루", category: "floor", glyph: "floor_wood", price: 40 },
  { code: "floor_check", name: "민트 체크 바닥", category: "floor", glyph: "floor_check", price: 40 },
];

export const DEFAULT_SELECTION = { rug: "rug", wall: "wall_sky", floor: "floor_beige" } as const;

export function findShopItem(code: string): ShopItem | undefined {
  return SHOP.find((s) => s.code === code);
}

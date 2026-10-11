/**
 * 아이의 "내 방" 카탈로그 — moa 마이룸(GuardianCatalog)을 옮겨 왔다. 방 그림·도감·상점이 같은 표를 본다.
 *
 * - 모으는 물건(collectible): "챙긴 날"마다 등급 추첨으로 도착한다. 전부 방 그림에 실제로 그려진다.
 * - 상점(shop): 별로 산다. 러그·벽지·바닥·고양이 털색. 처음부터 주는 기본값은 값이 0이다.
 * `glyph`는 앱의 그림 키(`assets/room/*.png` 또는 벽지·바닥 색 견본)다.
 */
export type Grade = "COMMON" | "RARE" | "EPIC";

export type Collectible = { code: string; name: string; grade: Grade; glyph: string; story: string };

export const COLLECTIBLES: Collectible[] = [
  { code: "plant", name: "몬스테라 화분", grade: "COMMON", glyph: "plant", story: "처음 챙긴 날처럼 작게 시작하는 초록이에요." },
  { code: "yarn", name: "실뭉치", grade: "COMMON", glyph: "yarn", story: "냥이가 제일 좋아하는 장난감이에요." },
  { code: "bowl", name: "냥이 밥그릇", grade: "COMMON", glyph: "bowl", story: "냥이도 배불리 먹고 힘내요." },
  { code: "frame", name: "그린 액자", grade: "COMMON", glyph: "frame", story: "빈 벽에 걸린 첫 그림이에요." },
  { code: "lamp", name: "스탠드 조명", grade: "COMMON", glyph: "lamp", story: "숙제하는 밤을 환하게 밝혀 줘요." },
  { code: "shelf", name: "원목 책장", grade: "RARE", glyph: "shelf", story: "준비물을 척척 챙기는 습관처럼 차곡차곡 채워져요." },
  { code: "table", name: "사이드테이블", grade: "RARE", glyph: "table", story: "무드등을 올려 둘 자리가 생겼어요." },
  { code: "mood", name: "무드등", grade: "RARE", glyph: "mood", story: "잘 자라고 은은하게 비춰 주는 불빛이에요." },
  { code: "sofa", name: "민트 소파", grade: "EPIC", glyph: "sofa", story: "여러 날 연속으로 챙긴 친구에게만 오는 자리예요." },
];

export type ShopCategory = "rug" | "wall" | "floor" | "skin";
export type ShopItem = { code: string; name: string; category: ShopCategory; glyph: string; price: number };

// 기본값(가격 0)은 처음부터 가진 것. moa처럼 털색은 넷을 기본으로 주고 하나만 판다 —
// 고를 게 없으면 꾸미기가 상점 광고가 되고, 전부 팔면 기본 모습조차 별을 내야 한다.
export const SHOP: ShopItem[] = [
  { code: "rug", name: "핑크 러그", category: "rug", glyph: "rug", price: 0 },
  { code: "rug2", name: "민트 러그", category: "rug", glyph: "rug2", price: 5 },
  { code: "wall_sky", name: "하늘 벽지", category: "wall", glyph: "wall_sky", price: 0 },
  { code: "wall_mint", name: "민트 벽지", category: "wall", glyph: "wall_mint", price: 8 },
  { code: "wall_cream", name: "크림 벽지", category: "wall", glyph: "wall_cream", price: 8 },
  { code: "floor_beige", name: "베이지 바닥", category: "floor", glyph: "floor_beige", price: 0 },
  { code: "floor_wood", name: "다크우드 바닥", category: "floor", glyph: "floor_wood", price: 10 },
  { code: "floor_check", name: "체크 바닥", category: "floor", glyph: "floor_check", price: 10 },
  { code: "cat", name: "크림 냥이", category: "skin", glyph: "catsit", price: 0 },
  { code: "gray", name: "회색 냥이", category: "skin", glyph: "catsit_gray", price: 0 },
  { code: "cheese", name: "치즈 냥이", category: "skin", glyph: "catsit_cheese", price: 0 },
  { code: "choco", name: "초코 냥이", category: "skin", glyph: "catsit_choco", price: 0 },
  { code: "calico", name: "삼색 냥이", category: "skin", glyph: "catsit_calico", price: 12 },
];

export const DEFAULT_SELECTION = { rug: "rug", wall: "wall_sky", floor: "floor_beige", catSkin: "cat" } as const;

export function findShopItem(code: string): ShopItem | undefined {
  return SHOP.find((s) => s.code === code);
}

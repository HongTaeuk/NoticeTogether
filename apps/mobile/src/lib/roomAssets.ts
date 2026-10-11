import type { ImageSourcePropType } from "react-native";

/**
 * moa 마이룸의 방 그림(`frontend/public/room/*.png`) 중 가구·소품만 가져왔다(캐릭터는 두지 않는다). 파일은 표시 크기의 2배 해상도다.
 * 크기표(`IMGD`)도 moa 값 그대로 — 이 값으로 바닥에 발을 맞춘다.
 */
export const ROOM_IMAGES: Record<string, ImageSourcePropType> = {
  bed: require("../assets/room/bed.png"),
  bowl: require("../assets/room/bowl.png"),
  frame: require("../assets/room/frame.png"),
  lamp: require("../assets/room/lamp.png"),
  mood: require("../assets/room/mood.png"),
  plant: require("../assets/room/plant.png"),
  rug: require("../assets/room/rug.png"),
  rug2: require("../assets/room/rug2.png"),
  shelf: require("../assets/room/shelf.png"),
  sofa: require("../assets/room/sofa.png"),
  table: require("../assets/room/table.png"),
  yarn: require("../assets/room/yarn.png"),
};

export const IMGD: Record<string, [number, number]> = {
  lamp: [33, 72], plant: [31, 44], frame: [23, 42], shelf: [43, 89],
  bed: [87, 70], mood: [14, 16], sofa: [64, 60], table: [40, 43],
  rug: [104, 53], rug2: [104, 53], bowl: [25, 16], yarn: [19, 26],
};


/** 벽 두 면 색. moa는 벽지를 아직 못 그렸다 — 여기서는 실제로 바뀐다. */
export const WALLS: Record<string, { back: string; side: string }> = {
  wall_sky: { back: "#DBE9FB", side: "#C9DDF7" },
  wall_mint: { back: "#D7F2E4", side: "#C1E6D2" },
  wall_cream: { back: "#F8EEDC", side: "#EEDFC6" },
};

export const FLOORS: Record<string, { a: string; b: string; stroke: string; front: string; right: string }> = {
  floor_beige: { a: "#F5EDE0", b: "#EDE3D4", stroke: "#E3D6C2", front: "#D9C9B0", right: "#CBB795" },
  floor_wood: { a: "#C49A6C", b: "#B48A5C", stroke: "#A57B4E", front: "#9C7448", right: "#8A653E" },
  floor_check: { a: "#FBF6EC", b: "#DFD0B6", stroke: "#D3C3A6", front: "#D9C9B0", right: "#CBB795" },
};

/** 꾸미기·상점 칸에 그림 대신 보여 줄 벽지·바닥 색 견본. */
export function swatchColors(glyph: string): [string, string] | null {
  if (WALLS[glyph]) return [WALLS[glyph].back, WALLS[glyph].side];
  if (FLOORS[glyph]) return [FLOORS[glyph].a, FLOORS[glyph].b];
  return null;
}

export const GRADE_LABEL: Record<string, string> = { COMMON: "일반", RARE: "희귀", EPIC: "전설" };
export const GRADE_EMOJI: Record<string, string> = { COMMON: "🍀", RARE: "💎", EPIC: "👑" };

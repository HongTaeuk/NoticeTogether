import React from "react";
import Svg, { Circle, Ellipse, G, Line, Polygon, Rect } from "react-native-svg";
import { FLOORS, Garland, ITEM_ART, OUT, WALLS, WallPattern } from "./roomArt";

/**
 * 아이의 방 — 정면에서 본 인형의 집. 초록 지붕 아래 방 한 칸에 받은 선물(물건)이 하나씩 놓인다.
 *
 * 좌표: viewBox 400×312. 뒷벽 x 52~348 / y 78~218, 바닥은 뒷벽 아래에서 앞(y 292)으로 넓어지는 사다리꼴.
 * 그리는 순서 = 뒤에서 앞으로: 벽에 거는 것 → 뒷벽에 붙인 가구 → 러그 → 앞쪽 바닥의 물건.
 * 선물마다 자리가 정해져 있어서(서로 기대지 않음) 어떤 걸 치워도 다른 물건이 떠 있지 않다.
 */
const VB_W = 400;
const VB_H = 312;

type Spot = { code: string; x: number; y: number };

// 뒤 → 앞 순서. y는 물건의 바닥(원점) 위치.
const WALL_SPOTS: Spot[] = [
  { code: "clock", x: 213, y: 132 },
  { code: "board", x: 282, y: 150 },
];
const BACK_SPOTS: Spot[] = [
  { code: "shelf", x: 82, y: 226 },
  { code: "desk", x: 280, y: 226 },
];
const FRONT_SPOTS: Spot[] = [
  { code: "bag", x: 106, y: 284 },
  { code: "plant", x: 272, y: 292 },
  { code: "easel", x: 40, y: 292 },
  { code: "tent", x: 333, y: 294 },
];
const RUG_AT = { x: 200, y: 278 };

function floorShapes(floor: string): React.ReactElement[] {
  const fl = FLOORS[floor] ?? FLOORS.floor_beige;
  const out: React.ReactElement[] = [];
  const top = 218;
  const bottom = 292;
  const xl = (y: number) => 52 + ((16 - 52) * (y - top)) / (bottom - top);
  const xr = (y: number) => 348 + ((384 - 348) * (y - top)) / (bottom - top);
  out.push(<Polygon key="base" points={`52,${top} 348,${top} 384,${bottom} 16,${bottom}`} fill={fl.a} />);
  if (fl.kind === "check") {
    const rows = [0, 0.15, 0.33, 0.54, 0.77, 1].map((f) => top + f * (bottom - top));
    const cols = 9;
    for (let r = 0; r < rows.length - 1; r++) {
      const y0 = rows[r];
      const y1 = rows[r + 1];
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) continue;
        const a0 = xl(y0) + ((xr(y0) - xl(y0)) * c) / cols;
        const a1 = xl(y0) + ((xr(y0) - xl(y0)) * (c + 1)) / cols;
        const b0 = xl(y1) + ((xr(y1) - xl(y1)) * c) / cols;
        const b1 = xl(y1) + ((xr(y1) - xl(y1)) * (c + 1)) / cols;
        out.push(<Polygon key={`c${r}-${c}`} points={`${a0},${y0} ${a1},${y0} ${b1},${y1} ${b0},${y1}`} fill={fl.b} />);
      }
    }
  } else {
    const planks = 11;
    for (let i = 1; i < planks; i++) {
      out.push(
        <Line
          key={`p${i}`}
          x1={52 + (296 * i) / planks}
          y1={top}
          x2={16 + (368 * i) / planks}
          y2={bottom}
          stroke={fl.line}
          strokeWidth={1.1}
        />,
      );
    }
    for (let i = 0; i < planks; i++) {
      const f = [0.28, 0.66, 0.45][i % 3];
      const y = top + f * (bottom - top);
      const x0 = xl(y) + ((xr(y) - xl(y)) * i) / planks;
      const x1 = xl(y) + ((xr(y) - xl(y)) * (i + 1)) / planks;
      out.push(<Line key={`j${i}`} x1={x0} y1={y} x2={x1} y2={y} stroke={fl.line} strokeWidth={1.1} />);
    }
  }
  return out;
}

export default function RoomScene({
  width,
  visible,
  rug,
  wall,
  floor,
  editing,
  onPick,
  onRugSlot,
}: {
  width: number;
  /** 방에 보이는 선물 코드(받았고 치우지 않은 것). */
  visible: Set<string>;
  rug: string;
  wall: string;
  floor: string;
  editing: boolean;
  onPick: (key: string) => void;
  onRugSlot: () => void;
}) {
  const wl = WALLS[wall] ?? WALLS.wall_sky;
  const height = (width * VB_H) / VB_W;
  const rugArt = ITEM_ART[rug] ?? ITEM_ART.rug;

  const place = (s: Spot) =>
    visible.has(s.code) && ITEM_ART[s.code] ? (
      <G key={s.code} x={s.x} y={s.y} onPress={() => onPick(s.code)}>
        {ITEM_ART[s.code].draw()}
      </G>
    ) : null;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {/* 굴뚝 → 집 몸통(방 테두리) → 지붕 */}
      <Rect x={300} y={14} width={20} height={34} fill="#E98B5A" stroke={OUT} strokeWidth={2} />
      <Rect x={296} y={10} width={28} height={7} rx={2} fill="#F2A57A" stroke={OUT} strokeWidth={2} />
      <Rect x={6} y={56} width={388} height={248} rx={14} fill="#FFFDF7" stroke={OUT} strokeWidth={2} />

      {/* 방 안: 천장 · 뒷벽(무늬) · 옆벽 · 걸레받이 · 바닥 */}
      <Polygon points="16,64 384,64 348,78 52,78" fill={wl.ceil} />
      <Rect x={52} y={78} width={296} height={140} fill={wl.back} />
      <WallPattern wall={wall} x={52} y={78} w={296} h={133} />
      <Polygon points="16,64 52,78 52,218 16,292" fill={wl.side} />
      <Polygon points="384,64 348,78 348,218 384,292" fill={wl.side} />
      <Rect x={52} y={211} width={296} height={7} fill="#FFFFFF" />
      <Polygon points="52,211 52,218 16,292 16,278" fill="#FFFFFF" />
      <Polygon points="348,211 348,218 384,292 384,278" fill="#FFFFFF" />
      {floorShapes(floor)}
      <G stroke={OUT} strokeWidth={1.2} strokeLinecap="round">
        <Line x1={16} y1={64} x2={52} y2={78} />
        <Line x1={384} y1={64} x2={348} y2={78} />
        <Line x1={52} y1={78} x2={348} y2={78} />
        <Line x1={52} y1={78} x2={52} y2={218} />
        <Line x1={348} y1={78} x2={348} y2={218} />
        <Line x1={52} y1={218} x2={348} y2={218} />
        <Line x1={52} y1={218} x2={16} y2={292} />
        <Line x1={348} y1={218} x2={384} y2={292} />
      </G>
      <Rect x={16} y={64} width={368} height={228} fill="none" stroke={OUT} strokeWidth={2} />

      {/* 지붕 — 함께알림 초록, 다락 창에 별 */}
      <Polygon points="0,66 200,4 400,66" fill="#2E9E5B" stroke={OUT} strokeWidth={2} strokeLinejoin="round" />
      <Polygon points="40,58 200,12 360,58" fill="#46B172" />
      <G stroke="#2E9E5B" strokeWidth={1.4} fill="none">
        <Line x1={92} y1={44} x2={308} y2={44} />
        <Line x1={140} y1={30} x2={260} y2={30} />
      </G>
      <Circle cx={200} cy={40} r={12} fill="#FFFDF7" stroke={OUT} strokeWidth={2} />
      <Polygon
        points="200,32.5 202.2,37.5 207.6,37.9 203.5,41.4 204.8,46.6 200,43.8 195.2,46.6 196.5,41.4 192.4,37.9 197.8,37.5"
        fill="#FFD54A"
        stroke={OUT}
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {/* 벽에 거는 것 */}
      {visible.has("garland") && (
        <G onPress={() => onPick("garland")}>
          <Garland x0={58} x1={342} y0={84} sag={8} flags={16} />
        </G>
      )}
      <G x={166} y={158} onPress={() => onPick("window")}>
        {ITEM_ART.window.draw()}
      </G>
      {WALL_SPOTS.map(place)}

      {/* 뒷벽에 붙인 가구 + 침대 */}
      {BACK_SPOTS.slice(0, 1).map(place)}
      <G x={166} y={228} onPress={() => onPick("bed")}>
        {ITEM_ART.bed.draw()}
      </G>
      {BACK_SPOTS.slice(1).map(place)}

      {/* 러그 */}
      <G x={RUG_AT.x} y={RUG_AT.y} onPress={editing ? onRugSlot : () => onPick(rug)}>
        {rugArt.draw()}
      </G>
      {editing && (
        <Ellipse
          cx={RUG_AT.x}
          cy={RUG_AT.y - 18}
          rx={78}
          ry={22}
          fill="rgba(19,133,74,0.10)"
          stroke="#13854A"
          strokeWidth={1.6}
          strokeDasharray="6 5"
          onPress={onRugSlot}
        />
      )}

      {/* 앞쪽 바닥 */}
      {FRONT_SPOTS.map(place)}
    </Svg>
  );
}

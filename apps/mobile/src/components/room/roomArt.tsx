import React from "react";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";

/**
 * "내 방" 그림 — 함께알림용으로 새로 그린 벡터 그림이다(외부 그림 파일 없음).
 * 정면에서 본 인형의 집 같은 방에, 학교 갈 준비와 가족을 떠올리게 하는 물건(책가방·알림 게시판·공부 책상…)을 둔다.
 * 굵은 갈색 테두리 + 밝은 면 색의 스티커 느낌으로 통일한다. 회색은 쓰지 않는다.
 *
 * 물건 그림은 모두 "바닥 가운데"가 원점(0,0)이고 위쪽이 음수 y다 — 방 그림과 썸네일이 같은 그림을 쓴다.
 */
export const OUT = "#6B4A2B";
const SW = 1.6;
const st = { stroke: OUT, strokeWidth: SW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const thin = { stroke: OUT, strokeWidth: 1, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const WOOD = "#EDBE80";
const WOOD_D = "#D49A5A";
const WOOD_DD = "#B97C3F";
const WHITE = "#FFFFFF";
const CREAM = "#FFF8E6";
const SUN = "#FFD54A";
const SUN_L = "#FFE99A";
const GREEN = "#5DBB7E";
const GREEN_L = "#B5E3C3";
const GREEN_D = "#2F9257";
const SKY = "#8FD0F5";
const PINK = "#F7A1B5";
const CORAL = "#F58F6B";
const SKIN = "#F8D2AE";

function star(cx: number, cy: number, R: number, r = R * 0.45): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function Cloud({ x, y, s = 1, fill = WHITE }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <G x={x} y={y}>
      <Circle cx={-6 * s} cy={0} r={4.5 * s} fill={fill} />
      <Circle cx={0} cy={-3 * s} r={6 * s} fill={fill} />
      <Circle cx={6 * s} cy={0} r={4.5 * s} fill={fill} />
      <Rect x={-10 * s} y={0} width={20 * s} height={4.5 * s} rx={2.2 * s} fill={fill} />
    </G>
  );
}

/** 그림판 속 가족 — 동그란 얼굴 + 세모 몸. */
function Person({ x, top, h, color }: { x: number; top: number; h: number; color: string }) {
  return (
    <G>
      <Polygon points={`${x},${top + 4} ${x - h * 0.32},${top + h} ${x + h * 0.32},${top + h}`} fill={color} {...thin} />
      <Circle cx={x} cy={top + 1} r={h * 0.2} fill={SKIN} {...thin} />
    </G>
  );
}

export type ItemArt = { w: number; h: number; draw: () => React.ReactElement };

export const ITEM_ART: Record<string, ItemArt> = {
  // ── 처음부터 있는 것 ──
  bed: {
    w: 106,
    h: 62,
    draw: () => (
      <G>
        <Rect x={-53} y={-62} width={16} height={62} rx={7} fill={WOOD} {...st} />
        <Polygon points={star(-45, -50, 4.5)} fill={SUN} {...thin} />
        <Rect x={-40} y={-20} width={80} height={14} rx={3} fill={WOOD_D} {...st} />
        <Rect x={-40} y={-31} width={80} height={12} rx={4} fill={WHITE} {...st} />
        <Rect x={-38} y={-41} width={21} height={12} rx={6} fill={WHITE} {...st} />
        <Path d="M-14 -37 Q-14 -42 -9 -42 L37 -42 Q41 -42 41 -37 L41 -15 Q41 -12 38 -12 L-11 -12 Q-14 -12 -14 -15 Z" fill={SUN} {...st} />
        <Line x1={-13} y1={-34} x2={40} y2={-34} stroke="#F2B92E" strokeWidth={2.4} />
        <Circle cx={0} cy={-24} r={2} fill={WHITE} />
        <Circle cx={13} cy={-19} r={2} fill={WHITE} />
        <Circle cx={26} cy={-26} r={2} fill={WHITE} />
        <Circle cx={-6} cy={-17} r={2} fill={WHITE} />
        <Circle cx={33} cy={-18} r={2} fill={WHITE} />
        <Rect x={37} y={-38} width={16} height={38} rx={6} fill={WOOD} {...st} />
      </G>
    ),
  },
  window: {
    w: 58,
    h: 54,
    draw: () => (
      <G>
        <Rect x={-26} y={-52} width={52} height={46} rx={7} fill={WHITE} {...st} />
        <Rect x={-21} y={-47} width={42} height={36} rx={4} fill="#BFE6FF" />
        <Circle cx={11} cy={-38} r={5.5} fill="#FFE27A" />
        <Cloud x={-8} y={-22} s={0.8} />
        <Line x1={0} y1={-47} x2={0} y2={-11} stroke={WHITE} strokeWidth={3} />
        <Line x1={-21} y1={-29} x2={21} y2={-29} stroke={WHITE} strokeWidth={3} />
        <Path d="M-27 -53 L-10 -53 Q-17 -40 -27 -33 Z" fill={GREEN_L} {...st} />
        <Path d="M27 -53 L10 -53 Q17 -40 27 -33 Z" fill={GREEN_L} {...st} />
        <Rect x={-29} y={-7} width={58} height={7} rx={3} fill={WOOD} {...st} />
      </G>
    ),
  },
  // 러그(가운데 깔개) — 바닥에 납작하게 깔리므로 원점은 타원의 아래 끝.
  rug: {
    w: 148,
    h: 38,
    draw: () => (
      <G>
        <Ellipse cx={0} cy={-18} rx={72} ry={18} fill="#FFE07A" {...st} />
        <Ellipse cx={0} cy={-18} rx={62} ry={14} fill="none" stroke={WHITE} strokeWidth={2} strokeDasharray="5 4" />
        <Ellipse cx={0} cy={-18} rx={46} ry={10} fill="#FFC93C" />
        <Ellipse cx={0} cy={-18} rx={20} ry={4.5} fill="#FFF1B8" />
      </G>
    ),
  },
  rug2: {
    w: 148,
    h: 38,
    draw: () => (
      <G>
        <Ellipse cx={0} cy={-18} rx={72} ry={18} fill="#B5E3C3" {...st} />
        <Ellipse cx={0} cy={-18} rx={62} ry={14} fill="none" stroke={WHITE} strokeWidth={2} strokeDasharray="5 4" />
        <Ellipse cx={0} cy={-18} rx={46} ry={10} fill="#86CF9F" />
        <Path d="M-14 -18 Q-7 -25 0 -18 Q-7 -12 -14 -18 Z" fill="#E3F6EA" />
        <Path d="M14 -18 Q7 -25 0 -18 Q7 -12 14 -18 Z" fill="#E3F6EA" />
      </G>
    ),
  },

  // ── 선물: 새싹(일반) ──
  plant: {
    w: 38,
    h: 50,
    draw: () => (
      <G>
        <Path d="M0 -22 Q-1 -32 0 -39" fill="none" stroke={GREEN_D} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M0 -35 Q-17 -48 -18 -32 Q-8 -27 0 -35 Z" fill={GREEN} {...st} />
        <Path d="M0 -38 Q15 -54 19 -38 Q9 -31 0 -38 Z" fill={GREEN} {...st} />
        <Path d="M-3 -35 Q-9 -37 -13 -34" fill="none" stroke={GREEN_L} strokeWidth={1.4} strokeLinecap="round" />
        <Path d="M3 -38 Q9 -42 14 -40" fill="none" stroke={GREEN_L} strokeWidth={1.4} strokeLinecap="round" />
        <Path d="M-11 -18 L11 -18 L8 0 L-8 0 Z" fill="#E98B5A" {...st} />
        <Rect x={-13} y={-23} width={26} height={6} rx={2} fill="#F2A57A" {...st} />
        <Circle cx={-4} cy={-11} r={1.3} fill={OUT} />
        <Circle cx={4} cy={-11} r={1.3} fill={OUT} />
        <Path d="M-2.5 -7 Q0 -4.6 2.5 -7" fill="none" {...thin} />
        <Circle cx={-7} cy={-8} r={1.8} fill={PINK} />
        <Circle cx={7} cy={-8} r={1.8} fill={PINK} />
      </G>
    ),
  },
  clock: {
    w: 32,
    h: 32,
    draw: () => (
      <G>
        <Circle cx={0} cy={-16} r={14.5} fill={GREEN} {...st} />
        <Circle cx={0} cy={-16} r={10.5} fill={WHITE} {...thin} />
        <Circle cx={0} cy={-24} r={1.1} fill={OUT} />
        <Circle cx={8} cy={-16} r={1.1} fill={OUT} />
        <Circle cx={0} cy={-8} r={1.1} fill={OUT} />
        <Circle cx={-8} cy={-16} r={1.1} fill={OUT} />
        <Line x1={0} y1={-16} x2={0} y2={-22.5} stroke={OUT} strokeWidth={1.8} strokeLinecap="round" />
        <Line x1={0} y1={-16} x2={5} y2={-13.5} stroke={OUT} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx={0} cy={-16} r={1.6} fill={CORAL} />
      </G>
    ),
  },
  board: {
    w: 70,
    h: 48,
    draw: () => (
      <G>
        <Rect x={-35} y={-48} width={70} height={48} rx={5} fill={WOOD} {...st} />
        <Rect x={-31} y={-44} width={62} height={40} rx={3} fill="#E9BC8B" />
        <Circle cx={-24} cy={-9} r={0.9} fill="#D3A06C" />
        <Circle cx={22} cy={-38} r={0.9} fill="#D3A06C" />
        <Circle cx={5} cy={-9} r={0.9} fill="#D3A06C" />
        <Polygon points="-28,-38 -10,-40 -8,-22 -26,-20" fill={SUN_L} {...thin} />
        <Line x1={-24} y1={-33} x2={-13} y2={-34} {...thin} />
        <Line x1={-24} y1={-29} x2={-15} y2={-30} {...thin} />
        <Circle cx={-18} cy={-38} r={2.2} fill={CORAL} {...thin} />
        <Polygon points="-4,-41 16,-39 15,-25 -5,-27" fill={GREEN_L} {...thin} />
        <Path d="M0 -33 L3 -30 L8 -36" fill="none" stroke={GREEN_D} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={6} cy={-40} r={2.2} fill={SKY} {...thin} />
        <Polygon points="19,-30 29,-31 30,-10 20,-9" fill={WHITE} {...thin} />
        <Line x1={22} y1={-25} x2={27} y2={-25} {...thin} />
        <Line x1={22} y1={-21} x2={27} y2={-21} {...thin} />
        <Line x1={22} y1={-17} x2={26} y2={-17} {...thin} />
        <Circle cx={25} cy={-30} r={2} fill={SUN} {...thin} />
        <Polygon points={star(4, -14, 6)} fill={SUN} {...thin} />
      </G>
    ),
  },
  bag: {
    w: 36,
    h: 46,
    draw: () => (
      <G>
        <Path d="M-6 -40 Q0 -48 6 -40" fill="none" stroke={OUT} strokeWidth={2.6} strokeLinecap="round" />
        <Rect x={-16} y={-40} width={32} height={40} rx={9} fill={SUN} {...st} />
        <Path d="M-16 -28 Q-16 -40 -7 -40 L7 -40 Q16 -40 16 -28 L16 -23 Q0 -17 -16 -23 Z" fill="#FFC21F" {...st} />
        <Rect x={-3} y={-23} width={6} height={7} rx={1.5} fill={GREEN} {...thin} />
        <Rect x={-10} y={-13} width={20} height={11} rx={4} fill={SUN_L} {...st} />
        <Polygon points={star(0, -7.5, 3.2)} fill={GREEN} />
      </G>
    ),
  },
  // 가랜드는 방에서는 벽 위쪽을 가로지르고(GarlandScene), 썸네일은 짧은 줄로 그린다.
  garland: {
    w: 56,
    h: 24,
    draw: () => <Garland x0={-26} x1={26} y0={-21} sag={10} flags={5} />,
  },

  // ── 선물: 반짝(희귀) ──
  shelf: {
    w: 46,
    h: 108,
    draw: () => (
      <G>
        <Rect x={-23} y={-100} width={46} height={100} rx={5} fill={WOOD} {...st} />
        <Rect x={-18} y={-94} width={36} height={26} rx={2} fill="#C98A4E" />
        <Rect x={-18} y={-62} width={36} height={26} rx={2} fill="#C98A4E" />
        <Rect x={-18} y={-30} width={36} height={24} rx={2} fill="#C98A4E" />
        <Rect x={-16} y={-89} width={6} height={21} fill={PINK} {...thin} />
        <Rect x={-10} y={-91} width={5} height={23} fill={SKY} {...thin} />
        <Rect x={-5} y={-87} width={7} height={19} fill={SUN} {...thin} />
        <Polygon points="4,-86 9,-87 15,-70 10,-68" fill={GREEN} {...thin} />
        <Rect x={-16} y={-58} width={7} height={22} fill={GREEN} {...thin} />
        <Rect x={-9} y={-55} width={6} height={19} fill={CORAL} {...thin} />
        <Rect x={-3} y={-57} width={5} height={21} fill={SUN} {...thin} />
        <Rect x={4} y={-54} width={11} height={18} rx={2} fill={SKY} {...thin} />
        <Circle cx={-9} cy={-13} r={6.5} fill={CORAL} {...thin} />
        <Path d="M-15.3 -13 Q-9 -9 -2.7 -13" fill="none" stroke={WHITE} strokeWidth={1.4} />
        <Rect x={2} y={-22} width={13} height={16} rx={2} fill={GREEN_L} {...thin} />
        <Polygon points={star(0, -102, 6)} fill={SUN} {...thin} />
      </G>
    ),
  },
  desk: {
    w: 80,
    h: 72,
    draw: () => (
      <G>
        <Rect x={-36} y={-38} width={5} height={38} fill={WOOD_D} {...st} />
        <Rect x={10} y={-38} width={27} height={38} rx={2} fill={WOOD} {...st} />
        <Line x1={10} y1={-19} x2={37} y2={-19} {...st} />
        <Circle cx={23.5} cy={-28} r={1.8} fill={OUT} />
        <Circle cx={23.5} cy={-9} r={1.8} fill={OUT} />
        <Rect x={-40} y={-44} width={80} height={7} rx={3} fill={WOOD} {...st} />
        <Path d="M-28 -45 L-30 -58 L-22 -64" fill="none" stroke={OUT} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <Ellipse cx={-28} cy={-45} rx={7} ry={2.5} fill={GREEN_D} {...thin} />
        <Path d="M-27 -60 Q-22 -73 -11 -66 Z" fill={SUN} {...st} />
        <Rect x={-9} y={-50} width={24} height={6} rx={1.5} fill={GREEN_L} {...thin} />
        <Rect x={-7} y={-55} width={20} height={5} rx={1.5} fill={SKY} {...thin} />
        <Line x1={22} y1={-53} x2={20} y2={-62} stroke={SUN} strokeWidth={2} strokeLinecap="round" />
        <Line x1={26} y1={-53} x2={27} y2={-63} stroke={GREEN} strokeWidth={2} strokeLinecap="round" />
        <Line x1={29} y1={-53} x2={32} y2={-60} stroke={CORAL} strokeWidth={2} strokeLinecap="round" />
        <Rect x={20} y={-54} width={11} height={10} rx={2} fill={CORAL} {...thin} />
      </G>
    ),
  },
  easel: {
    w: 54,
    h: 94,
    draw: () => (
      <G>
        <Line x1={0} y1={-92} x2={-22} y2={0} stroke={OUT} strokeWidth={5.2} strokeLinecap="round" />
        <Line x1={0} y1={-92} x2={22} y2={0} stroke={OUT} strokeWidth={5.2} strokeLinecap="round" />
        <Line x1={0} y1={-92} x2={-22} y2={0} stroke={WOOD_D} strokeWidth={2.6} strokeLinecap="round" />
        <Line x1={0} y1={-92} x2={22} y2={0} stroke={WOOD_D} strokeWidth={2.6} strokeLinecap="round" />
        <Rect x={-22} y={-86} width={44} height={46} rx={2} fill={WHITE} {...st} />
        <Circle cx={12} cy={-77} r={5} fill={SUN} />
        <Path d="M-20 -41 Q-8 -55 4 -47 Q13 -53 20 -45 L20 -41 Z" fill={GREEN_L} />
        <Person x={-11} top={-66} h={18} color={CORAL} />
        <Person x={-2} top={-64} h={16} color={SKY} />
        <Person x={7} top={-58} h={11} color={SUN} />
        <Path d="M-14 -80 Q-14 -83 -11.5 -83 Q-9 -83 -9 -80 Q-9 -83 -6.5 -83 Q-4 -83 -4 -80 Q-4 -77 -9 -74 Q-14 -77 -14 -80 Z" fill={PINK} />
        <Rect x={-25} y={-42} width={50} height={5} rx={2} fill={WOOD} {...st} />
        <Circle cx={-12} cy={-44} r={1.8} fill={CORAL} />
        <Circle cx={-6} cy={-44} r={1.8} fill={SUN} />
        <Circle cx={0} cy={-44} r={1.8} fill={SKY} />
      </G>
    ),
  },

  // ── 선물: 무지개(전설) ──
  tent: {
    w: 94,
    h: 106,
    draw: () => (
      <G>
        <Line x1={0} y1={-86} x2={-9} y2={-97} stroke={WOOD_DD} strokeWidth={2.6} strokeLinecap="round" />
        <Line x1={0} y1={-86} x2={0} y2={-104} stroke={WOOD_DD} strokeWidth={2.6} strokeLinecap="round" />
        <Line x1={0} y1={-86} x2={9} y2={-97} stroke={WOOD_DD} strokeWidth={2.6} strokeLinecap="round" />
        <Polygon points="0,-104 15,-100 0,-95" fill={CORAL} {...thin} />
        <Polygon points="0,-86 -44,0 44,0" fill={CREAM} />
        <Polygon points="0,-86 -44,0 -30,0" fill={GREEN_L} />
        <Polygon points="0,-86 -16,0 -2,0" fill={GREEN_L} />
        <Polygon points="0,-86 12,0 26,0" fill={GREEN_L} />
        <Polygon points="0,-86 -44,0 44,0" fill="none" {...st} />
        <Path d="M0 -50 Q-5 -20 -18 0 L18 0 Q5 -20 0 -50 Z" fill="#A9733F" {...st} />
        <Polygon points={star(0, -16, 6)} fill={SUN} />
        <Path d="M0 -50 Q-9 -24 -24 0" fill="none" stroke={CREAM} strokeWidth={3} strokeLinecap="round" />
        <Path d="M0 -50 Q9 -24 24 0" fill="none" stroke={CREAM} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={-11} cy={-64.5} r={2.4} fill={SUN} {...thin} />
        <Circle cx={-22} cy={-43} r={2.4} fill={PINK} {...thin} />
        <Circle cx={-33} cy={-21.5} r={2.4} fill={SKY} {...thin} />
        <Circle cx={11} cy={-64.5} r={2.4} fill={SKY} {...thin} />
        <Circle cx={22} cy={-43} r={2.4} fill={SUN} {...thin} />
        <Circle cx={33} cy={-21.5} r={2.4} fill={PINK} {...thin} />
      </G>
    ),
  },

  // ── 작은 장난감(매일 첫 접속 선물·별 상점) ──
  teddy: {
    w: 34,
    h: 34,
    draw: () => (
      <G>
        <Ellipse cx={0} cy={-10} rx={12} ry={10} fill="#C98A55" {...st} />
        <Circle cx={-9} cy={-3} r={4} fill="#C98A55" {...st} />
        <Circle cx={9} cy={-3} r={4} fill="#C98A55" {...st} />
        <Circle cx={-10} cy={-29} r={4.2} fill="#C98A55" {...st} />
        <Circle cx={10} cy={-29} r={4.2} fill="#C98A55" {...st} />
        <Circle cx={0} cy={-23} r={10} fill="#D9A06A" {...st} />
        <Ellipse cx={0} cy={-19.5} rx={4.6} ry={3.4} fill="#F3D3AE" {...thin} />
        <Circle cx={0} cy={-21} r={1.3} fill={OUT} />
        <Circle cx={-4} cy={-25} r={1.2} fill={OUT} />
        <Circle cx={4} cy={-25} r={1.2} fill={OUT} />
        <Polygon points="-6,-13 0,-11 -6,-8" fill={CORAL} {...thin} />
        <Polygon points="6,-13 0,-11 6,-8" fill={CORAL} {...thin} />
      </G>
    ),
  },
  ball: {
    w: 24,
    h: 24,
    draw: () => (
      <G>
        <Circle cx={0} cy={-11} r={10.5} fill={WHITE} {...st} />
        <Path d="M-10.5 -11 A10.5 10.5 0 0 1 10.5 -11 Z" fill={CORAL} />
        <Circle cx={0} cy={-11} r={10.5} fill="none" {...st} />
        <Line x1={-10.5} y1={-11} x2={10.5} y2={-11} {...thin} />
        <Path d="M-6 -16 Q-3 -19 1 -19" fill="none" stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" />
      </G>
    ),
  },
  blocks: {
    w: 32,
    h: 40,
    draw: () => (
      <G>
        <Rect x={-14} y={-14} width={14} height={14} rx={2} fill={SKY} {...st} />
        <Rect x={0} y={-14} width={14} height={14} rx={2} fill={CORAL} {...st} />
        <Rect x={-7} y={-27} width={14} height={13} rx={2} fill={SUN} {...st} />
        <Polygon points="-7,-27 7,-27 0,-37" fill={GREEN} {...st} />
        <Polygon points={star(-7, -7, 3.2)} fill={WHITE} />
        <Circle cx={7} cy={-7} r={2.6} fill={WHITE} />
        <Rect x={-2} y={-23} width={4} height={5} rx={1} fill={WHITE} />
      </G>
    ),
  },
  robot: {
    w: 28,
    h: 42,
    draw: () => (
      <G>
        <Line x1={0} y1={-36} x2={0} y2={-41} {...st} />
        <Circle cx={0} cy={-41} r={2.2} fill={CORAL} {...thin} />
        <Rect x={-9} y={-36} width={18} height={13} rx={3} fill="#9AD3C0" {...st} />
        <Circle cx={-4} cy={-29.5} r={2} fill={WHITE} {...thin} />
        <Circle cx={4} cy={-29.5} r={2} fill={WHITE} {...thin} />
        <Rect x={-11} y={-22} width={22} height={16} rx={3} fill="#7FC2AD" {...st} />
        <Path d="M0 -10 Q-4 -13 -4 -15.5 Q-4 -18 -1.8 -18 Q0 -18 0 -16 Q0 -18 1.8 -18 Q4 -18 4 -15.5 Q4 -13 0 -10 Z" fill={PINK} />
        <Rect x={-15} y={-21} width={4} height={10} rx={2} fill="#9AD3C0" {...thin} />
        <Rect x={11} y={-21} width={4} height={10} rx={2} fill="#9AD3C0" {...thin} />
        <Rect x={-8} y={-6} width={5} height={6} rx={1.5} fill="#5FA892" {...thin} />
        <Rect x={3} y={-6} width={5} height={6} rx={1.5} fill="#5FA892" {...thin} />
      </G>
    ),
  },
  car: {
    w: 38,
    h: 22,
    draw: () => (
      <G>
        <Path d="M-17 -6 L-17 -11 Q-16 -14 -12 -14 L-8 -14 L-4 -20 L7 -20 L11 -14 L15 -14 Q18 -14 18 -10 L18 -6 Z" fill={CORAL} {...st} />
        <Polygon points="-3,-18.5 2,-18.5 2,-14 -6,-14" fill="#CDEBFB" {...thin} />
        <Polygon points="4,-18.5 6.5,-18.5 9.5,-14 4,-14" fill="#CDEBFB" {...thin} />
        <Circle cx={-9} cy={-5} r={4.4} fill={OUT} />
        <Circle cx={10} cy={-5} r={4.4} fill={OUT} />
        <Circle cx={-9} cy={-5} r={1.8} fill={WHITE} />
        <Circle cx={10} cy={-5} r={1.8} fill={WHITE} />
        <Circle cx={16} cy={-11} r={1.3} fill={SUN_L} />
      </G>
    ),
  },
  cushion: {
    w: 40,
    h: 20,
    draw: () => (
      <G>
        <Ellipse cx={0} cy={-6} rx={18} ry={5.5} fill="#E8B23A" {...st} />
        <Polygon points={squashedStar(0, -10, 17, 8)} fill={SUN} {...st} />
        <Circle cx={-4} cy={-11} r={1} fill={OUT} />
        <Circle cx={4} cy={-11} r={1} fill={OUT} />
        <Path d="M-2 -8.5 Q0 -7 2 -8.5" fill="none" {...thin} />
      </G>
    ),
  },
};

/** 바닥에 눕힌 별(쿠션) — 세로로 납작한 별. */
function squashedStar(cx: number, cy: number, R: number, ry: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? 1 : 0.5;
    pts.push(`${(cx + R * rad * Math.cos(a)).toFixed(1)},${(cy + ry * rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** 꼬마전구 줄 — 두 점 사이에 처진 줄과 알록달록 전구. */
function FairyLights({ x0, y0, x1, y1, sag, n }: { x0: number; y0: number; x1: number; y1: number; sag: number; n: number }) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 + sag * 2;
  const at = (t: number): [number, number] => [
    (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
    (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1,
  ];
  const colors = [SUN, PINK, SKY, GREEN_L];
  return (
    <G>
      <Path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`} fill="none" stroke={OUT} strokeWidth={0.9} />
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = at((i + 0.5) / n);
        return <Circle key={i} cx={x} cy={y + 1.5} r={1.9} fill={colors[i % colors.length]} stroke={OUT} strokeWidth={0.6} />;
      })}
    </G>
  );
}

/**
 * 업그레이드 모습 — 기본 그림 위에 덧그린다(2단계는 2단계 것, 3단계는 2·3단계 것을 모두).
 * 침대·창문·책상·책장만 단계가 있다.
 */
export function UpgradeOverlay({ code, level }: { code: string; level: number }) {
  if (level < 2) return null;
  const l3 = level >= 3;
  if (code === "bed") {
    return (
      <G>
        <Path d="M-14 -37 Q-14 -42 -9 -42 L37 -42 Q41 -42 41 -37 L41 -15 Q41 -12 38 -12 L-11 -12 Q-14 -12 -14 -15 Z" fill="#9DD5F5" {...st} />
        <Line x1={-13} y1={-34} x2={40} y2={-34} stroke="#7CC4F2" strokeWidth={2.4} />
        <Polygon points={star(2, -23, 4)} fill={SUN} />
        <Polygon points={star(18, -19, 3.4)} fill={SUN} />
        <Polygon points={star(31, -26, 3.6)} fill={SUN} />
        <Path d="M-27 -32 Q-30 -35 -30 -37 Q-30 -39.5 -27.8 -39.5 Q-27 -39.5 -27 -38.4 Q-27 -39.5 -26.2 -39.5 Q-24 -39.5 -24 -37 Q-24 -35 -27 -32 Z" fill={PINK} />
        {l3 && (
          <G>
            <Path d="M-50 -60 Q-42 -46 -36 -40 L-38 -58 Z" fill="#FBD3DD" {...thin} />
            <FairyLights x0={-45} y0={-60} x1={45} y1={-36} sag={7} n={9} />
          </G>
        )}
      </G>
    );
  }
  if (code === "window") {
    return (
      <G>
        <Rect x={-19} y={-15} width={38} height={8} rx={2} fill={CORAL} {...st} />
        {[-12, -4, 4, 12].map((x, i) => (
          <G key={x}>
            <Line x1={x} y1={-15} x2={x} y2={-19} stroke={GREEN_D} strokeWidth={1.4} />
            <Circle cx={x} cy={-20.5} r={2.8} fill={[PINK, SUN, SKY, PINK][i]} {...thin} />
          </G>
        ))}
        {l3 && (
          <G>
            <Path d="M-27 -53 L-10 -53 Q-17 -40 -27 -33 Z" fill={SUN_L} {...st} />
            <Path d="M27 -53 L10 -53 Q17 -40 27 -33 Z" fill={SUN_L} {...st} />
            <Polygon points={star(-21, -45, 2.6)} fill={SUN} />
            <Polygon points={star(21, -45, 2.6)} fill={SUN} />
            <FairyLights x0={-26} y0={-54} x1={26} y1={-54} sag={3} n={7} />
          </G>
        )}
      </G>
    );
  }
  if (code === "desk") {
    return (
      <G>
        <Rect x={-9} y={-56} width={24} height={12} fill={WOOD} />
        <Line x1={3} y1={-44} x2={3} y2={-48} {...st} />
        <Ellipse cx={3} cy={-44.5} rx={5} ry={1.6} fill={WOOD_D} {...thin} />
        <Circle cx={3} cy={-55} r={7} fill={SKY} {...st} />
        <Path d="M-1 -59 Q2 -57 0 -54 Q3 -52 6 -55 Q8 -58 5 -60 Z" fill={GREEN} />
        <Rect x={-28} y={-22} width={22} height={5} rx={2} fill={CORAL} {...st} />
        <Line x1={-25} y1={-17} x2={-25} y2={0} stroke={OUT} strokeWidth={2.2} strokeLinecap="round" />
        <Line x1={-9} y1={-17} x2={-9} y2={0} stroke={OUT} strokeWidth={2.2} strokeLinecap="round" />
        {l3 && (
          <G>
            <Rect x={19} y={-56} width={14} height={12} fill={WOOD} />
            <Path d="M21 -58 L31 -58 Q31 -51 26 -50 Q21 -51 21 -58 Z" fill={SUN} {...st} />
            <Line x1={26} y1={-50} x2={26} y2={-47} {...st} />
            <Rect x={22} y={-47} width={8} height={3} rx={1} fill={WOOD_D} {...thin} />
            <Polygon points={star(26, -55, 2)} fill={WHITE} />
          </G>
        )}
      </G>
    );
  }
  if (code === "shelf") {
    return (
      <G>
        <Rect x={-18} y={-30} width={36} height={24} rx={2} fill="#C98A4E" />
        <Rect x={-16} y={-27} width={6} height={21} fill={SKY} {...thin} />
        <Rect x={-10} y={-25} width={5} height={19} fill={SUN} {...thin} />
        <Rect x={-5} y={-28} width={6} height={22} fill={PINK} {...thin} />
        <Rect x={1} y={-26} width={5} height={20} fill={GREEN} {...thin} />
        <Polygon points="7,-26 12,-27 16,-8 11,-7" fill={CORAL} {...thin} />
        {l3 && (
          <G>
            <Path d="M-6 -113 L6 -113 Q6 -105 0 -104 Q-6 -105 -6 -113 Z" fill={SUN} {...st} />
            <Rect x={-4} y={-104} width={8} height={4} rx={1} fill={WOOD_D} {...thin} />
            <FairyLights x0={-22} y0={-96} x1={22} y1={-96} sag={4} n={6} />
            <FairyLights x0={-22} y0={-64} x1={22} y1={-64} sag={4} n={6} />
          </G>
        )}
      </G>
    );
  }
  return null;
}

const FLAG_COLORS = [CORAL, SUN, GREEN, SKY, PINK];

/** 줄에 걸린 세모 깃발. 줄은 양 끝(x0, x1)이 y0이고 가운데가 sag만큼 처진 2차 곡선. */
export function Garland({ x0, x1, y0, sag, flags }: { x0: number; x1: number; y0: number; sag: number; flags: number }) {
  const cx = (x0 + x1) / 2;
  const cy = y0 + sag * 2; // 2차 베지어의 조절점 — 곡선 가운데가 y0 + sag가 된다
  const at = (t: number): [number, number] => [
    (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
    (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y0,
  ];
  const items: React.ReactElement[] = [];
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags;
    const [fx, fy] = at(t);
    items.push(
      <Polygon
        key={i}
        points={`${(fx - 4.5).toFixed(1)},${(fy - 0.5).toFixed(1)} ${(fx + 4.5).toFixed(1)},${(fy + 0.5).toFixed(1)} ${fx.toFixed(1)},${(fy + 9).toFixed(1)}`}
        fill={FLAG_COLORS[i % FLAG_COLORS.length]}
        {...thin}
      />,
    );
  }
  return (
    <G>
      <Path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y0}`} fill="none" stroke={OUT} strokeWidth={1.2} />
      {items}
    </G>
  );
}

/** 벽지 — 뒷벽 색·옆벽 색·천장 색과 무늬. */
export const WALLS: Record<string, { back: string; side: string; ceil: string; pattern: "cloud" | "stripe" | "dot"; accent: string }> = {
  wall_sky: { back: "#DCEFFD", side: "#C7E4FA", ceil: "#B3D8F4", pattern: "cloud", accent: WHITE },
  wall_mint: { back: "#E2F6EA", side: "#C9EBD5", ceil: "#B2E0C2", pattern: "stripe", accent: "#CDEED9" },
  wall_cream: { back: "#FFF4D9", side: "#F8E6BC", ceil: "#F0D7A0", pattern: "dot", accent: "#F9D98F" },
};

/** 바닥 — 마루(판자 줄) 또는 체크 타일. */
export const FLOORS: Record<string, { a: string; b: string; line: string; kind: "plank" | "check" }> = {
  floor_beige: { a: "#F6E2BC", b: "#F6E2BC", line: "#DEC08C", kind: "plank" },
  floor_wood: { a: "#C98E58", b: "#C98E58", line: "#A87040", kind: "plank" },
  floor_check: { a: "#FFF8E8", b: "#BFE6CD", line: "#A9D9BB", kind: "check" },
};

/** 벽지 무늬를 (x, y, w, h) 사각형 안에 그린다. */
export function WallPattern({ wall, x, y, w, h }: { wall: string; x: number; y: number; w: number; h: number }) {
  const spec = WALLS[wall] ?? WALLS.wall_sky;
  const out: React.ReactElement[] = [];
  if (spec.pattern === "stripe") {
    for (let sx = x + 6; sx + 9 <= x + w; sx += 20) {
      out.push(<Rect key={sx} x={sx} y={y} width={9} height={h} fill={spec.accent} />);
    }
  } else if (spec.pattern === "dot") {
    let row = 0;
    for (let dy = y + 12; dy < y + h - 4; dy += 18, row++) {
      for (let dx = x + 10 + (row % 2) * 9; dx < x + w - 4; dx += 18) {
        out.push(<Circle key={`${dx}-${dy}`} cx={dx} cy={dy} r={2.6} fill={spec.accent} />);
      }
    }
  } else {
    let row = 0;
    for (let cy = y + 22; cy < y + h - 6; cy += 38, row++) {
      for (let cx = x + 24 + (row % 2) * 34; cx < x + w - 12; cx += 68) {
        out.push(<Cloud key={`${cx}-${cy}`} x={cx} y={cy} s={0.85} fill={spec.accent} />);
      }
    }
  }
  return <G opacity={0.9}>{out}</G>;
}

/** 견본 칸의 둥근 모서리 밖으로 무늬가 삐져나오지 않게 자른다. */
function ThumbClip({ id }: { id: string }) {
  return (
    <Defs>
      <ClipPath id={`thumb-${id}`}>
        <Rect x={2} y={2} width={56} height={56} rx={10} />
      </ClipPath>
    </Defs>
  );
}

/** 썸네일 — 선물·러그는 그 그림, 벽지·바닥은 작은 견본. */
export function ArtThumb({ glyph, size, level = 1 }: { glyph: string; size: number; level?: number }) {
  const art = ITEM_ART[glyph];
  if (art && art.w > art.h * 3) {
    // 러그처럼 납작한 그림은 작은 칸에서 실선처럼 보여서 위아래로 늘려 보여 준다.
    const s = art.w + 10;
    return (
      <Svg width={size} height={size} viewBox={`${-s / 2} ${-art.h - s / 2 + 4} ${s} ${s}`}>
        <G transform="scale(1, 2)">{art.draw()}</G>
      </Svg>
    );
  }
  if (art) {
    const s = Math.max(art.w, art.h) + 10;
    return (
      <Svg width={size} height={size} viewBox={`${-s / 2} ${-art.h / 2 - s / 2} ${s} ${s}`}>
        {art.draw()}
        <UpgradeOverlay code={glyph} level={level} />
      </Svg>
    );
  }
  if (WALLS[glyph]) {
    const spec = WALLS[glyph];
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <ThumbClip id={glyph} />
        <G clipPath={`url(#thumb-${glyph})`}>
          <Rect x={2} y={2} width={56} height={56} fill={spec.back} />
          <WallPattern wall={glyph} x={4} y={4} w={52} h={38} />
          <Rect x={2} y={42} width={56} height={4} fill={WHITE} />
          <Rect x={2} y={46} width={56} height={12} fill="#F6E2BC" />
        </G>
        <Rect x={2} y={2} width={56} height={56} rx={10} fill="none" {...st} />
      </Svg>
    );
  }
  const fl = FLOORS[glyph];
  if (fl) {
    const cells: React.ReactElement[] = [];
    if (fl.kind === "check") {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          cells.push(<Rect key={`${i}-${j}`} x={2 + i * 14} y={2 + j * 14} width={14} height={14} fill={(i + j) % 2 ? fl.b : fl.a} />);
        }
      }
    } else {
      for (let i = 1; i < 5; i++) {
        cells.push(<Line key={`l${i}`} x1={2 + i * 11.2} y1={2} x2={2 + i * 11.2} y2={58} stroke={fl.line} strokeWidth={1.4} />);
        const jy = [18, 40, 28, 48][i % 4];
        cells.push(<Line key={`j${i}`} x1={2 + (i - 1) * 11.2} y1={jy} x2={2 + i * 11.2} y2={jy} stroke={fl.line} strokeWidth={1.4} />);
      }
    }
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <ThumbClip id={glyph} />
        <G clipPath={`url(#thumb-${glyph})`}>
          <Rect x={2} y={2} width={56} height={56} fill={fl.a} />
          {cells}
        </G>
        <Rect x={2} y={2} width={56} height={56} rx={10} fill="none" {...st} />
      </Svg>
    );
  }
  return <Svg width={size} height={size} />;
}

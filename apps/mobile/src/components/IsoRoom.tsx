import React, { useMemo } from "react";
import Svg, { Ellipse, G, Image as SvgImage, Polygon, Text as SvgText } from "react-native-svg";
import { FLOORS, IMGD, ROOM_IMAGES, WALLS, catImage } from "../lib/roomAssets";

/**
 * 아이의 방 — moa 마이룸의 아이소메트릭 씬(`IsoRoom.tsx`)을 react-native-svg로 옮겼다.
 *
 * 한 장의 SVG에 뒤에서 앞으로(x+y가 커지는 순서) 그리기만 하면 겹침 순서가 저절로 맞는다 —
 * 평면 그림으로 하면 물건이 늘 때 침대 위에 러그가 깔린다(moa에서 겪은 문제).
 * 좌표: 바닥 6×6 격자, `iso(x, y, z)`가 격자 좌표를 화면 좌표로 옮긴다. 좌표·크기는 moa 값 그대로.
 *
 * moa와 다른 점: 방에 놓이는 물건이 고정이 아니라 **아이가 챙긴 날마다 모은 것**이고,
 * moa가 아직 못 그리던 벽지·바닥이 실제로 바뀐다.
 */
export type CatAct = "nap" | "read" | "rug" | "sofa";

export const CAT_ACT_LABEL: Record<CatAct, string> = {
  nap: "침대에서 낮잠 자는 중",
  read: "책장 앞에서 책 읽는 중",
  rug: "러그에서 햇살 쬐는 중",
  sofa: "소파에서 뒹굴거리는 중",
};

const T = 26;
const OX = 163;
const OY = 116;
const iso = (x: number, y: number, z: number): [number, number] => [OX + (x - y) * T, OY + ((x + y) * T) / 2 - z];
const P = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");
const WH = 96;

const ACT_POS: Record<CatAct, { p: [number, number]; pose: string; floating: boolean }> = {
  nap: { p: iso(0.9, 4.2, 18), pose: "catnap", floating: true },
  read: { p: iso(4.55, 1.65, 0), pose: "catread", floating: false },
  rug: { p: iso(2.8, 3.25, 3), pose: "catsit", floating: false },
  sofa: { p: iso(3.12, 0.92, 19), pose: "catlounge", floating: true },
};

const RUG_SLOT = { x: 3.3, y: 3.35, w: 2.7, d: 2.7 };

function Shadow({ rx, ry }: { rx: number; ry?: number }) {
  return <Ellipse cx={0} cy={1} rx={rx} ry={ry ?? Math.round(rx * 0.38)} fill="rgba(30,45,70,0.12)" />;
}

function Asset({ k, dy = 0 }: { k: string; dy?: number }) {
  const [w, h] = IMGD[k];
  return (
    <SvgImage
      href={ROOM_IMAGES[k]}
      x={-w / 2}
      y={-h + dy}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMax meet"
    />
  );
}

function At({
  x,
  y,
  z = 0,
  onPress,
  children,
}: {
  x: number;
  y: number;
  z?: number;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const [cx, cy] = iso(x, y, z);
  return (
    <G x={cx} y={cy} onPress={onPress}>
      {children}
    </G>
  );
}

export default function IsoRoom({
  width,
  visible,
  rug,
  wall,
  floor,
  catSkin,
  act,
  editing,
  onPick,
  onRugSlot,
}: {
  width: number;
  /** 방에 보이는 모은 물건 코드(가졌고 치우지 않은 것). */
  visible: Set<string>;
  rug: string;
  wall: string;
  floor: string;
  catSkin: string;
  act: CatAct;
  editing: boolean;
  onPick: (key: string) => void;
  onRugSlot: () => void;
}) {
  const fl = FLOORS[floor] ?? FLOORS.floor_beige;
  const wl = WALLS[wall] ?? WALLS.wall_sky;

  const floorTiles = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 6; y++) {
        out.push(
          <Polygon
            key={`${x}-${y}`}
            points={P([iso(x, y, 0), iso(x + 1, y, 0), iso(x + 1, y + 1, 0), iso(x, y + 1, 0)])}
            fill={(x + y) % 2 ? fl.b : fl.a}
            stroke={fl.stroke}
            strokeWidth={0.6}
          />,
        );
      }
    }
    return out;
  }, [fl]);

  const has = (code: string) => visible.has(code);
  const a = ACT_POS[act] ?? ACT_POS.rug;
  const height = (width * 308) / 327;

  return (
    <Svg width={width} height={height} viewBox="0 0 327 308">
      {floorTiles}

      {/* 바닥 두께 — 방이 종이가 아니라 상자로 보이게 한다 */}
      <Polygon points={P([iso(0, 6, 0), iso(6, 6, 0), iso(6, 6, -12), iso(0, 6, -12)])} fill={fl.front} />
      <Polygon points={P([iso(6, 6, 0), iso(6, 0, 0), iso(6, 0, -12), iso(6, 6, -12)])} fill={fl.right} />

      {/* 벽 두 면 + 창문 */}
      <Polygon points={P([iso(0, 0, WH), iso(6, 0, WH), iso(6, 0, 0), iso(0, 0, 0)])} fill={wl.back} />
      <Polygon points={P([iso(0, 0, WH), iso(0, 6, WH), iso(0, 6, 0), iso(0, 0, 0)])} fill={wl.side} />
      <Polygon
        points={P([iso(2.1, 0, 78), iso(3.9, 0, 78), iso(3.9, 0, 36), iso(2.1, 0, 36)])}
        fill="#BBDDF9"
        stroke="#FFFFFF"
        strokeWidth={3}
      />

      {/* ── 물건: 뒤에서 앞으로(x+y 오름차순) ── */}
      {has("lamp") && (
        <At x={0.9} y={0.4} onPress={() => onPick("lamp")}>
          <Shadow rx={13} />
          <Asset k="lamp" />
        </At>
      )}
      {has("frame") && (
        <At x={0} y={2.2} z={40} onPress={() => onPick("frame")}>
          <Asset k="frame" />
        </At>
      )}
      {has("sofa") && (
        <At x={3.15} y={0.85} onPress={() => onPick("sofa")}>
          <Shadow rx={31} ry={10} />
          <Asset k="sofa" />
        </At>
      )}
      {has("shelf") && (
        <At x={5.15} y={0.55} onPress={() => onPick("shelf")}>
          <Shadow rx={21} ry={7} />
          <Asset k="shelf" />
        </At>
      )}
      {has("table") && (
        <At x={0.6} y={2.5} onPress={() => onPick("table")}>
          <Shadow rx={19} />
          <Asset k="table" />
        </At>
      )}
      {/* 무드등 — 테이블이 있으면 그 위에, 없으면 바닥에 */}
      {has("mood") && (
        <At x={0.6} y={2.5} z={has("table") ? 25 : 0} onPress={() => onPick("mood")}>
          <Asset k="mood" />
        </At>
      )}

      <At x={3.3} y={3.35} onPress={editing ? onRugSlot : () => onPick(rug)}>
        <Asset k={rug} dy={Math.round(IMGD[rug][1] * 0.52)} />
      </At>

      {has("bowl") && (
        <At x={3.95} y={3.5} onPress={() => onPick("bowl")}>
          <Shadow rx={12} />
          <Asset k="bowl" />
        </At>
      )}

      <At x={0.85} y={4.3} z={-3} onPress={() => onPick("bed")}>
        <Shadow rx={42} ry={14} />
        <Asset k="bed" />
      </At>

      {has("yarn") && (
        <At x={3.05} y={4.35} onPress={() => onPick("yarn")}>
          <Shadow rx={8} />
          <Asset k="yarn" />
        </At>
      )}
      {has("plant") && (
        <At x={2.35} y={5.3} onPress={() => onPick("plant")}>
          <Shadow rx={14} />
          <Asset k="plant" />
        </At>
      )}

      {/* 냥이 */}
      <G x={a.p[0]} y={a.p[1]} onPress={() => onPick("cat")}>
        {!a.floating && <Ellipse cx={0} cy={2} rx={17} ry={5} fill="rgba(30,45,70,0.13)" />}
        <SvgImage
          href={catImage(a.pose, catSkin)}
          x={-IMGD[a.pose][0] / 2}
          y={-IMGD[a.pose][1]}
          width={IMGD[a.pose][0]}
          height={IMGD[a.pose][1]}
          preserveAspectRatio="xMidYMax meet"
        />
        {act === "nap" && (
          <SvgText x={12} y={-26} fontSize={9} fontWeight="bold" fill="#7A8FB8">
            z z
          </SvgText>
        )}
      </G>

      {/* 꾸미기 모드 — 바꿀 수 있는 자리(러그)를 점선으로 */}
      {editing && (
        <Polygon
          points={P([
            iso(RUG_SLOT.x - RUG_SLOT.w / 2, RUG_SLOT.y - RUG_SLOT.d / 2, 1),
            iso(RUG_SLOT.x + RUG_SLOT.w / 2, RUG_SLOT.y - RUG_SLOT.d / 2, 1),
            iso(RUG_SLOT.x + RUG_SLOT.w / 2, RUG_SLOT.y + RUG_SLOT.d / 2, 1),
            iso(RUG_SLOT.x - RUG_SLOT.w / 2, RUG_SLOT.y + RUG_SLOT.d / 2, 1),
          ])}
          fill="rgba(19,133,74,0.12)"
          stroke="#13854A"
          strokeWidth={1.6}
          strokeDasharray="6 5"
          onPress={onRugSlot}
        />
      )}
    </Svg>
  );
}

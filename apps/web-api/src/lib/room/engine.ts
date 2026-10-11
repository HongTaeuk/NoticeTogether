import { COLLECTIBLES, DEFAULT_SELECTION, type Collectible, type Grade } from "./catalog";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 서버(UTC)에서도 한국 날짜로 자른다. */
export function kstDate(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(ymd: string, n: number): string {
  return new Date(new Date(`${ymd}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/** 연속 기록이 길수록 희귀·에픽이 잘 나온다(moa GuardianRules와 같은 표). */
function weightsFor(streak: number): Record<Grade, number> {
  if (streak >= 7) return { COMMON: 0.5, RARE: 0.38, EPIC: 0.12 };
  if (streak >= 3) return { COMMON: 0.6, RARE: 0.32, EPIC: 0.08 };
  return { COMMON: 0.7, RARE: 0.25, EPIC: 0.05 };
}

// 같은 날을 다시 계산하면 같은 물건이 나와야 한다(moa 원칙: 추첨은 결정론). Math.random을 쓰지 않는다.
function seededRandom(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Grant = { code: string; date: string; streak: number };

/**
 * 챙긴 날마다 물건 하나. 뽑힌 등급을 다 모았으면 다른 등급으로 대신 준다(빈손으로 돌려보내지 않는다).
 * 전부 모았으면 더 주지 않는다.
 */
export function computeGrants(userId: string, keptDays: string[]): Grant[] {
  const owned = new Set<string>();
  const grants: Grant[] = [];
  let streak = 0;
  let prev: string | null = null;
  for (const day of keptDays) {
    streak = prev && addDays(prev, 1) === day ? streak + 1 : 1;
    prev = day;
    if (owned.size >= COLLECTIBLES.length) continue;

    const rng = seededRandom(`${userId}:${day}`);
    const w = weightsFor(streak);
    const roll = rng();
    const drawn: Grade = roll < w.COMMON ? "COMMON" : roll < w.COMMON + w.RARE ? "RARE" : "EPIC";
    const order: Grade[] = [drawn, ...(["EPIC", "RARE", "COMMON"] as Grade[]).filter((g) => g !== drawn)];
    let picked: Collectible | null = null;
    for (const g of order) {
      const candidates = COLLECTIBLES.filter((c) => c.grade === g && !owned.has(c.code));
      if (candidates.length > 0) {
        picked = candidates[Math.floor(rng() * candidates.length)];
        break;
      }
    }
    if (!picked) continue;
    owned.add(picked.code);
    grants.push({ code: picked.code, date: day, streak });
  }
  return grants;
}

/** 오늘(또는 아직 오늘을 안 챙겼으면 어제)까지 이어진 연속 챙긴 날. */
export function currentStreak(keptDays: string[], today: string): number {
  const set = new Set(keptDays);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export type RoomState = {
  spent: number;
  owned: string[];
  rug: string;
  wall: string;
  floor: string;
  catSkin: string;
  hidden: string[];
  ceremonySeen: string | null;
};

/** DB의 jsonb는 아이 기기가 보낸 값이 섞일 수 있어서, 읽을 때마다 모양을 바로잡는다. */
export function normalizeState(raw: unknown): RoomState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<RoomState>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    spent: typeof s.spent === "number" && s.spent >= 0 ? Math.floor(s.spent) : 0,
    owned: strings(s.owned),
    rug: typeof s.rug === "string" ? s.rug : DEFAULT_SELECTION.rug,
    wall: typeof s.wall === "string" ? s.wall : DEFAULT_SELECTION.wall,
    floor: typeof s.floor === "string" ? s.floor : DEFAULT_SELECTION.floor,
    catSkin: typeof s.catSkin === "string" ? s.catSkin : DEFAULT_SELECTION.catSkin,
    hidden: strings(s.hidden),
    ceremonySeen: typeof s.ceremonySeen === "string" ? s.ceremonySeen : null,
  };
}

import { COLLECTIBLES, DECOR, DEFAULT_SELECTION, type Collectible, type Decor, type Grade } from "./catalog";

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
 * 선물은 오래 써야 모인다 — 준비한 날이 누적으로 이만큼 될 때마다 하나씩 온다. 간격이 점점 넓어져서
 * 일주일에 3~4번 준비하면 9개를 다 모으는 데 4~5개월(한 학기 남짓)이 걸린다.
 */
export const GIFT_MILESTONES = [3, 7, 12, 18, 25, 33, 42, 52, 63];

/** 다음 선물까지 몇 번 더 준비해야 하는지. 다 모았으면 null. */
export function daysToNextGift(keptCount: number): number | null {
  const next = GIFT_MILESTONES.find((m) => m > keptCount);
  return next === undefined ? null : next - keptCount;
}

/**
 * 준비한 날이 마일스톤에 닿는 날마다 선물 하나. 그날의 연속 기록으로 등급을 뽑고(연속일수록 희귀·전설↑),
 * 뽑힌 등급을 다 모았으면 다른 등급으로 대신 준다(빈손으로 돌려보내지 않는다).
 */
export function computeGrants(userId: string, keptDays: string[]): Grant[] {
  const owned = new Set<string>();
  const grants: Grant[] = [];
  const milestones = new Set(GIFT_MILESTONES);
  let streak = 0;
  let prev: string | null = null;
  for (const [index, day] of keptDays.entries()) {
    streak = prev && addDays(prev, 1) === day ? streak + 1 : 1;
    prev = day;
    if (!milestones.has(index + 1) || owned.size >= COLLECTIBLES.length) continue;

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
  hidden: string[];
  ceremonySeen: string | null;
  /** 업그레이드 단계(없으면 1). */
  levels: Record<string, number>;
  /** 매일 첫 접속 선물을 마지막으로 받은 날(한국 날짜). */
  dailySeen: string | null;
  /** 매일 선물로 받은 별 합계. */
  dailyStars: number;
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
    hidden: strings(s.hidden),
    ceremonySeen: typeof s.ceremonySeen === "string" ? s.ceremonySeen : null,
    levels: Object.fromEntries(
      Object.entries(s.levels && typeof s.levels === "object" ? s.levels : {}).filter(
        (e): e is [string, number] => typeof e[1] === "number" && e[1] >= 1 && e[1] <= 3,
      ),
    ),
    dailySeen: typeof s.dailySeen === "string" ? s.dailySeen : null,
    dailyStars: typeof s.dailyStars === "number" && s.dailyStars >= 0 ? Math.floor(s.dailyStars) : 0,
  };
}

export type DailyGift = { kind: "stars"; amount: number } | { kind: "item"; code: string; name: string; glyph: string };

/**
 * 오늘의 첫 접속 선물 — 같은 아이·같은 날이면 늘 같은 결과(결정론). 대부분 별 1~3개, 가끔(30%) 아직 없는 작은 장난감.
 */
export function dailyGiftFor(userId: string, today: string, owned: string[]): DailyGift {
  const rng = seededRandom(`${userId}:daily:${today}`);
  const roll = rng();
  const left: Decor[] = DECOR.filter((d) => !owned.includes(d.code));
  if (roll < 0.3 && left.length > 0) {
    const d = left[Math.floor(rng() * left.length)];
    return { kind: "item", code: d.code, name: d.name, glyph: d.glyph };
  }
  return { kind: "stars", amount: 1 + Math.floor(rng() * 3) };
}

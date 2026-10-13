import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { MIGRATION_REQUIRED_MESSAGE } from "@/lib/household/members";
import { COLLECTIBLES, DECOR, findShopItem } from "@/lib/room/catalog";
import type { RoomState } from "@/lib/room/engine";
import { loadRoomContext, saveRoomState } from "@/lib/room/load";
import { isOwned, roomPayload } from "@/lib/room/payload";

async function resolve(req: NextRequest) {
  try {
    return await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

/** 아이의 방 전체 — 별, 챙긴 날, 모은 물건, 도감, 상점, 고른 꾸미기, 새로 도착한 물건(세리머니). */
export async function GET(req: NextRequest) {
  const resolved = await resolve(req);
  if (resolved instanceof NextResponse) return resolved;
  const ctx = await loadRoomContext(getSupabaseServerClient(), resolved);
  return NextResponse.json(roomPayload(ctx));
}

type PatchBody = {
  rug?: string;
  wall?: string;
  floor?: string;
  hidden?: string[];
  ceremonySeen?: string;
};

/** 꾸미기 선택·치워 둔 물건·세리머니를 본 날짜를 바꾼다. 안 가진 것은 고를 수 없다. */
export async function PATCH(req: NextRequest) {
  const resolved = await resolve(req);
  if (resolved instanceof NextResponse) return resolved;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const ctx = await loadRoomContext(supabase, resolved);
  if (ctx.needsMigration) {
    return NextResponse.json({ error: MIGRATION_REQUIRED_MESSAGE, needsMigration: true }, { status: 503 });
  }
  const next: RoomState = { ...ctx.state };

  const pick = (key: "rug" | "wall" | "floor", category: string) => {
    const code = body[key];
    if (code === undefined) return null;
    const item = findShopItem(code);
    if (!item || item.category !== category) return `알 수 없는 ${category}예요.`;
    if (!isOwned(next, code)) return "아직 갖고 있지 않아요. 별 상점에서 먼저 데려와요.";
    next[key] = code;
    return null;
  };
  for (const [key, category] of [
    ["rug", "rug"],
    ["wall", "wall"],
    ["floor", "floor"],
  ] as const) {
    const problem = pick(key, category);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  if (body.hidden !== undefined) {
    const valid = new Set([...COLLECTIBLES.map((c) => c.code), ...DECOR.map((d) => d.code)]);
    next.hidden = [...new Set(body.hidden.filter((c) => valid.has(c)))];
  }
  if (typeof body.ceremonySeen === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.ceremonySeen)) {
    next.ceremonySeen = body.ceremonySeen;
  }

  await saveRoomState(supabase, resolved.userId, next);
  return NextResponse.json(roomPayload({ ...ctx, state: next }));
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedUser } from "@/lib/auth/session";
import { isMissingMigrationError } from "@/lib/household/members";
import { COLLECTIBLES } from "./catalog";
import { computeGrants, kstDate, normalizeState, type Grant, type RoomState } from "./engine";

export type RoomContext = {
  keptDays: string[];
  checkedItems: number;
  stickersReceived: number;
  bonusStars: number;
  earned: number;
  state: RoomState;
  grants: Grant[];
  /** 0005 마이그레이션 전이면 true — 상태 저장이 안 되므로 꾸미기·상점을 막는다. */
  needsMigration: boolean;
};

/**
 * 아이의 방에 필요한 사실을 모은다.
 * - 별(earned) = 내가 체크한 항목 수(항목마다 한 번) + 가족이 보낸 칭찬 스티커 수
 * - 챙긴 날 = 항목마다 **처음** 체크한 날(한국 날짜). 같은 항목을 껐다 켜서 날을 늘리지 못하게 한다.
 * - 모은 물건 = 챙긴 날에서 매번 같은 결과로 다시 계산(저장하지 않는다)
 */
export async function loadRoomContext(supabase: SupabaseClient, resolved: ResolvedUser): Promise<RoomContext> {
  const { data: notices } = await supabase.from("notices").select("id").eq("household_id", resolved.householdId);
  const noticeIds = (notices ?? []).map((n) => n.id as string);

  const firstCheck = new Map<string, string>();
  if (noticeIds.length > 0) {
    const { data: items } = await supabase.from("checklist_items").select("id").in("notice_id", noticeIds);
    const itemIds = (items ?? []).map((i) => i.id as string);
    if (itemIds.length > 0) {
      const { data: actions } = await supabase
        .from("item_actions")
        .select("checklist_item_id, created_at")
        .eq("user_id", resolved.userId)
        .eq("action", "checked")
        .in("checklist_item_id", itemIds)
        .order("created_at", { ascending: true });
      for (const a of actions ?? []) {
        const id = a.checklist_item_id as string;
        if (!firstCheck.has(id)) firstCheck.set(id, a.created_at as string);
      }
    }
  }
  const keptDays = [...new Set([...firstCheck.values()].map((t) => kstDate(t)))].sort();

  const { count: stickerCount, error: stickerError } = await supabase
    .from("family_messages")
    .select("id", { count: "exact", head: true })
    .eq("household_id", resolved.householdId)
    .eq("kind", "sticker")
    .neq("user_id", resolved.userId);
  const stickersReceived = stickerError ? 0 : stickerCount ?? 0;

  let needsMigration = false;
  let rawState: unknown = {};
  const { data: roomRow, error: roomError } = await supabase
    .from("child_rooms")
    .select("state")
    .eq("user_id", resolved.userId)
    .maybeSingle();
  if (roomError) {
    if (!isMissingMigrationError(roomError)) throw new Error(roomError.message);
    needsMigration = true;
  } else if (roomRow) {
    rawState = roomRow.state;
  }

  const grants = computeGrants(resolved.userId, keptDays);
  // 선물을 다 모은 뒤에도 준비한 날은 보람이 있어야 한다 — 마지막 선물 이후 준비한 날마다 별 +1.
  const lastGrantIndex = grants.length === COLLECTIBLES.length ? keptDays.indexOf(grants[grants.length - 1].date) : -1;
  const bonusStars = lastGrantIndex >= 0 ? keptDays.length - 1 - lastGrantIndex : 0;

  return {
    keptDays,
    checkedItems: firstCheck.size,
    stickersReceived,
    bonusStars,
    earned: firstCheck.size + stickersReceived + bonusStars,
    state: normalizeState(rawState),
    grants,
    needsMigration,
  };
}

export async function saveRoomState(supabase: SupabaseClient, userId: string, state: RoomState): Promise<void> {
  const { error } = await supabase
    .from("child_rooms")
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}

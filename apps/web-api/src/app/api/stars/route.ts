import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";

/**
 * 아이의 "내 방"에서 쓰는 별. 별 = 내가 직접 챙겨서 체크한 항목 수(같은 항목은 한 번만) +
 * 가족이 보내준 칭찬 스티커 수. 체크를 껐다 켜도 늘지 않게 항목 단위로 센다.
 * 가족 이야기(0004)가 아직 없는 DB면 스티커는 0으로 센다.
 */
export async function GET(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const supabase = getSupabaseServerClient();

  const { data: notices } = await supabase.from("notices").select("id").eq("household_id", resolved.householdId);
  const noticeIds = (notices ?? []).map((n) => n.id as string);

  let checkedItems = 0;
  if (noticeIds.length > 0) {
    const { data: items } = await supabase.from("checklist_items").select("id").in("notice_id", noticeIds);
    const itemIds = (items ?? []).map((i) => i.id as string);
    if (itemIds.length > 0) {
      const { data: actions } = await supabase
        .from("item_actions")
        .select("checklist_item_id")
        .eq("user_id", resolved.userId)
        .eq("action", "checked")
        .in("checklist_item_id", itemIds);
      checkedItems = new Set((actions ?? []).map((a) => a.checklist_item_id as string)).size;
    }
  }

  const { count: stickerCount, error: stickerError } = await supabase
    .from("family_messages")
    .select("id", { count: "exact", head: true })
    .eq("household_id", resolved.householdId)
    .eq("kind", "sticker")
    .neq("user_id", resolved.userId);
  const stickersReceived = stickerError ? 0 : stickerCount ?? 0;

  return NextResponse.json({ stars: checkedItems + stickersReceived, checkedItems, stickersReceived });
}

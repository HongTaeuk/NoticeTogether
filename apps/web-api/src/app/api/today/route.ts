import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

const URGENT_WINDOW_DAYS = 2; // PRD 4-2: "지금 해야 할 것" = 기한이 임박한 항목만

/**
 * PRD 4-2/4-5의 "오늘 할 일"(홈) 화면 전용 집계 엔드포인트.
 * 지금까지는 알림 하나하나를 따로 열어야만 체크리스트를 볼 수 있었고, 여러 알림에
 * 걸쳐 "지금 당장 뭘 해야 하는지"를 한눈에 모아 보여주는 화면 자체가 없었다.
 */
export async function GET(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req, req.nextUrl.searchParams.get("as") as DevRole | null);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { householdId, userId } = resolved;
  const supabase = getSupabaseServerClient();

  // 해결검토 1번(다자녀 가정): 각 항목이 어느 자녀 것인지 화면에서 구분/필터링할 수
  // 있도록 notice별 child_id/이름을 같이 내려준다.
  const { data: notices, error: noticesError } = await supabase
    .from("notices")
    .select("id, child_id, children(name)")
    .eq("household_id", householdId);
  if (noticesError) {
    return NextResponse.json({ error: noticesError.message }, { status: 500 });
  }
  const noticeIds = (notices ?? []).map((n) => n.id as string);
  const childByNoticeId = new Map(
    (notices ?? []).map((n) => [
      n.id as string,
      {
        childId: n.child_id as string | null,
        childName: (n.children as unknown as { name: string } | null)?.name ?? null,
      },
    ]),
  );

  if (noticeIds.length === 0) {
    return NextResponse.json({
      urgentItems: [],
      allItems: [],
      recentPartnerAction: null,
      totalItems: 0,
      doneItems: 0,
      children: [],
    });
  }

  const { data: items, error: itemsError } = await supabase
    .from("checklist_items")
    .select("id, notice_id, title, category, due_date, is_done")
    .in("notice_id", noticeIds)
    .order("due_date", { ascending: true });
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }
  const allItems = (items ?? []).map((i) => ({
    ...i,
    ...(childByNoticeId.get(i.notice_id as string) ?? { childId: null, childName: null }),
  }));

  const { data: householdChildren } = await supabase
    .from("children")
    .select("id, name")
    .eq("household_id", householdId);

  const todayStr = new Date().toISOString().slice(0, 10);
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + URGENT_WINDOW_DAYS);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);

  const urgentItems = allItems.filter(
    (i) => !i.is_done && i.due_date && i.due_date >= todayStr && i.due_date <= windowEndStr,
  );

  // PRD "OO(배우자)가 뭐 했지?": 나 아닌 다른 가구 구성원이 가장 최근에 남긴 조치 한 줄.
  const itemIds = allItems.map((i) => i.id as string);
  let recentPartnerAction = null;
  if (itemIds.length > 0) {
    const { data: recentActions } = await supabase
      .from("item_actions")
      .select("id, checklist_item_id, user_id, action, note, created_at")
      .in("checklist_item_id", itemIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const action = recentActions?.[0];
    if (action) {
      const { data: actor } = await supabase
        .from("users")
        .select("display_name, role")
        .eq("id", action.user_id)
        .maybeSingle();
      const item = allItems.find((i) => i.id === action.checklist_item_id);
      recentPartnerAction = {
        displayName: actor?.display_name ?? (actor?.role === "primary" ? "보호자 1" : "보호자 2"),
        action: action.action,
        note: action.note,
        itemTitle: item?.title ?? null,
        createdAt: action.created_at,
      };
    }
  }

  return NextResponse.json({
    urgentItems,
    allItems,
    recentPartnerAction,
    totalItems: allItems.length,
    doneItems: allItems.filter((i) => i.is_done).length,
    children: householdChildren ?? [],
  });
}

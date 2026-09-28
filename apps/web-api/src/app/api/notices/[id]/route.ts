import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveUser, AuthError } from "@/lib/auth/session";
import type { DevRole } from "@/lib/supabase/devSeed";

// Pull 기반 동기화(PRD FR-2): 앱이 열릴 때마다 이 엔드포인트를 다시 호출해서
// 상대 보호자가 그 사이 체크/메모한 내용을 가져온다. 실시간 push는 쓰지 않는다.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let resolved;
  try {
    resolved = await resolveUser(req, req.nextUrl.searchParams.get("as") as DevRole | null);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const supabase = getSupabaseServerClient();

  let { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select("id, raw_text, ai_summary, easy_explanations, created_at, household_id, child_id, children(name)")
    .eq("id", id)
    .single();

  // 0003 마이그레이션(easy_explanations)이 아직 안 된 배포 환경에서도 알림 상세
  // 조회 자체는 항상 되게 하는 폴백 — POST /api/notices와 같은 이유.
  if (noticeError?.message?.includes("schema cache")) {
    const fallback = await supabase
      .from("notices")
      .select("id, raw_text, ai_summary, created_at, household_id, child_id, children(name)")
      .eq("id", id)
      .single();
    notice = fallback.data ? { ...fallback.data, easy_explanations: null } : null;
    noticeError = fallback.error;
  }

  if (noticeError || !notice) {
    return NextResponse.json({ error: noticeError?.message ?? "알림을 찾을 수 없습니다." }, { status: 404 });
  }
  if (notice.household_id !== resolved.householdId) {
    return NextResponse.json({ error: "이 알림에 접근할 권한이 없습니다." }, { status: 403 });
  }
  const noticeChild = notice.children as unknown as { name: string } | null;
  const noticeOut = { ...notice, children: undefined, childName: noticeChild?.name ?? null };

  const { data: items, error: itemsError } = await supabase
    .from("checklist_items")
    .select("id, category, title, detail, due_date, ai_confidence, is_edited_by_user, is_done")
    .eq("notice_id", id)
    .order("created_at", { ascending: true });
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: actions } = itemIds.length
    ? await supabase
        .from("item_actions")
        .select("id, checklist_item_id, user_id, action, note, created_at")
        .in("checklist_item_id", itemIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  // 클라이언트가 action.user_id를 "보호자 1/2"로 표시할 수 있도록 role을 같이 내려준다.
  const userIds = [...new Set((actions ?? []).map((a) => a.user_id))];
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, role, display_name").in("id", userIds)
    : { data: [] };

  // PRD 5-2 분기7: "배우자가 초대는 됐지만 아직 이 알림을 한 번도 안 열어봤을 때"를
  // 구분하려면 가구 구성원 전체와, 그중 누가 실제로 이 알림을 열었는지가 필요하다.
  const { data: householdMembers } = await supabase
    .from("users")
    .select("id, role, display_name")
    .eq("household_id", resolved.householdId);

  const { data: viewEvents } = await supabase
    .from("notice_events")
    .select("user_id")
    .eq("notice_id", id)
    .in("event_type", ["notice_opened", "partner_view_confirmed"]);
  const viewedUserIds = [...new Set((viewEvents ?? []).map((e) => e.user_id as string))];

  return NextResponse.json({
    notice: noticeOut,
    items,
    actions: actions ?? [],
    users: users ?? [],
    householdMembers: householdMembers ?? [],
    viewedUserIds,
  });
}

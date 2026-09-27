import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

// Pull 기반 동기화(PRD FR-2): 앱이 열릴 때마다 이 엔드포인트를 다시 호출해서
// 상대 보호자가 그 사이 체크/메모한 내용을 가져온다. 실시간 push는 쓰지 않는다.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select("id, raw_text, ai_summary, created_at")
    .eq("id", id)
    .single();
  if (noticeError) {
    return NextResponse.json({ error: noticeError.message }, { status: 404 });
  }

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

  return NextResponse.json({ notice, items, actions: actions ?? [] });
}

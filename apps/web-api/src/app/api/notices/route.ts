import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { ensureDevHousehold, type DevRole } from "@/lib/supabase/devSeed";
import type { ChecklistItemDraft } from "@/lib/ai/summarize";

type CreateNoticeBody = {
  rawText: string;
  summary: string;
  items: ChecklistItemDraft[];
  createdBy?: DevRole;
};

export async function POST(req: NextRequest) {
  let body: CreateNoticeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  if (typeof body.rawText !== "string" || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "rawText, items가 필요합니다." }, { status: 400 });
  }

  const { householdId, userIds } = await ensureDevHousehold();
  const createdBy = userIds[body.createdBy ?? "primary"];
  const supabase = getSupabaseServerClient();

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .insert({
      household_id: householdId,
      raw_text: body.rawText,
      ai_summary: body.summary ?? null,
      created_by: createdBy,
    })
    .select("id, created_at")
    .single();
  if (noticeError) {
    return NextResponse.json({ error: noticeError.message }, { status: 500 });
  }

  const itemsToInsert = body.items.map((item) => ({
    notice_id: notice.id,
    category: item.category,
    title: item.title,
    detail: item.detail,
    due_date: item.dueDate,
    ai_confidence: item.confidence,
    is_edited_by_user: false,
  }));

  const { data: checklistItems, error: itemsError } = await supabase
    .from("checklist_items")
    .insert(itemsToInsert)
    .select("id, category, title, detail, due_date, ai_confidence, is_edited_by_user, is_done");
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // notice_opened는 여기서 자동으로 넣지 않는다 — 클라이언트가 실제로 알림을 "펼쳐봤을 때"
  // POST /api/notices/[id]/open 을 명시적으로 호출해서 기록한다(PRD 5단계: 배너 미리보기와
  // 진짜 열람을 구분하기 위해 열람 이벤트의 발생 시점을 한 곳으로 모아둔다).

  return NextResponse.json({ noticeId: notice.id, items: checklistItems });
}

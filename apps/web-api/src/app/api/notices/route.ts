import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";
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

  let resolved;
  try {
    resolved = await resolveUser(req, body.createdBy);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { householdId, userId: createdBy } = resolved;
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

// PRD 정보구조(docs/06_prd.md Part 4)의 "오늘 할 일"/"지난 기록" 화면이 쓸 목록 조회.
export async function GET(req: NextRequest) {
  let resolved;
  try {
    resolved = await resolveUser(req, req.nextUrl.searchParams.get("as") as DevRole | null);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { householdId } = resolved;
  const supabase = getSupabaseServerClient();

  const { data: notices, error } = await supabase
    .from("notices")
    .select("id, ai_summary, created_at, checklist_items(id, is_done, due_date)")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // PRD "새로 온 알림"(이거 봤나, 안 봤나?): 내가 이 알림을 한 번이라도 연 적이 있는지.
  const noticeIds = (notices ?? []).map((n) => n.id as string);
  const { data: myOpens } = noticeIds.length
    ? await supabase
        .from("notice_events")
        .select("notice_id")
        .eq("user_id", resolved.userId)
        .in("notice_id", noticeIds)
        .in("event_type", ["notice_opened", "partner_view_confirmed"])
    : { data: [] };
  const openedByMe = new Set((myOpens ?? []).map((e) => e.notice_id as string));

  const summarized = (notices ?? []).map((n) => {
    const items = (n.checklist_items ?? []) as { id: string; is_done: boolean; due_date: string | null }[];
    return {
      id: n.id,
      summary: n.ai_summary,
      createdAt: n.created_at,
      totalItems: items.length,
      doneItems: items.filter((i) => i.is_done).length,
      nearestDueDate: items.map((i) => i.due_date).filter(Boolean).sort()[0] ?? null,
      hasOpened: openedByMe.has(n.id as string),
    };
  });

  return NextResponse.json({ notices: summarized });
}

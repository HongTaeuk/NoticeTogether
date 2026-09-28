import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";
import type { ChecklistItemDraft } from "@/lib/ai/summarize";
import { explainJargonTerms } from "@/lib/ai/explainJargon";

type CreateNoticeBody = {
  rawText: string;
  summary: string;
  items: ChecklistItemDraft[];
  createdBy?: DevRole;
  // 해결검토 1번(다자녀 가정은 알림이 누구 것인지 헷갈린다): 이 알림이 어느 자녀
  // 것인지 선택적으로 지정한다. 자녀가 1명뿐이거나 등록 안 한 가정은 그냥 null.
  childId?: string | null;
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

  let childId: string | null = null;
  if (body.childId) {
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("id")
      .eq("id", body.childId)
      .eq("household_id", householdId)
      .maybeSingle();
    if (childError) {
      return NextResponse.json({ error: childError.message }, { status: 500 });
    }
    if (!child) {
      return NextResponse.json({ error: "이 가정에 속하지 않은 자녀입니다." }, { status: 403 });
    }
    childId = child.id as string;
  }

  // PRD 4-4: 장애 자녀로 등록된 가정에게만 "쉬운 설명" 섹션을 조건부로 만든다.
  // 해당 없는 가정(대다수)은 이 AI 호출 자체를 하지 않는다(불필요한 40 RPM 소모 방지).
  const { data: disabilityChildren } = await supabase
    .from("children")
    .select("id")
    .eq("household_id", householdId)
    .not("disability_type", "is", null)
    .limit(1);

  let easyExplanations: Awaited<ReturnType<typeof explainJargonTerms>> | null = null;
  if (disabilityChildren && disabilityChildren.length > 0) {
    try {
      const terms = await explainJargonTerms(body.rawText);
      if (terms.length > 0) easyExplanations = terms;
    } catch {
      // AI 실패는 이 부가 기능만 비우고 넘어간다 — 알림 저장 자체를 막지 않는다.
    }
  }

  let { data: notice, error: noticeError } = await supabase
    .from("notices")
    .insert({
      household_id: householdId,
      raw_text: body.rawText,
      ai_summary: body.summary ?? null,
      easy_explanations: easyExplanations,
      created_by: createdBy,
      child_id: childId,
    })
    .select("id, created_at")
    .single();

  // easy_explanations/child_id 컬럼은 각각 0003/0001 마이그레이션이 있어야 존재한다.
  // 마이그레이션이 아직 실행되지 않은 배포 환경(스키마 캐시에 컬럼이 없음)에서도
  // 최소한 알림 저장 자체는 항상 되게 하기 위한 폴백 — 이 부가 기능들만 조용히 빠진다.
  if (noticeError?.message?.includes("schema cache")) {
    easyExplanations = null;
    const fallback = await supabase
      .from("notices")
      .insert({
        household_id: householdId,
        raw_text: body.rawText,
        ai_summary: body.summary ?? null,
        created_by: createdBy,
      })
      .select("id, created_at")
      .single();
    notice = fallback.data;
    noticeError = fallback.error;
  }

  if (noticeError || !notice) {
    return NextResponse.json({ error: noticeError?.message ?? "알림 저장에 실패했습니다." }, { status: 500 });
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

  return NextResponse.json({ noticeId: notice.id, items: checklistItems, easyExplanations });
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
    .select("id, ai_summary, created_at, child_id, children(name), checklist_items(id, is_done, due_date)")
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
    const child = n.children as unknown as { name: string } | null;
    return {
      id: n.id,
      summary: n.ai_summary,
      createdAt: n.created_at,
      totalItems: items.length,
      doneItems: items.filter((i) => i.is_done).length,
      nearestDueDate: items.map((i) => i.due_date).filter(Boolean).sort()[0] ?? null,
      hasOpened: openedByMe.has(n.id as string),
      childId: n.child_id,
      childName: child?.name ?? null,
    };
  });

  return NextResponse.json({ notices: summarized });
}

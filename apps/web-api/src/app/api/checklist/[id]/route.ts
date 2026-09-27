import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

type ToggleBody = {
  // isDone을 생략하면 체크 상태는 그대로 두고 note만 남긴다("한마디" 전용 액션).
  isDone?: boolean;
  as?: DevRole;
  note?: string;
  // FR-1: 사용자가 AI 추출 결과를 직접 수정했는지 구분해서 인지해야 한다.
  title?: string;
  detail?: string | null;
  dueDate?: string | null;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: ToggleBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  const hasEdit = body.title !== undefined || body.detail !== undefined || body.dueDate !== undefined;
  if (body.isDone === undefined && !body.note && !hasEdit) {
    return NextResponse.json(
      { error: "isDone, note, title/detail/dueDate 중 하나는 있어야 합니다." },
      { status: 400 },
    );
  }
  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: "title은 비어있지 않아야 합니다." }, { status: 400 });
  }

  let resolved;
  try {
    resolved = await resolveUser(req, body.as);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const { userId } = resolved;
  const supabase = getSupabaseServerClient();

  const { data: itemWithNotice, error: itemLookupError } = await supabase
    .from("checklist_items")
    .select("id, notice_id, notices!inner(household_id)")
    .eq("id", id)
    .single();
  if (itemLookupError) {
    return NextResponse.json({ error: itemLookupError.message }, { status: 404 });
  }
  const noticeHouseholdId = (itemWithNotice.notices as unknown as { household_id: string }).household_id;
  if (noticeHouseholdId !== resolved.householdId) {
    return NextResponse.json({ error: "이 항목에 접근할 권한이 없습니다." }, { status: 403 });
  }

  type ItemRow = {
    id: string;
    is_done: boolean;
    title: string;
    detail: string | null;
    due_date: string | null;
    is_edited_by_user: boolean;
  };

  const updatePayload: Record<string, unknown> = {};
  if (body.isDone !== undefined) updatePayload.is_done = body.isDone;
  if (hasEdit) {
    if (body.title !== undefined) updatePayload.title = body.title.trim();
    if (body.detail !== undefined) updatePayload.detail = body.detail;
    if (body.dueDate !== undefined) updatePayload.due_date = body.dueDate;
    updatePayload.is_edited_by_user = true;
  }

  let item: ItemRow;
  if (Object.keys(updatePayload).length > 0) {
    const { data, error: updateError } = await supabase
      .from("checklist_items")
      .update(updatePayload)
      .eq("id", id)
      .select("id, is_done, title, detail, due_date, is_edited_by_user")
      .single();
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    item = data;
  } else {
    const { data, error: fetchError } = await supabase
      .from("checklist_items")
      .select("id, is_done, title, detail, due_date, is_edited_by_user")
      .eq("id", id)
      .single();
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    item = data;
  }

  // append-only 액션 로그: "누가 안 했는지"가 아니라 "각자 무엇을 했는지"를 기록한다.
  // 여러 종류가 동시에 일어날 수 있어(체크+수정 등) 각각 별도 로그로 남긴다.
  const logs: { checklist_item_id: string; user_id: string; action: string; note: string | null }[] = [];
  if (body.isDone !== undefined) {
    logs.push({
      checklist_item_id: id,
      user_id: userId,
      action: body.isDone ? "checked" : "unchecked",
      note: null,
    });
  }
  if (hasEdit) {
    logs.push({ checklist_item_id: id, user_id: userId, action: "edited", note: null });
  }
  if (body.note) {
    logs.push({ checklist_item_id: id, user_id: userId, action: "note", note: body.note });
  }
  if (logs.length > 0) {
    await supabase.from("item_actions").insert(logs);
  }

  return NextResponse.json({ item });
}

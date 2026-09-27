import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { DevRole } from "@/lib/supabase/devSeed";
import { resolveUser, AuthError } from "@/lib/auth/session";

type ToggleBody = {
  // isDone을 생략하면 체크 상태는 그대로 두고 note만 남긴다("한마디" 전용 액션).
  isDone?: boolean;
  as?: DevRole;
  note?: string;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: ToggleBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  if (body.isDone === undefined && !body.note) {
    return NextResponse.json({ error: "isDone 또는 note 중 하나는 있어야 합니다." }, { status: 400 });
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

  let item: { id: string; is_done: boolean };
  if (body.isDone !== undefined) {
    const { data, error: updateError } = await supabase
      .from("checklist_items")
      .update({ is_done: body.isDone })
      .eq("id", id)
      .select("id, is_done")
      .single();
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    item = data;
  } else {
    const { data, error: fetchError } = await supabase
      .from("checklist_items")
      .select("id, is_done")
      .eq("id", id)
      .single();
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    item = data;
  }

  // append-only 액션 로그: "누가 안 했는지"가 아니라 "각자 무엇을 했는지"를 기록한다.
  const action = body.isDone === undefined ? "note" : body.isDone ? "checked" : "unchecked";
  await supabase.from("item_actions").insert({
    checklist_item_id: id,
    user_id: userId,
    action,
    note: body.note ?? null,
  });

  return NextResponse.json({ item });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { ensureDevHousehold, type DevRole } from "@/lib/supabase/devSeed";

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

  const { userIds } = await ensureDevHousehold();
  const userId = userIds[body.as ?? "primary"];
  const supabase = getSupabaseServerClient();

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

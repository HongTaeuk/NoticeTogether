import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { ensureDevHousehold, type DevRole } from "@/lib/supabase/devSeed";

type ToggleBody = {
  isDone: boolean;
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

  if (typeof body.isDone !== "boolean") {
    return NextResponse.json({ error: "isDone(boolean)이 필요합니다." }, { status: 400 });
  }

  const { userIds } = await ensureDevHousehold();
  const userId = userIds[body.as ?? "primary"];
  const supabase = getSupabaseServerClient();

  const { data: item, error: updateError } = await supabase
    .from("checklist_items")
    .update({ is_done: body.isDone })
    .eq("id", id)
    .select("id, is_done")
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // append-only 액션 로그: "누가 안 했는지"가 아니라 "각자 무엇을 했는지"를 기록한다.
  await supabase.from("item_actions").insert({
    checklist_item_id: id,
    user_id: userId,
    action: body.isDone ? "checked" : "unchecked",
    note: body.note ?? null,
  });

  return NextResponse.json({ item });
}

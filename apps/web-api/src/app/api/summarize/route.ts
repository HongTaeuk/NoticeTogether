import { NextRequest, NextResponse } from "next/server";
import { summarizeNotice } from "@/lib/ai/summarize";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  const rawText = (body as Record<string, unknown>)?.rawText;
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return NextResponse.json({ error: "rawText는 비어있지 않은 문자열이어야 합니다." }, { status: 400 });
  }

  try {
    const result = await summarizeNotice(rawText);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

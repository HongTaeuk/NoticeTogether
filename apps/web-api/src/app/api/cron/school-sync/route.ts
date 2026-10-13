import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { prepareAllSchools } from "@/lib/school/sync";

export const maxDuration = 60;

/**
 * 매일 정해진 시간(vercel.json `crons`)에 Vercel이 부른다 — 앱을 열지 않아도 학교 새 글을 모아 알림으로 넣어 둔다.
 * Vercel이 `Authorization: Bearer $CRON_SECRET`을 붙여 보내므로, 그 값이 맞을 때만 돈다(아무나 수집을 일으키지 못하게).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const result = await prepareAllSchools(getSupabaseServerClient(), Date.now() + 50_000);
  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import { resolveUser, AuthError } from "@/lib/auth/session";
import { OFFICES, searchSchools } from "@/lib/school/neis";

/** 학교 고르기: 교육청 + 학교 이름 일부로 NEIS에서 찾는다. 인증키가 없으면 5개까지만 와서 `truncated`로 알려 준다. */
export async function GET(req: NextRequest) {
  try {
    await resolveUser(req);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  const atpt = req.nextUrl.searchParams.get("atpt");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (atpt && !OFFICES.some((o) => o.code === atpt)) {
    return NextResponse.json({ error: "알 수 없는 교육청이에요." }, { status: 400 });
  }
  if (q.length < 2) {
    return NextResponse.json({ offices: OFFICES, schools: [], total: 0, truncated: false });
  }
  try {
    const { schools, total } = await searchSchools(atpt, q);
    return NextResponse.json({ offices: OFFICES, schools, total, truncated: total > schools.length });
  } catch {
    return NextResponse.json({ error: "학교 목록을 불러오지 못했어요. 잠시 뒤 다시 해 주세요." }, { status: 502 });
  }
}

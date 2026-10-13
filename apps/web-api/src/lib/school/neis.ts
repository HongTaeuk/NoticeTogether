/**
 * NEIS 교육정보 개방 포털 `schoolInfo` — 교육청 → 학교 고르기를 전국 하나의 API로 해결한다(REPORT §3.1).
 * 인증키(NEIS_API_KEY) 없이도 되지만 한 번에 5개까지만 준다. 키가 있으면 100개까지.
 */
export const OFFICES: { code: string; name: string }[] = [
  { code: "B10", name: "서울" },
  { code: "C10", name: "부산" },
  { code: "D10", name: "대구" },
  { code: "E10", name: "인천" },
  { code: "F10", name: "광주" },
  { code: "G10", name: "대전" },
  { code: "H10", name: "울산" },
  { code: "I10", name: "세종" },
  { code: "J10", name: "경기" },
  { code: "K10", name: "강원" },
  { code: "M10", name: "충북" },
  { code: "N10", name: "충남" },
  { code: "P10", name: "전북" },
  { code: "Q10", name: "전남" },
  { code: "R10", name: "경북" },
  { code: "S10", name: "경남" },
  { code: "T10", name: "제주" },
];

export type SchoolHit = {
  atptCode: string;
  atptName: string;
  schoolCode: string;
  name: string;
  address: string;
  homepage: string | null;
};

type NeisRow = Record<string, string | null | undefined>;

async function callSchoolInfo(params: Record<string, string>): Promise<{ rows: NeisRow[]; total: number }> {
  const key = process.env.NEIS_API_KEY;
  const query = new URLSearchParams({ Type: "json", pIndex: "1", pSize: "100", ...params });
  if (key) query.set("KEY", key);
  const res = await fetch(`https://open.neis.go.kr/hub/schoolInfo?${query}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`NEIS 응답 ${res.status}`);
  const json = (await res.json()) as { schoolInfo?: [{ head: { list_total_count?: number }[] }, { row: NeisRow[] }] };
  if (!json.schoolInfo) return { rows: [], total: 0 }; // INFO-200(해당 자료 없음)
  return { rows: json.schoolInfo[1]?.row ?? [], total: json.schoolInfo[0]?.head?.[0]?.list_total_count ?? 0 };
}

/** NEIS의 홈페이지 주소는 앞뒤 공백·`http://`만 있는 값·스킴 없는 값이 섞여 있다(REPORT §3.1). */
export function normalizeHomepage(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v || /^https?:\/\/?$/i.test(v)) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `http://${v}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

function toHit(r: NeisRow): SchoolHit {
  return {
    atptCode: r.ATPT_OFCDC_SC_CODE ?? "",
    atptName: r.ATPT_OFCDC_SC_NM ?? "",
    schoolCode: r.SD_SCHUL_CODE ?? "",
    name: r.SCHUL_NM ?? "",
    address: [r.ORG_RDNMA, r.ORG_RDNDA].filter(Boolean).join(" ").trim(),
    homepage: normalizeHomepage(r.HMPG_ADRES),
  };
}

export async function searchSchools(atptCode: string | null, query: string): Promise<{ schools: SchoolHit[]; total: number }> {
  const params: Record<string, string> = { SCHUL_NM: query, SCHUL_KND_SC_NM: "초등학교" };
  if (atptCode) params.ATPT_OFCDC_SC_CODE = atptCode;
  const { rows, total } = await callSchoolInfo(params);
  return { schools: rows.map(toHit), total };
}

/** 앱이 보낸 학교 코드를 믿지 않고 NEIS에서 다시 찾는다 — 홈페이지 주소는 서버가 직접 받은 것만 쓴다. */
export async function findSchool(atptCode: string, schoolCode: string): Promise<SchoolHit | null> {
  const { rows } = await callSchoolInfo({ ATPT_OFCDC_SC_CODE: atptCode, SD_SCHUL_CODE: schoolCode });
  return rows[0] ? toHit(rows[0]) : null;
}

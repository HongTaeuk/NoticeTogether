// apps/web-api의 `lib/school/sync.ts`(SchoolStatus)·`lib/school/neis.ts`(SchoolHit)와 같은 모양.
export type Office = { code: string; name: string };

export type SchoolHit = {
  atptCode: string;
  atptName: string;
  schoolCode: string;
  name: string;
  address: string;
  homepage: string | null;
};

export type SchoolBoard = { label: string; kind: "notice" | "office_notice" | "weekly"; supported: boolean; lastCheckedAt: string | null; error: string | null };

export type SchoolStatus = {
  linked: boolean;
  needsMigration?: boolean;
  school?: { name: string; atptName: string | null; grade: number | null; homepage: string | null };
  boards: SchoolBoard[];
  supported: boolean;
  lastCheckedAt: string | null;
  delivered?: number;
  pending?: number;
};

export type NoticeSource = {
  title: string;
  url: string;
  postedOn: string | null;
  boardLabel: string | null;
  /** 본문 그림 주소(그림으로만 올린 안내를 앱에서 바로 보여 줌). 목록 응답에는 없고 상세에만 있다. */
  images?: string[];
  files?: { name: string; url: string }[];
};

export const OFFICES: Office[] = [
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

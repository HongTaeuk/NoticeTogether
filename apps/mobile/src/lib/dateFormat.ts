const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "YYYY-MM-DD"를 기기 로컬 자정의 Date로. `new Date("YYYY-MM-DD")`는 UTC로 해석돼 날짜가 밀릴 수 있다. */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function formatKoreanDate(date: Date | string): string {
  const d = typeof date === "string" ? parseYmd(date) : date;
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${d.getFullYear()}년 ${base}`;
}

export function formatKoreanTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const hourLabel = h === 0 ? "밤 12시" : h < 12 ? `오전 ${h}시` : h === 12 ? "낮 12시" : `오후 ${h - 12}시`;
  return m === 0 ? hourLabel : `${hourLabel} ${m}분`;
}

export function formatKoreanDateTime(date: Date): string {
  return `${formatKoreanDate(date)} ${formatKoreanTime(date)}`;
}

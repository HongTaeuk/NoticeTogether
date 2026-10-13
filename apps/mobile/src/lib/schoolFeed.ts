import { authFetch } from "./apiClient";
import type { SchoolStatus } from "../types/school";

export type SyncResult = { status: SchoolStatus | null; offline: boolean };

/**
 * 학교 홈페이지의 새 가정통신문을 우리 가정 알림으로 가져온다(앱을 열 때 — Pull 방식).
 * 서버는 한 번에 몇 건씩만 처리하고(서버리스 시간 제한) 남은 수(pending)를 알려 주므로, 남은 게 있으면 다 끝날 때까지
 * 이어서 부른다 — 화면은 첫 번째 결과로 먼저 보여 주고 나머지는 뒤에서 계속 정리한다(사용자 요청).
 * 한 건도 못 받는 판이 세 번 이어지면(학교 서버·AI가 잠시 안 될 때) 멈추고 다음 열 때·매일 미리 모으기에 맡긴다.
 */
export async function syncSchoolFeed(
  onRound?: (status: SchoolStatus, deliveredTotal: number) => void,
  shouldStop?: () => boolean,
): Promise<SyncResult> {
  let last: SchoolStatus | null = null;
  let deliveredTotal = 0;
  let idleRounds = 0;
  for (let round = 0; round < 25; round++) {
    if (shouldStop?.()) break;
    let res: Response | null = null;
    try {
      res = await authFetch("/api/school/sync", { method: "POST" });
    } catch {
      return { status: last ? { ...last, delivered: deliveredTotal } : null, offline: !last };
    }
    if (!res.ok) break;
    last = (await res.json()) as SchoolStatus;
    const got = last.delivered ?? 0;
    deliveredTotal += got;
    idleRounds = got > 0 ? 0 : idleRounds + 1;
    onRound?.(last, deliveredTotal);
    if (!last.linked || !last.pending || idleRounds >= 3) break;
  }
  return { status: last ? { ...last, delivered: deliveredTotal } : null, offline: false };
}

export async function loadSchoolStatus(): Promise<SchoolStatus | null> {
  const res = await authFetch("/api/school").catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as SchoolStatus;
}

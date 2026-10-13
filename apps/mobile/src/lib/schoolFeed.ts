import { authFetch } from "./apiClient";
import type { SchoolStatus } from "../types/school";

/**
 * 학교 홈페이지의 새 가정통신문을 우리 가정 알림으로 가져온다(앱을 열 때 — Pull 방식).
 * 서버는 한 번에 몇 건씩만 처리하고 남은 수(pending)를 알려 주므로, 새로 받은 게 있으면 몇 번 더 부른다.
 * 계속 실패하는 글이 있어도 무한히 돌지 않게 최대 4번까지만.
 */
export async function syncSchoolFeed(): Promise<SchoolStatus | null> {
  let last: SchoolStatus | null = null;
  let deliveredTotal = 0;
  for (let round = 0; round < 4; round++) {
    const res = await authFetch("/api/school/sync", { method: "POST" }).catch(() => null);
    if (!res?.ok) break;
    last = (await res.json()) as SchoolStatus;
    deliveredTotal += last.delivered ?? 0;
    if (!last.linked || !last.pending || !last.delivered) break;
  }
  return last ? { ...last, delivered: deliveredTotal } : null;
}

export async function loadSchoolStatus(): Promise<SchoolStatus | null> {
  const res = await authFetch("/api/school").catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as SchoolStatus;
}

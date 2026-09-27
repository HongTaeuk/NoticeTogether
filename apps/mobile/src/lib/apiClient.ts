import { API_BASE_URL } from "../config/api";

/**
 * PRD 10단계 이후: 모든 요청은 로그인 토큰(Authorization: Bearer)으로 사용자를 식별한다.
 * (백엔드는 토큰이 없으면 개발용 임시 계정으로 계속 동작하지만, 로그인한 화면에서는 항상 토큰을 보낸다.)
 */
export async function authFetch(accessToken: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

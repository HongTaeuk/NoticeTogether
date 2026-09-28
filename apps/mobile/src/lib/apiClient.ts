import { API_BASE_URL } from "../config/api";

type Tokens = { accessToken: string; refreshToken: string };

let currentTokens: Tokens | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;
// 화면 하나가 여러 요청을 동시에 보낼 수 있어(예: TodayScreen 진입 시), refreshToken까지
// 무효화된 순간 여러 요청이 한꺼번에 401을 맞으면 onSessionExpired가 중복 호출돼
// App.tsx가 새 익명 가정을 여러 개 만들어버릴 수 있다 — 세션당 한 번만 통지한다.
let sessionExpiredNotified = false;

/**
 * App.tsx가 세션을 불러오거나(로그인/가입/승격/토큰 갱신) 로그아웃할 때마다 호출해서
 * 이 모듈이 들고 있는 토큰을 최신 상태로 맞춘다. `authFetch`는 매번 accessToken을
 * 인자로 받는 대신 이 모듈 상태를 참조한다 — 그래야 401을 받아 자동으로 토큰을
 * 갱신했을 때, 그 갱신된 토큰을 호출부 하나하나가 몰라도 다음 요청부터 바로 쓰인다.
 */
export function setAuthTokens(tokens: Tokens | null) {
  currentTokens = tokens;
  if (tokens) sessionExpiredNotified = false;
}

/** refreshToken까지 만료/무효화되어 더 이상 갱신할 수 없을 때 App.tsx가 반응할 수 있게 등록. */
export function setOnSessionExpired(callback: (() => void) | null) {
  onSessionExpired = callback;
}

async function refreshTokens(): Promise<boolean> {
  if (!currentTokens) return false;
  // 여러 요청이 동시에 401을 맞아도 갱신 호출은 한 번만 나가게 한다.
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: currentTokens!.refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        currentTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/** 토큰 갱신 성공 시 App.tsx가 AsyncStorage에도 반영할 수 있도록 최신 토큰을 읽어간다. */
export function getCurrentTokens(): Tokens | null {
  return currentTokens;
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!currentTokens) {
    throw new Error("로그인 세션이 없습니다.");
  }

  const doFetch = () => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${currentTokens!.accessToken}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  };

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await doFetch();
    } else if (!sessionExpiredNotified) {
      sessionExpiredNotified = true;
      onSessionExpired?.();
    }
  }
  return res;
}

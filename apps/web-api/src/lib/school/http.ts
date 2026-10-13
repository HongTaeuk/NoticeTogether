/**
 * 학교 홈페이지를 읽는 작은 HTTP 도우미. 브라우저처럼 보이되 앱 이름을 붙여 누가 읽는지 밝힌다.
 * 학교 CMS는 조건부 GET(ETag 등)을 주지 않아서(research/REPORT.md §4.4) 캐시 헤더는 신경 쓰지 않는다.
 */
const UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 HamkkeAlrim/0.1";

export type Page = { status: number; url: string; text: string; cookies: string[] };

export async function fetchPage(
  url: string,
  init: { method?: "GET" | "POST"; form?: Record<string, string>; headers?: Record<string, string>; cookie?: string; timeoutMs?: number } = {},
): Promise<Page> {
  const headers: Record<string, string> = { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", ...init.headers };
  if (init.cookie) headers.Cookie = init.cookie;
  let body: string | undefined;
  if (init.form) {
    body = new URLSearchParams(init.form).toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
  }
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers,
    body,
    redirect: "follow",
    signal: AbortSignal.timeout(init.timeoutMs ?? 15000),
  });
  const text = await res.text();
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie().map((c) => c.split(";")[0]) : [];
  return { status: res.status, url: res.url || url, text, cookies };
}

export async function fetchBinary(url: string, maxBytes: number, cookie?: string): Promise<Uint8Array | null> {
  const headers: Record<string, string> = { "User-Agent": UA };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf.byteLength > maxBytes ? null : buf;
}

/** 메뉴 링크를 절대 주소로. `javascript:`·`#`은 버린다. `../xboard/...` 같은 상대경로도 살린다(REPORT §4.3). */
export function absolutize(href: string, base: string): string | null {
  const h = decodeEntities(href.trim());
  if (!h || h.startsWith("#") || /^javascript:/i.test(h) || /^mailto:/i.test(h)) return null;
  try {
    return new URL(h, base).toString();
  } catch {
    return null;
  }
}

const NAMED: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  middot: "·",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** HTML 조각 → 읽을 수 있는 글. 문단·줄바꿈 태그는 줄바꿈으로 살린다. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withBreaks)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function oneLine(html: string): string {
  return htmlToText(html).replace(/\s+/g, " ").trim();
}

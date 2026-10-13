import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

/**
 * 학교 홈페이지를 읽는 작은 HTTP 도우미. 브라우저처럼 보이되 앱 이름을 붙여 누가 읽는지 밝힌다.
 * 학교 CMS는 조건부 GET(ETag 등)을 주지 않아서(research/REPORT.md §4.4) 캐시 헤더는 신경 쓰지 않는다.
 */
const UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 HamkkeAlrim/0.1";

export type Page = { status: number; url: string; text: string; cookies: string[] };

type Raw = { status: number; contentType: string; bytes: Uint8Array; setCookies: string[]; location: string | null };
type Req = { method: string; headers: Record<string, string>; body?: string; timeoutMs: number; maxBytes: number };

async function nativeOnce(url: string, r: Req): Promise<Raw> {
  const res = await fetch(url, { method: r.method, headers: r.headers, body: r.body, redirect: "manual", signal: AbortSignal.timeout(r.timeoutMs) });
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > r.maxBytes) throw new Error("파일이 너무 커요");
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    bytes: new Uint8Array(await res.arrayBuffer()),
    setCookies: typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [],
    location: res.headers.get("location"),
  };
}

/**
 * 너그러운 읽기 — 일부 학교 서버는 브라우저는 넘어가 주는 문제가 있다:
 * 응답 머리글 형식이 어긋나거나(광주 일부), 인증서 중간 단계가 빠져 있다(세종 등).
 * 공개 게시판을 읽는 데만 쓰고, 기본 읽기가 실패했을 때만 이 길로 다시 시도한다.
 */
function lenientOnce(url: string, r: Req): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const headers = r.body ? { ...r.headers, "Content-Length": String(Buffer.byteLength(r.body)) } : r.headers;
    const req = lib.request(u, { method: r.method, headers, insecureHTTPParser: true, rejectUnauthorized: false, timeout: r.timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        size += c.length;
        if (size > r.maxBytes) req.destroy(new Error("파일이 너무 커요"));
        else chunks.push(c);
      });
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 0,
          contentType: String(res.headers["content-type"] ?? ""),
          bytes: new Uint8Array(Buffer.concat(chunks)),
          setCookies: res.headers["set-cookie"] ?? [],
          location: typeof res.headers.location === "string" ? res.headers.location : null,
        }),
      );
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("시간 초과")));
    req.on("error", reject);
    if (r.body) req.write(r.body);
    req.end();
  });
}

/**
 * 마지막 수단 — 머리글 이름 뒤에 공백이 있는 등(광주 일부의 `P3P : CP=...`) Node 파서가 끝내 거부하는 응답을
 * 소켓에서 그대로 받아 직접 나눈다. 압축은 요청하지 않으므로 chunked 해제만 한다.
 */
function rawOnce(url: string, r: Req): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const port = Number(u.port) || (u.protocol === "https:" ? 443 : 80);
    const path = `${u.pathname}${u.search}`;
    const headers = { Host: u.host, Connection: "close", ...r.headers, ...(r.body ? { "Content-Length": String(Buffer.byteLength(r.body)) } : {}) };
    const head = `${r.method} ${path} HTTP/1.1\r\n${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\r\n")}\r\n\r\n`;
    const socket =
      u.protocol === "https:"
        ? tls.connect({ host: u.hostname, port, servername: u.hostname, rejectUnauthorized: false })
        : net.connect({ host: u.hostname, port });
    const chunks: Buffer[] = [];
    let size = 0;
    socket.setTimeout(r.timeoutMs, () => socket.destroy(new Error("시간 초과")));
    socket.on(u.protocol === "https:" ? "secureConnect" : "connect", () => socket.write(head + (r.body ?? "")));
    socket.on("data", (c: Buffer) => {
      size += c.length;
      if (size > r.maxBytes + 64 * 1024) socket.destroy(new Error("파일이 너무 커요"));
      else chunks.push(c);
    });
    socket.on("error", reject);
    socket.on("close", () => {
      const all = Buffer.concat(chunks);
      const split = all.indexOf("\r\n\r\n");
      if (split < 0) return reject(new Error("응답을 읽지 못했어요"));
      const lines = all.subarray(0, split).toString("latin1").split("\r\n");
      const status = Number(lines[0].split(" ")[1] ?? 0);
      const hdr: Record<string, string[]> = {};
      for (const line of lines.slice(1)) {
        const i = line.indexOf(":");
        if (i <= 0) continue;
        const k = line.slice(0, i).trim().toLowerCase();
        (hdr[k] ??= []).push(line.slice(i + 1).trim());
      }
      let body = all.subarray(split + 4);
      if ((hdr["transfer-encoding"]?.[0] ?? "").toLowerCase().includes("chunked")) {
        const parts: Buffer[] = [];
        let pos = 0;
        while (pos < body.length) {
          const eol = body.indexOf("\r\n", pos);
          if (eol < 0) break;
          const len = parseInt(body.subarray(pos, eol).toString("latin1"), 16);
          if (!len) break;
          parts.push(body.subarray(eol + 2, eol + 2 + len));
          pos = eol + 2 + len + 2;
        }
        body = Buffer.concat(parts);
      }
      resolve({
        status,
        contentType: hdr["content-type"]?.[0] ?? "",
        bytes: new Uint8Array(body),
        setCookies: hdr["set-cookie"] ?? [],
        location: hdr.location?.[0] ?? null,
      });
    });
  });
}

/** 너그러운 읽기 → 그래도 안 되면 소켓에서 직접. */
async function fallbackOnce(url: string, r: Req): Promise<Raw> {
  try {
    return await lenientOnce(url, r);
  } catch (err) {
    if (err instanceof Error && /너무 커요/.test(err.message)) throw err;
    return rawOnce(url, r);
  }
}

/** 리다이렉트를 직접 따라가며 쿠키를 이어 붙인다 — 쿠키를 받아야 본 페이지로 보내 주는 학교(경남 등)가 있어서. */
async function request(
  url: string,
  init: { method?: "GET" | "POST"; form?: Record<string, string>; headers?: Record<string, string>; cookie?: string; timeoutMs?: number; maxBytes?: number },
): Promise<Raw & { url: string; cookies: string[] }> {
  const jar = new Map<string, string>();
  for (const c of (init.cookie ?? "").split(/;\s*/)) if (c.includes("=")) jar.set(c.split("=")[0], c);
  let current = url;
  let method = init.method ?? "GET";
  let body = init.form ? new URLSearchParams(init.form).toString() : undefined;
  let lenient = false;
  for (let hop = 0; hop < 8; hop++) {
    const headers: Record<string, string> = { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", ...init.headers };
    if (body) headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    if (jar.size) headers.Cookie = [...jar.values()].join("; ");
    const r: Req = { method, headers, body, timeoutMs: init.timeoutMs ?? 15000, maxBytes: init.maxBytes ?? 8 * 1024 * 1024 };
    let raw: Raw;
    if (lenient) raw = await fallbackOnce(current, r);
    else {
      try {
        raw = await nativeOnce(current, r);
      } catch (err) {
        if (err instanceof Error && /너무 커요/.test(err.message)) throw err;
        lenient = true;
        raw = await fallbackOnce(current, r);
      }
    }
    for (const sc of raw.setCookies) {
      const pair = sc.split(";")[0];
      jar.set(pair.split("=")[0], pair);
    }
    if (raw.status >= 300 && raw.status < 400 && raw.location) {
      current = new URL(raw.location, current).toString();
      if (raw.status !== 307 && raw.status !== 308) {
        method = "GET";
        body = undefined;
      }
      continue;
    }
    return { ...raw, url: current, cookies: [...jar.values()] };
  }
  throw new Error("리다이렉트가 너무 많아요");
}

/** 오래된 학교 페이지는 EUC-KR이다 — 머리글이나 <meta charset>을 보고 맞게 읽는다. */
function decodeHtml(bytes: Uint8Array, contentType: string): string {
  let cs = contentType.match(/charset=([\w-]+)/i)?.[1];
  if (!cs) cs = new TextDecoder("latin1").decode(bytes.subarray(0, 4096)).match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  cs = (cs ?? "utf-8").toLowerCase();
  if (cs === "ks_c_5601-1987" || cs === "euc_kr" || cs === "x-windows-949" || cs === "cp949") cs = "euc-kr";
  try {
    return new TextDecoder(cs).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

export async function fetchPage(
  url: string,
  init: { method?: "GET" | "POST"; form?: Record<string, string>; headers?: Record<string, string>; cookie?: string; timeoutMs?: number } = {},
): Promise<Page> {
  const raw = await request(url, init);
  return { status: raw.status, url: raw.url, text: decodeHtml(raw.bytes, raw.contentType), cookies: raw.cookies };
}

export async function fetchBinary(url: string, maxBytes: number, cookie?: string): Promise<Uint8Array | null> {
  const raw = await request(url, { cookie, timeoutMs: 20000, maxBytes });
  return raw.status === 200 ? raw.bytes : null;
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

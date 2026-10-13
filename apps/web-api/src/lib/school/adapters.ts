import { decodeEntities, fetchPage, htmlToText, oneLine } from "./http";

/**
 * 학교 홈페이지 형식(CMS)별 게시판 읽기. 학교 4,700곳이 아니라 "형식 10~15개"의 문제다(REPORT §4.4).
 * 2026-10-13 전국 17개 교육청 학교 표본 조사(시도별 3~6곳)로 확인한 형식:
 * - `na_ntt`     — 경기·부산·경북·경남·전남·세종·제주
 * - `sen_dggb`   — 서울 (목록·상세가 AJAX)
 * - `board_cnts` — 인천·대전·강원·충남 (목록의 goView 함수로 상세 주소를 만든다)
 * - `tch`        — 울산·충북·전북 (같은 템플릿, `tch-*` 칸)
 * - `c2z`        — 광주 (안내장 등록대장)
 * - `xboard`     — 광주 일부. 가정통신문 게시판이 로그인 뒤에 있어 읽지 못한다(그렇다고 알려 준다).
 * 대구는 NEIS 주소가 로그인 페이지라 학교 코드 경로의 첫 화면에서 다시 찾는다(discover.ts).
 */
export type Family = "na_ntt" | "sen_dggb" | "board_cnts" | "tch" | "c2z" | "xboard";
export const SUPPORTED_FAMILIES: Family[] = ["na_ntt", "sen_dggb", "board_cnts", "tch", "c2z", "xboard"];

export type BoardRef = { family: string; list_url: string; params: Record<string, string> };
export type ListedPost = { postKey: string; title: string; postedOn: string | null; url: string; pinned: boolean };
export type Attachment = { name: string; url: string; size: number | null };
export type PostDetail = { bodyText: string; attachments: Attachment[]; images: string[] };

/** 본문에 붙은 그림(가정통신문을 그림으로만 올린 학교가 많다) — 아이콘·버튼 그림은 뺀다. */
export function bodyImages(html: string, base: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)) {
    const src = decodeEntities(m[1]);
    if (/^data:/i.test(src) || /icon|btn|bul_|blank|spacer|\/images\/(comm|common|board|sub)\//i.test(src)) continue;
    if (!/\.(jpe?g|png|gif|bmp|webp)(\?|$)/i.test(src) && !/download|fileDown|dext5editordata|editor/i.test(src)) continue;
    try {
      const abs = new URL(src, base).toString();
      if (!out.includes(abs)) out.push(abs);
    } catch {
      // 주소가 깨진 그림은 건너뛴다.
    }
  }
  return out.slice(0, 12);
}

/** 목록 제목 뒤에 붙는 "새로운 글"·"NEW" 표시(아이콘 대체 글자)를 뗀다. */
export function cleanTitle(title: string): string {
  return title.replace(/(\s*(새로운\s*글|새\s*글|new|첨부파일|첨부\s*파일\s*있음))+\s*$/i, "").trim();
}

function toIsoDate(s: string | undefined): string | null {
  const m = s?.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
}

// ── na/ntt ─────────────────────────────────────────────
// 목록  /{학교}/na/ntt/selectNttList.do?mi=&bbsId=&currPage=N
// 상세  /{학교}/na/ntt/selectNttInfo.do?mi=&bbsId=&nttSn=
// 행은 공지(`td.noti`)와 일반(`td.BD_tm_none`) 두 가지 — 하나만 보면 조용히 덜 가져온다(REPORT §8.1 사례 1).

async function listNaNtt(board: BoardRef): Promise<ListedPost[]> {
  const url = new URL(board.list_url);
  // 첫 쪽은 기본값이라 currPage를 붙이지 않는다 — 부산은 currPage가 붙은 요청을 "올바른 접근이 아님"으로 막는다.
  url.searchParams.delete("currPage");
  const page = await fetchPage(url.toString());
  if (page.status !== 200) throw new Error(`목록 응답 ${page.status}`);
  // 목록 표 앞에 다른 표가 있는 학교가 있어(전남) 첫 tbody만 보지 않고 전부 본다.
  const tbody = (page.text.match(/<tbody[\s\S]*?<\/tbody>/gi) ?? []).join("");
  const rows = tbody.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const posts: ListedPost[] = [];
  for (const tr of rows) {
    // 두 가지 변형: 경기형은 <a data-id="글ID" class="nttInfoBtn">, 부산형은 <a href="…selectNttInfo.do?nttSn=글ID&mi=…">.
    const byId = tr.match(/<a[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/i);
    const byHref = byId ? null : tr.match(/<a[^>]*href=["']([^"']*selectNttInfo\.do[^"']*nttSn=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!byId && !byHref) continue;
    const id = byId ? byId[1] : byHref![2];
    let detail: URL;
    if (byHref) detail = new URL(decodeEntities(byHref[1]), page.url);
    else {
      detail = new URL(board.list_url.replace("selectNttList.do", "selectNttInfo.do"));
      detail.searchParams.delete("currPage");
      detail.searchParams.set("nttSn", id);
    }
    posts.push({
      postKey: id,
      title: cleanTitle(oneLine(byId ? byId[2] : byHref![3])),
      postedOn: toIsoDate(oneLine(tr).match(/\d{4}[.\-]\d{2}[.\-]\d{2}/)?.[0]),
      url: detail.toString(),
      pinned: /class="noti"/i.test(tr),
    });
  }
  // 자기검증: 행에 글 ID가 있는데 하나도 못 읽었다면 형식이 바뀐 것 — 조용히 0건으로 넘기지 않는다(REPORT §8.2 장치 1).
  if (posts.length === 0 && /nttInfoBtn|selectNttInfo\.do\?nttSn=/.test(tbody)) throw new Error("목록 형식이 바뀌었어요(글은 있는데 읽지 못함)");
  return posts;
}

async function detailNaNtt(post: { url: string }): Promise<PostDetail> {
  const page = await fetchPage(post.url);
  if (page.status !== 200) throw new Error(`상세 응답 ${page.status}`);
  const html = page.text;
  let body = "";
  const start = html.search(/class="bbsV_cont"/i);
  if (start >= 0) {
    const from = html.indexOf(">", start) + 1;
    const end = html.search(/class="bbsV_atchmnfl"|class="bbsV_btn|<\/table>/i);
    body = html.slice(from, end > from ? end : from + 20000);
  } else {
    const cont = html.match(/<tr[^>]*class="cont"[^>]*>([\s\S]*?)<\/tr>/i);
    // 부산·전남·경남형: "등록일" 줄 다음 <td colspan="4"> 칸이 본문이다.
    const wide = html.match(/등록일<\/th>[\s\S]*?<\/tr>\s*<tr[^>]*>\s*<td colspan="4"[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/i);
    body = cont?.[1] ?? wide?.[1] ?? "";
  }
  const origin = new URL(post.url).origin;
  const attachments: Attachment[] = [];
  for (const m of html.matchAll(/AddUploadedFile\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'(\d*)'/g)) {
    attachments.push({ name: decodeEntities(m[2]), url: new URL(m[3], origin).toString(), size: m[4] ? Number(m[4]) : null });
  }
  if (attachments.length === 0) {
    // 부산형 첨부: <a href="/common/nttFileDownload.do?fileKey=…">파일이름 (열람/다운로드 : N)</a>
    for (const a of fileLinks(html, post.url, /nttFileDownload|\/common\/fileDownload\.do/i)) {
      attachments.push({ ...a, name: a.name.replace(/\s*\(열람\/다운로드[\s\S]*$/, "").trim() });
    }
  }
  return { bodyText: htmlToText(body), attachments, images: bodyImages(body, post.url) };
}

// ── 서울 dggb ───────────────────────────────────────────
// 메뉴 페이지(/{번호}/subMenu.do)를 먼저 열어 세션 쿠키와 bbsId를 받은 뒤 AJAX로 목록·상세를 읽는다.

async function dggbSession(board: BoardRef): Promise<{ cookie: string; bbsId: string; bbsTyCode: string }> {
  const page = await fetchPage(board.list_url);
  if (page.status !== 200) throw new Error(`메뉴 응답 ${page.status}`);
  const bbsId = board.params.bbsId ?? page.text.match(/name="bbsId"[^>]*value="([^"]+)"/)?.[1];
  const bbsTyCode = board.params.bbsTyCode ?? page.text.match(/name="bbsTyCode"[^>]*value="([^"]+)"/)?.[1] ?? "dliv";
  if (!bbsId) throw new Error("게시판 ID를 찾지 못했어요");
  return { cookie: page.cookies.join("; "), bbsId, bbsTyCode };
}

function dggbHeaders(board: BoardRef) {
  return { "X-Requested-With": "XMLHttpRequest", Referer: board.list_url };
}

async function listDggb(board: BoardRef): Promise<ListedPost[]> {
  const s = await dggbSession(board);
  const origin = new URL(board.list_url).origin;
  const page = await fetchPage(`${origin}/dggb/module/board/selectBoardListAjax.do`, {
    method: "POST",
    cookie: s.cookie,
    headers: dggbHeaders(board),
    form: {
      bbsId: s.bbsId,
      bbsTyCode: s.bbsTyCode,
      customRecordCountPerPage: "20",
      pageIndex: "1",
      searchCondition: "",
      searchKeyword: "",
      checkNttId: "",
      mvmnReturnUrl: "",
    },
  });
  if (page.status !== 200) throw new Error(`목록 응답 ${page.status}`);
  const posts: ListedPost[] = [];
  for (const tr of page.text.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    // 학교 게시판은 fnView('게시판','글'), 교육청 공용 게시판은 fnSenView('글')(상세 주소도 다르다 — "sen:" 표시로 구분).
    const view = tr.match(/fnView\(\s*'([^']+)'\s*,\s*'(\d+)'\s*\)/);
    const senView = tr.match(/fnSenView\(\s*'(\d+)'\s*\)/);
    if (!view && !senView) continue;
    const a = tr.match(/<a[^>]*fn(?:Sen)?View[^>]*>([\s\S]*?)<\/a>/i);
    const firstCell = oneLine(tr.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    posts.push({
      postKey: view ? view[2] : `sen:${senView![1]}`,
      title: cleanTitle(oneLine(a?.[1] ?? "")),
      postedOn: toIsoDate(oneLine(tr).match(/\d{4}-\d{2}-\d{2}/)?.[0]),
      // 상세가 AJAX라 글마다 열 주소가 없다 — 게시판 화면으로 보낸다.
      url: board.list_url,
      pinned: !/^\d+$/.test(firstCell),
    });
  }
  if (posts.length === 0 && /fn(Sen)?View\(/.test(page.text)) throw new Error("목록 형식이 바뀌었어요(글은 있는데 읽지 못함)");
  return posts;
}

async function detailDggb(board: BoardRef, post: { postKey: string }): Promise<PostDetail> {
  const s = await dggbSession(board);
  const origin = new URL(board.list_url).origin;
  const sen = post.postKey.startsWith("sen:");
  const nttId = sen ? post.postKey.slice(4) : post.postKey;
  const page = await fetchPage(`${origin}/dggb/module/board/${sen ? "selectBoardSenDetailAjax" : "selectBoardDetailAjax"}.do`, {
    method: "POST",
    cookie: s.cookie,
    headers: dggbHeaders(board),
    form: { bbsId: s.bbsId, nttId, bbsTyCode: s.bbsTyCode, pageIndex: "1" },
  });
  if (page.status !== 200) throw new Error(`상세 응답 ${page.status}`);
  const html = page.text;
  const start = html.search(/<div class="content">/i);
  const body = start >= 0 ? html.slice(start, html.indexOf("</td>", start) > start ? html.indexOf("</td>", start) : start + 20000) : "";
  const attachments: Attachment[] = [];
  const fileRe =
    /serverFileObj\["name"\]\s*=\s*"([^"]*)";\s*serverFileObj\["size"\]\s*=\s*"(\d*)";\s*serverFileObj\["atchFileId"\]\s*=\s*"([^"]*)";\s*serverFileObj\["fileSn"\]\s*=\s*"(\d*)"/g;
  for (const m of html.matchAll(fileRe)) {
    attachments.push({
      name: decodeEntities(m[1]),
      url: `${origin}/dggb/board/boardFile/downFile.do?atchFileId=${encodeURIComponent(m[3])}&fileSn=${m[4] || "0"}`,
      size: m[2] ? Number(m[2]) : null,
    });
  }
  return { bodyText: htmlToText(body), attachments, images: bodyImages(body, board.list_url) };
}

// ── 공통 도우미 ─────────────────────────────────────────

/** 시작 표시 뒤부터 끝 표시들 중 가장 먼저 나오는 곳까지 자른다(중첩 태그를 정규식 하나로 자르면 잘못 잘린다). */
function sliceBetween(html: string, start: RegExp, ends: RegExp[]): string {
  const s = html.search(start);
  if (s < 0) return "";
  const from = html.indexOf(">", s) + 1;
  let end = html.length;
  for (const re of ends) {
    const rest = html.slice(from);
    const i = rest.search(re);
    if (i >= 0 && from + i < end) end = from + i;
  }
  return html.slice(from, Math.min(end, from + 40000));
}

function fileLinks(html: string, base: string, hrefRe: RegExp): Attachment[] {
  const out: Attachment[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (!hrefRe.test(m[1])) continue;
    const name = oneLine(m[2]);
    if (!name || /^(다운로드|내려받기|미리보기|바로보기)$/.test(name)) continue;
    const url = new URL(decodeEntities(m[1]), base).toString();
    if (!out.some((a) => a.url === url)) out.push({ name, url, size: null });
  }
  return out;
}

// ── boardCnts (인천·대전·강원·충남) ────────────────────────
// 목록 행의 onclick="goView('…','…',…)" 인자 순서가 지역마다 달라서, 그 목록 페이지에 있는 goView 함수가
// 주소를 만드는 식('/boardCnts/…?boardID='+reqBoardID+…)을 읽어 인자를 그대로 끼워 넣는다.

function goViewUrl(listHtml: string, args: string[], base: string): string | null {
  const i = listHtml.indexOf("function goView(");
  if (i < 0) return null;
  const params = (listHtml.slice(i).match(/function goView\(([^)]*)\)/)?.[1] ?? "").split(",").map((p) => p.trim());
  const expr = listHtml.slice(i).match(/\burl\s*=\s*([^;]+);/)?.[1];
  if (!expr) return null;
  let out = "";
  for (const t of expr.matchAll(/'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*)/g)) {
    if (t[1] !== undefined) out += t[1];
    else if (t[2] !== undefined) out += t[2];
    else {
      const idx = params.indexOf(t[3]);
      out += idx >= 0 ? (args[idx] ?? "") : "";
    }
  }
  try {
    return new URL(out, base).toString();
  } catch {
    return null;
  }
}

async function listBoardCnts(board: BoardRef): Promise<ListedPost[]> {
  const page = await fetchPage(board.list_url);
  if (page.status !== 200) throw new Error(`목록 응답 ${page.status}`);
  const tbody = (page.text.match(/<tbody[\s\S]*?<\/tbody>/gi) ?? [page.text]).join("");
  const posts: ListedPost[] = [];
  for (const tr of tbody.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const call = tr.match(/goView\(([^)]*)\)/);
    if (!call) continue;
    const args = call[1].split(",").map((a) => a.trim().replace(/^['"]|['"]$/g, ""));
    const url = goViewUrl(page.text, args, page.url);
    if (!url) continue;
    const a = tr.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    const titleAttr = a?.[1].match(/title=["']([^"']+)["']/)?.[1];
    const firstCell = oneLine(tr.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    posts.push({
      postKey: new URL(url).searchParams.get("boardSeq") ?? args.join("-"),
      title: cleanTitle(titleAttr ? decodeEntities(titleAttr) : oneLine(a?.[2] ?? "")),
      postedOn: toIsoDate(oneLine(tr).match(/\d{4}[.\-]\d{2}[.\-]\d{2}/)?.[0]),
      url,
      pinned: !/^\d+$/.test(firstCell),
    });
  }
  if (posts.length === 0 && /goView\(/.test(tbody)) throw new Error("목록 형식이 바뀌었어요(글은 있는데 읽지 못함)");
  return posts;
}

async function detailBoardCnts(post: { url: string }): Promise<PostDetail> {
  const page = await fetchPage(post.url);
  if (page.status !== 200) throw new Error(`상세 응답 ${page.status}`);
  const html = page.text.replace(/<script[\s\S]*?<\/script>/gi, "");
  // 새 템플릿은 <td class="conts">, 옛 템플릿(충남 등)은 <th>내용</th><td>…</td> 줄이 본문이다.
  let body = sliceBetween(html, /class=["']conts["']/i, [/class=["'][^"']*file[^"']*["']/i, /<\/td>\s*<\/tr>\s*<\/tbody>/i, /class=["']btn/i]);
  if (!body) body = html.match(/<th[^>]*>\s*내용\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/i)?.[1] ?? "";
  // 강원 등 새 템플릿: <div class='viewBox'>
  if (!body) body = sliceBetween(html, /class=['"]viewBox['"]/i, [/class=['"][^'"]*(file|btn)[^'"]*['"]/i, /<\/article>/i]);
  const attachments = fileLinks(html, page.url, /file[_-]?down|download/i).filter((a) => !/urlfileMgt/i.test(a.url));
  // 옛 템플릿 첨부: <a href=javascript:goFileDown('해시')>파일이름</a> → /boardCnts/fileDown.do?fileSeq=해시
  for (const m of html.matchAll(/goFileDown\(\s*'([0-9a-f]+)'\s*\)[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = new URL(`/boardCnts/fileDown.do?fileSeq=${m[1]}`, page.url).toString();
    if (!attachments.some((a) => a.url === url)) attachments.push({ name: oneLine(m[2]), url, size: null });
  }
  return { bodyText: htmlToText(body), attachments, images: bodyImages(body, page.url) };
}

// ── tch (울산·충북·전북) ───────────────────────────────────
// 목록 <td class="tch-tit"><a href="/{학교}/{메뉴}/view/{ID}?">, 날짜 <td class="tch-dte">26.09.23</td>(두 자리 연도)

async function listTch(board: BoardRef): Promise<ListedPost[]> {
  const page = await fetchPage(board.list_url);
  if (page.status !== 200) throw new Error(`목록 응답 ${page.status}`);
  const posts: ListedPost[] = [];
  for (const tr of page.text.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const a = tr.match(/class="tch-tit"[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const url = new URL(decodeEntities(a[1]), page.url).toString();
    const d = oneLine(tr.match(/class="tch-dte"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "").match(/(\d{2,4})\.(\d{1,2})\.(\d{1,2})/);
    const year = d ? (d[1].length === 2 ? `20${d[1]}` : d[1]) : null;
    posts.push({
      postKey: url.match(/\/view\/(\d+)/)?.[1] ?? url,
      title: cleanTitle(oneLine(a[2])),
      postedOn: d && year ? `${year}-${d[2].padStart(2, "0")}-${d[3].padStart(2, "0")}` : null,
      url,
      pinned: /class="tch-ann"/.test(tr),
    });
  }
  if (posts.length === 0 && /class="tch-tit"[\s\S]*?\/view\//.test(page.text)) throw new Error("목록 형식이 바뀌었어요(글은 있는데 읽지 못함)");
  return posts;
}

async function detailTch(post: { url: string }): Promise<PostDetail> {
  const page = await fetchPage(post.url);
  if (page.status !== 200) throw new Error(`상세 응답 ${page.status}`);
  const html = page.text.replace(/<script[\s\S]*?<\/script>/gi, "");
  const body = sliceBetween(html, /class="tch-ctnt/i, [/<\/td>\s*<\/tr>/i, /class="tch-fil/i]);
  return { bodyText: htmlToText(body), attachments: fileLinks(html, page.url, /fileDownload/i), images: bodyImages(body, page.url) };
}

// ── c2z (광주 "안내장 등록대장") ──────────────────────────────
// 목록 <a href="/c2zHome/index.php?id=12&…&hno=1110&mode=fv">, 상세 본문 div.contentsarea, 첨부 homn_filedown.php

async function listC2z(board: BoardRef): Promise<ListedPost[]> {
  const page = await fetchPage(board.list_url);
  if (page.status !== 200) throw new Error(`목록 응답 ${page.status}`);
  const tbodies = page.text.match(/<tbody[\s\S]*?<\/tbody>/gi) ?? [];
  const posts: ListedPost[] = [];
  for (const tr of tbodies.join("").match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const a = tr.match(/<a[^>]*href=["']([^"']*mode=fv[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const url = new URL(decodeEntities(a[1]), page.url);
    const hno = url.searchParams.get("hno");
    if (!hno) continue;
    posts.push({
      postKey: hno,
      title: cleanTitle(oneLine(a[2])),
      postedOn: toIsoDate(oneLine(tr).match(/\d{4}[.\-]\d{2}[.\-]\d{2}/)?.[0]),
      url: `${url.origin}${url.pathname}?id=${url.searchParams.get("id") ?? ""}&hno=${hno}&mode=fv&page=1`,
      pinned: false,
    });
  }
  return posts;
}

async function detailC2z(post: { url: string }): Promise<PostDetail> {
  const page = await fetchPage(post.url);
  if (page.status !== 200) throw new Error(`상세 응답 ${page.status}`);
  const html = page.text.replace(/<script[\s\S]*?<\/script>/gi, "");
  const body = sliceBetween(html, /class="contentsarea"/i, [/class="boardfile"/i, /id="list_bottom"/i]);
  return { bodyText: htmlToText(body), attachments: fileLinks(html, page.url, /filedown/i), images: bodyImages(body, page.url) };
}

// ── xboard (광주 일부) ──────────────────────────────────────
// 2026-10 확인한 학교들은 가정통신문 게시판을 열면 로그인 화면으로 보낸다 — 가져올 수 없다고 분명히 알린다.

async function listXboard(board: BoardRef): Promise<ListedPost[]> {
  const page = await fetchPage(board.list_url);
  if (/mode=login/.test(page.url) || /location\.replace\(['"][^'"]*mode=login/.test(page.text)) {
    throw new Error("로그인해야 볼 수 있는 게시판이에요");
  }
  throw new Error("아직 읽지 못하는 게시판 형식이에요");
}

export async function listPosts(board: BoardRef): Promise<ListedPost[]> {
  switch (board.family) {
    case "na_ntt":
      return listNaNtt(board);
    case "sen_dggb":
      return listDggb(board);
    case "board_cnts":
      return listBoardCnts(board);
    case "tch":
      return listTch(board);
    case "c2z":
      return listC2z(board);
    case "xboard":
      return listXboard(board);
  }
  throw new Error(`아직 읽지 못하는 홈페이지 형식(${board.family})`);
}

export async function fetchDetail(board: BoardRef, post: { postKey: string; url: string }): Promise<PostDetail> {
  switch (board.family) {
    case "na_ntt":
      return detailNaNtt(post);
    case "sen_dggb":
      return detailDggb(board, post);
    case "board_cnts":
      return detailBoardCnts(post);
    case "tch":
      return detailTch(post);
    case "c2z":
      return detailC2z(post);
  }
  throw new Error(`아직 읽지 못하는 홈페이지 형식(${board.family})`);
}

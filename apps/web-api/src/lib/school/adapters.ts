import { decodeEntities, fetchPage, htmlToText, oneLine } from "./http";

/**
 * 학교 홈페이지 형식(CMS)별 게시판 읽기. 학교 4,700곳이 아니라 "형식 10~15개"의 문제다(REPORT §4.4).
 * 지금 읽는 형식:
 * - `na_ntt`  — 경기·부산·경북·경남·제주·강원 일부 (조사 표본의 44%)
 * - `sen_dggb` — 서울 (목록·상세가 AJAX)
 * 나머지 형식은 게시판을 찾아도 "아직 지원 안 함"으로 남긴다(조용히 0건이 되지 않게).
 */
export type Family = "na_ntt" | "sen_dggb";
export const SUPPORTED_FAMILIES: Family[] = ["na_ntt", "sen_dggb"];

export type BoardRef = { family: string; list_url: string; params: Record<string, string> };
export type ListedPost = { postKey: string; title: string; postedOn: string | null; url: string; pinned: boolean };
export type Attachment = { name: string; url: string; size: number | null };
export type PostDetail = { bodyText: string; attachments: Attachment[] };

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
  url.searchParams.set("currPage", "1");
  const page = await fetchPage(url.toString());
  if (page.status !== 200) throw new Error(`목록 응답 ${page.status}`);
  const tbody = page.text.match(/<tbody[\s\S]*?<\/tbody>/i)?.[0] ?? "";
  const rows = tbody.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const posts: ListedPost[] = [];
  for (const tr of rows) {
    const a = tr.match(/<a[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const detail = new URL(board.list_url.replace("selectNttList.do", "selectNttInfo.do"));
    detail.searchParams.delete("currPage");
    detail.searchParams.set("nttSn", a[1]);
    posts.push({
      postKey: a[1],
      title: cleanTitle(oneLine(a[2])),
      postedOn: toIsoDate(oneLine(tr).match(/\d{4}[.\-]\d{2}[.\-]\d{2}/)?.[0]),
      url: detail.toString(),
      pinned: /class="noti"/i.test(tr),
    });
  }
  // 자기검증: 행에 글 ID가 있는데 하나도 못 읽었다면 형식이 바뀐 것 — 조용히 0건으로 넘기지 않는다(REPORT §8.2 장치 1).
  if (posts.length === 0 && /data-id="\d+"/.test(page.text)) throw new Error("목록 형식이 바뀌었어요(글은 있는데 읽지 못함)");
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
    body = cont?.[1] ?? "";
  }
  const origin = new URL(post.url).origin;
  const attachments: Attachment[] = [];
  for (const m of html.matchAll(/AddUploadedFile\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'(\d*)'/g)) {
    attachments.push({ name: decodeEntities(m[2]), url: new URL(m[3], origin).toString(), size: m[4] ? Number(m[4]) : null });
  }
  return { bodyText: htmlToText(body), attachments };
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
    const view = tr.match(/fnView\(\s*'([^']+)'\s*,\s*'(\d+)'\s*\)/);
    if (!view) continue;
    const a = tr.match(/<a[^>]*fnView[^>]*>([\s\S]*?)<\/a>/i);
    const firstCell = oneLine(tr.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    posts.push({
      postKey: view[2],
      title: cleanTitle(oneLine(a?.[1] ?? "")),
      postedOn: toIsoDate(oneLine(tr).match(/\d{4}-\d{2}-\d{2}/)?.[0]),
      // 상세가 AJAX라 글마다 열 주소가 없다 — 게시판 화면으로 보낸다.
      url: board.list_url,
      pinned: !/^\d+$/.test(firstCell),
    });
  }
  if (posts.length === 0 && /fnView\(/.test(page.text)) throw new Error("목록 형식이 바뀌었어요(글은 있는데 읽지 못함)");
  return posts;
}

async function detailDggb(board: BoardRef, post: { postKey: string }): Promise<PostDetail> {
  const s = await dggbSession(board);
  const origin = new URL(board.list_url).origin;
  const page = await fetchPage(`${origin}/dggb/module/board/selectBoardDetailAjax.do`, {
    method: "POST",
    cookie: s.cookie,
    headers: dggbHeaders(board),
    form: { bbsId: s.bbsId, nttId: post.postKey, bbsTyCode: s.bbsTyCode, pageIndex: "1" },
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
  return { bodyText: htmlToText(body), attachments };
}

export async function listPosts(board: BoardRef): Promise<ListedPost[]> {
  if (board.family === "na_ntt") return listNaNtt(board);
  if (board.family === "sen_dggb") return listDggb(board);
  throw new Error(`아직 읽지 못하는 홈페이지 형식(${board.family})`);
}

export async function fetchDetail(board: BoardRef, post: { postKey: string; url: string }): Promise<PostDetail> {
  if (board.family === "na_ntt") return detailNaNtt(post);
  if (board.family === "sen_dggb") return detailDggb(board, post);
  throw new Error(`아직 읽지 못하는 홈페이지 형식(${board.family})`);
}

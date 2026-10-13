import { absolutize, fetchPage, oneLine, type Page } from "./http";
import type { Family } from "./adapters";

/**
 * 학교 홈페이지에서 가정통신문 게시판 찾기(REPORT §7 1~4단계).
 * 1) NEIS 홈페이지 주소 → 2) JS `location.href`·meta refresh 리다이렉트를 따라감
 * → 3) 메뉴 링크 중 이름이 가정통신문·가정통신문(교육청)·주간학습안내인 것 → 4) 주소·내용으로 형식(어댑터) 판별.
 * NEIS 주소가 로그인·모바일·소개 페이지인 학교(대구·충남·제주 일부)가 있어서, 못 찾으면 사이트 첫 화면에서 한 번 더 찾는다.
 */
export type BoardKind = "notice" | "office_notice" | "weekly";
export type FoundBoard = { kind: BoardKind; label: string; family: Family | "unknown"; list_url: string; params: Record<string, string> };

/**
 * 메뉴 이름 → 게시판 종류. 첫 화면의 "최근 글" 목록에 있는 글 제목(예: "촉감 완구 사용 안내 가정통신문")을
 * 게시판으로 착각하지 않게, 짧은 메뉴 이름만 받는다.
 */
export function boardKind(label: string): BoardKind | null {
  const t = label.replace(/\s+/g, "").replace(/(더보기|바로가기|more|\+)$/i, "");
  if (!t || /전체보기|작성|등록|신청|회신|예시|안내$|사용|주의/.test(t)) return null;
  if (/주간(학습|교육)/.test(t)) return t.length <= 16 ? "weekly" : null;
  // "가람통신문"·"간성통신문"처럼 학교 이름을 붙인 가정통신문 게시판도 있다(옛 글 보관용 "~이전"은 뺀다).
  if (/^[가-힣]{1,6}통신문?$/.test(t) && !/이전|예전|지난/.test(t)) return "notice";
  if (t.length > 14 || !/가정통신/.test(t)) return null;
  return /교육청|교육지원청/.test(t) ? "office_notice" : "notice";
}

/** 주소만으로 알 수 있는 형식. 모르면 null — 목록 페이지 내용을 보고 다시 판단한다. */
function familyByUrl(url: URL): Family | null {
  if (/\/na\/ntt\/selectNttList\.do$/i.test(url.pathname) && url.searchParams.get("bbsId")) return "na_ntt";
  if (/^\/\d+\/subMenu\.do$/i.test(url.pathname)) return "sen_dggb";
  if (/\/boardCnts\/list\.do$/i.test(url.pathname) && url.searchParams.get("boardID")) return "board_cnts";
  if (/\/xboard\/board\.php$/i.test(url.pathname) && url.searchParams.get("tbnum")) return "xboard";
  if (/^\/c2zHome\/?(index\.php)?$/i.test(url.pathname) && url.searchParams.get("id")) return "c2z";
  return null;
}

function familyByContent(html: string): Family | null {
  if (/class="tch-tit"/.test(html)) return "tch";
  if (/goView\(\s*'\d+'/.test(html) && /boardCnts/.test(html)) return "board_cnts";
  if (/nttInfoBtn/.test(html) && /selectNttInfo/.test(html)) return "na_ntt";
  if (/c2zHome\/index\.php[^"']*mode=fv/.test(html)) return "c2z";
  return null;
}

/** 리다이렉트용 껍데기 페이지(짧은 HTML에 location.href/meta refresh만 있는 것)면 다음 주소를 돌려준다. */
function shellRedirect(html: string, base: string): string | null {
  if (html.length > 6000) return null;
  const js = html.match(/location\.(?:href|replace)\s*(?:=|\()\s*["']([^"']+)["']/i);
  const meta = html.match(/http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>\s]+)/i);
  const next = js?.[1] ?? meta?.[1];
  return next ? absolutize(next, base) : null;
}

async function openHome(url: string, visited: string[]): Promise<Page> {
  let page = await fetchPage(url);
  visited.push(url, page.url);
  for (let hop = 0; hop < 3; hop++) {
    const next = shellRedirect(page.text, page.url);
    if (!next || next === page.url) break;
    page = await fetchPage(next);
    visited.push(next, page.url);
  }
  return page;
}

/**
 * NEIS 주소로 못 찾았을 때 다시 볼 첫 화면 후보: 사이트 뿌리, /main.do(충남은 뿌리가 모바일로 보낸다),
 * 지나온 주소의 학교 코드 경로/main.do(대구는 /ksadaee/sso/... 로 돌아가는데 진짜 첫 화면은 /ksadaee/main.do).
 */
function homeCandidates(first: string, visited: string[]): string[] {
  const origin = new URL(first).origin;
  const out = [`${origin}/`, `${origin}/main.do`];
  for (const v of visited) {
    try {
      const seg = new URL(v).pathname.split("/")[1];
      if (seg && !/\.|^(sso|mobile\d*|main|index)$/i.test(seg)) out.push(`${origin}/${seg}/main.do`);
    } catch {
      // 깨진 주소는 건너뛴다.
    }
  }
  return [...new Set(out)];
}

function menuBoards(page: Page): FoundBoard[] {
  const homeHost = new URL(page.url).hostname;
  const seen = new Set<string>();
  const boards: FoundBoard[] = [];
  for (const m of page.text.matchAll(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = oneLine(m[2]);
    const kind = boardKind(label);
    if (!kind) continue;
    const abs = absolutize(m[1], page.url);
    if (!abs) continue;
    const u = new URL(abs);
    // 학교 홈페이지 밖(교육청 공용 링크 등)으로 나가는 링크는 그 학교 게시판이 아니다.
    if (u.hostname !== homeHost) continue;
    for (const p of ["currPage", "page", "pageIndex"]) u.searchParams.delete(p);
    const key = u.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    boards.push({ kind, label: label.replace(/\s*(더보기|바로가기)$/, ""), family: familyByUrl(u) ?? "unknown", list_url: key, params: {} });
  }
  return boards;
}

export async function discoverBoards(homepage: string): Promise<{ boards: FoundBoard[]; home: string }> {
  const visited: string[] = [];
  let page = await openHome(homepage, visited);
  let boards = page.status === 200 ? menuBoards(page) : [];
  const tried = new Set(visited);
  // 후보를 열다 보면 새 학교 코드 경로가 드러난다(대구: 뿌리 → /ksadaee/sso/…) — 두 바퀴까지 다시 계산한다.
  for (let round = 0; round < 2 && boards.length === 0; round++) {
    for (const cand of homeCandidates(page.url, visited)) {
      if (tried.has(cand)) continue;
      tried.add(cand);
      try {
        const next = await openHome(cand, visited);
        const found = next.status === 200 ? menuBoards(next) : [];
        if (found.length > 0) {
          page = next;
          boards = found;
          break;
        }
      } catch {
        // 다음 후보로.
      }
    }
  }
  if (page.status !== 200 && boards.length === 0) throw new Error(`홈페이지 응답 ${page.status}`);

  // 주소로 모르는 게시판은 목록 페이지를 열어 형식을 알아낸다. 서울형은 게시판 ID를 미리 읽어 둔다.
  for (const b of boards) {
    if (b.family !== "unknown" && b.family !== "sen_dggb") continue;
    try {
      const list = await fetchPage(b.list_url);
      if (b.family === "sen_dggb") {
        const bbsId = list.text.match(/name="bbsId"[^>]*value="([^"]+)"/)?.[1];
        const ty = list.text.match(/name="bbsTyCode"[^>]*value="([^"]+)"/)?.[1];
        if (bbsId) b.params = { bbsId, bbsTyCode: ty ?? "dliv" };
        else b.family = familyByContent(list.text) ?? "unknown";
      } else {
        b.family = familyByContent(list.text) ?? "unknown";
        if (list.url !== b.list_url && b.family !== "unknown") b.list_url = list.url;
      }
    } catch {
      // 한 게시판을 못 열어도 나머지는 계속 본다.
    }
  }
  // 같은 게시판이 메뉴 여러 곳에 조금씩 다른 주소로 걸려 있다("/c2zHome?id=12"와 "/c2zHome/?id=12" 등) — 하나만 남긴다.
  const seenKeys = new Set<string>();
  const unique = boards.filter((b) => {
    const k = boardKey(b);
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });
  return { boards: unique, home: page.url };
}

function boardKey(b: FoundBoard): string {
  try {
    const u = new URL(b.list_url);
    const id =
      u.searchParams.get("bbsId") ?? u.searchParams.get("boardID") ?? u.searchParams.get("tbnum") ?? u.searchParams.get("id") ?? b.params.bbsId;
    if (id) return `${u.host}|${b.family}|${id}`;
    return `${u.host}|${u.pathname.replace(/\/(list|index\.do)?$/i, "")}`;
  } catch {
    return b.list_url;
  }
}

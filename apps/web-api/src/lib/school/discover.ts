import { absolutize, fetchPage, oneLine } from "./http";
import type { Family } from "./adapters";

/**
 * 학교 홈페이지에서 가정통신문 게시판 찾기(REPORT §7 1~4단계).
 * 1) NEIS 홈페이지 주소 → 2) JS `location.href`·meta refresh 리다이렉트를 최대 3번 따라감
 * → 3) 메뉴 링크 중 이름이 가정통신문·가정통신문(교육청)·주간학습안내인 것 → 4) 주소 모양으로 형식(어댑터) 판별.
 */
export type BoardKind = "notice" | "office_notice" | "weekly";
export type FoundBoard = { kind: BoardKind; label: string; family: Family | "unknown"; list_url: string; params: Record<string, string> };

export function boardKind(label: string): BoardKind | null {
  const t = label.replace(/\s+/g, "");
  if (!t || t.length > 20 || /전체보기|작성|등록|신청|회신/.test(t)) return null;
  if (/주간학습|주간교육/.test(t)) return "weekly";
  if (/가정통신문?/.test(t) && /교육청|교육지원청/.test(t)) return "office_notice";
  if (/가정통신문?/.test(t)) return "notice";
  return null;
}

function familyOf(url: URL): Family | "unknown" {
  if (/\/na\/ntt\/selectNttList\.do$/i.test(url.pathname) && url.searchParams.get("bbsId")) return "na_ntt";
  if (/^\/\d+\/subMenu\.do$/i.test(url.pathname)) return "sen_dggb";
  return "unknown";
}

/** 리다이렉트용 껍데기 페이지(짧은 HTML에 location.href/meta refresh만 있는 것)면 다음 주소를 돌려준다. */
function shellRedirect(html: string, base: string): string | null {
  if (html.length > 6000) return null;
  const js = html.match(/location\.(?:href|replace)\s*(?:=|\()\s*["']([^"']+)["']/i);
  const meta = html.match(/http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>\s]+)/i);
  const next = js?.[1] ?? meta?.[1];
  return next ? absolutize(next, base) : null;
}

export async function discoverBoards(homepage: string): Promise<{ boards: FoundBoard[]; home: string }> {
  let url = homepage;
  let page = await fetchPage(url);
  for (let hop = 0; hop < 3; hop++) {
    const next = shellRedirect(page.text, page.url);
    if (!next || next === page.url) break;
    url = next;
    page = await fetchPage(url);
  }
  if (page.status !== 200) throw new Error(`홈페이지 응답 ${page.status}`);
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
    u.searchParams.delete("currPage");
    const key = u.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    boards.push({ kind, label, family: familyOf(u), list_url: key, params: {} });
  }

  // 서울형은 메뉴 페이지 안에 게시판 ID가 있다 — 미리 읽어 두면 매번 찾지 않아도 된다.
  for (const b of boards) {
    if (b.family !== "sen_dggb") continue;
    try {
      const menu = await fetchPage(b.list_url);
      const bbsId = menu.text.match(/name="bbsId"[^>]*value="([^"]+)"/)?.[1];
      const ty = menu.text.match(/name="bbsTyCode"[^>]*value="([^"]+)"/)?.[1];
      if (bbsId) b.params = { bbsId, bbsTyCode: ty ?? "dliv" };
      else b.family = "unknown";
    } catch {
      b.family = "unknown";
    }
  }
  return { boards, home: page.url };
}

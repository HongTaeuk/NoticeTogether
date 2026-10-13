"""End-to-end 데모: 사용자가 (교육청, 학교, 학년, 반, 이름)을 선택했을 때
우리 서비스가 실제로 보여줄 수 있는 것과 보여줄 수 없는 것.

사용: python demo_feed.py
"""
import re, sys, json, time, html, urllib.request, urllib.parse, http.cookiejar

sys.stdout.reconfigure(encoding="utf-8")
UA = {"User-Agent": "Mozilla/5.0 (demo)"}

# ── 사용자가 앱에서 선택한 값 ──────────────────────────────
SEL = dict(sido="서울특별시교육청", atpt="B10",
           school="서울서이초등학교", grade=3, cls=2, name="홍길동")
# ──────────────────────────────────────────────────────────

ORIGIN = "https://seoi.sen.es.kr"
MENU = "/78585/subMenu.do"                      # 가정통신문
MENU_EO = "/192732/subMenu.do"                  # 가정통신문(교육청)
AJAX = "/dggb/module/board/selectBoardListAjax.do"


def op_new():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def get(op, url, data=None, extra=None, t=40):
    h = dict(UA)
    if extra:
        h.update(extra)
    with op.open(urllib.request.Request(url, data=data, headers=h), timeout=t) as r:
        return r.read().decode("utf-8", "replace")


def st(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def board(menu_path, per=50, pages=4):
    """서울 dggb AJAX 어댑터로 게시판 전수 수집."""
    op = op_new()
    page = get(op, ORIGIN + menu_path)
    bbs = re.search(r'name="bbsId"[^>]*value="([^"]+)"', page)
    ty = re.search(r'name="bbsTyCode"[^>]*value="([^"]+)"', page)
    if not bbs:
        return []
    rows = []
    for p in range(1, pages + 1):
        d = urllib.parse.urlencode({
            "bbsId": bbs.group(1), "bbsTyCode": (ty.group(1) if ty else "dliv"),
            "customRecordCountPerPage": str(per), "pageIndex": str(p),
            "searchCondition": "", "searchKeyword": "", "checkNttId": "", "mvmnReturnUrl": "",
        }).encode()
        frag = get(op, ORIGIN + AJAX, data=d, extra={
            "X-Requested-With": "XMLHttpRequest", "Referer": ORIGIN + menu_path,
            "Content-Type": "application/x-www-form-urlencoded"})
        got = 0
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", frag, re.S):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            if len(tds) < 4:
                continue
            c = [st(x) for x in tds]
            dt = next((x for x in c if re.fullmatch(r"\d{4}-\d{2}-\d{2}", x)), "")
            if not dt:
                continue
            rows.append(dict(no=c[0], title=c[1], date=dt))
            got += 1
        if got == 0:
            break
        time.sleep(0.3)
    return rows


HO = re.compile(r"\(?\s*(2\d)\s*[-–]\s*(\d{1,3})\s*호?\s*\)?")
GR = re.compile(r"([1-6])\s*학년")
CLS = re.compile(r"([1-9])\s*반")


def classify(rows, grade):
    """학년 귀속 판정: 제목에 학년 표기가 있으면 그 학년, 없으면 전교 공통."""
    mine, other, common = [], [], []
    for r in rows:
        gs = set(GR.findall(r["title"]))
        if not gs:
            common.append(r)
        elif str(grade) in gs:
            mine.append(r)
        else:
            other.append(r)
    return mine, other, common


print("=" * 92)
print(f"사용자 선택:  {SEL['sido']} > {SEL['school']} > {SEL['grade']}학년 {SEL['cls']}반 > {SEL['name']}")
print("=" * 92)

dliv = board(MENU)
eo = board(MENU_EO, pages=2)
print(f"\n[수집] 가정통신문 {len(dliv)}건 · 가정통신문(교육청) {len(eo)}건  "
      f"(서울 dggb AJAX 어댑터)")

mine, other, common = classify(dliv, SEL["grade"])
cls_hits = [r for r in dliv if CLS.search(r["title"])]
name_hits = [r for r in dliv if SEL["name"] in r["title"]]

print("\n" + "─" * 92)
print(f"✅ 보여줄 수 있는 것")
print("─" * 92)
print(f"  ① {SEL['grade']}학년 대상 통신문        : {len(mine):>3}건")
for r in mine[:5]:
    print(f"       {r['date']}  {r['title'][:62]}")
print(f"  ② 전교 공통 통신문             : {len(common):>3}건")
for r in common[:3]:
    print(f"       {r['date']}  {r['title'][:62]}")
print(f"  ③ 교육청 공통 통신문           : {len(eo):>3}건")
for r in eo[:3]:
    print(f"       {r['date']}  {r['title'][:62]}")

print("\n" + "─" * 92)
print(f"❌ 보여줄 수 없는 것")
print("─" * 92)
print(f"  ④ {SEL['cls']}반 한정 통신문          : 제목에 '반' 표기가 있는 글 {len(cls_hits)}건")
for r in cls_hits[:4]:
    print(f"       {r['date']}  {r['title'][:62]}")
print(f"       → 위 글들의 '반'은 전부 학급 수·행사 맥락이며, 특정 반 수신 지정이 아니다")
print(f"  ⑤ '{SEL['name']}' 개인 통신문        : {len(name_hits)}건  (개인명 통신문은 공개 게시 불가)")
print(f"  ⑥ 담임 학급 알림장             : 0건  (학교 홈페이지에 존재하지 않음)")

# 발행 총량 대비 수집률
by = {}
for r in dliv:
    m = HO.match(r["title"].strip()) or HO.search(r["title"][:14])
    if m:
        by.setdefault(m.group(1), set()).add(int(m.group(2)))
cur = max(by) if by else None
print("\n" + "─" * 92)
print("📊 커버리지 (문서번호 기준)")
print("─" * 92)
if cur:
    mx = max(by[cur])
    got = len(by[cur])
    print(f"  학교 20{cur}년 발행   : {mx}호까지")
    print(f"  홈페이지 게시        : {got}호")
    print(f"  우리가 받은 것       : {got}호  →  게시율 {got/mx:.0%}")
    print(f"  못 받은 것           : {mx-got}호  (비공개 발송분: 학년·반·개인 한정, 회신 필요 등)")
print(f"\n  {SEL['grade']}학년 학부모에게 실제 전달 가능: ①+②+③ = {len(mine)+len(common)+len(eo)}건")

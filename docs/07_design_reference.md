# 07. 디자인 레퍼런스 — Toss Design System (TDS) Mobile 정리

> **출처**: https://tossmini-docs.toss.im/tds-mobile/ (토스미니 개발자 문서 내 TDS Mobile 섹션)
> **작성 목적**: NoticeTogether(알림투게더)를 향후 토스 앱인토스(tossmini)에 입점시킬 것을 대비하여, TDS Mobile의 디자인 원칙·컴포넌트 스펙·토큰 값을 로컬 문서로 보관하고 UI 설계 시 참고하기 위함.
> **작성 방식**: 사이트 내 모든 링크(사이드바 기준 약 55개 하위 페이지)를 순회하며 WebFetch로 수집. 단, WebFetch는 페이지를 요약해서 반환하므로 일부 수치(특히 여백·모서리 반경·정확한 색상 hex)는 원문에 없거나 요약 과정에서 누락되었을 수 있음. **"문서에 값 없음"으로 표기된 항목은 실제 사용 전 반드시 출처 URL에서 직접 재확인할 것.** 값을 임의로 추정/생성하지 않았음.

---

## 목차

1. [디자인 원칙 (소개)](#1-디자인-원칙-소개)
2. [시작하기](#2-시작하기)
3. [Foundation — Colors (색상)](#3-foundation--colors-색상)
4. [Foundation — Typography (타이포그래피)](#4-foundation--typography-타이포그래피)
5. [기본 컴포넌트 (Components)](#5-기본-컴포넌트-components)
6. [컴포넌트 그룹 (Agreement / Asset / BottomCTA / Chart / Dialog / Keypad / ListRow / TextField)](#6-컴포넌트-그룹)
7. [Hooks — Overlay Extension](#7-hooks--overlay-extension)
8. [마이그레이션 가이드](#8-마이그레이션-가이드)
9. [NoticeTogether 적용 시 참고 메모](#9-noticetogether-적용-시-참고-메모)
10. [출처 페이지 목록](#10-출처-페이지-목록)

---

## 1. 디자인 원칙 (소개)

TDS Mobile 랜딩 페이지(`/tds-mobile/`)에서 밝히는 3가지 핵심 목표:

1. **일관성과 품질 (Consistency & Quality)** — 표준화된 UI 요소를 통해 "최소한의 제품 품질을 보장"
2. **생산성 (Productivity)** — 재사용 가능한 컴포넌트를 통한 "효율적인 UI 개발"
3. **탁월함 (Excellence)** — 통일된 인터랙션과 애니메이션을 통해 "업계 최고 수준의 제품 완성도" 달성

## 2. 시작하기

출처: `/tds-mobile/start/`

- TDS Mobile은 "모바일 환경에서 다양한 UI 컴포넌트를 손쉽게 적용"할 수 있게 해주는 패키지.
- 구현은 **설치 → Provider 설정 → 컴포넌트 사용**의 3단계 순서를 따름.
- 필수 의존성: `@emotion/react`, React 18, React DOM 18.
- 핵심 가이드 문구: "TDS Mobile을 사용하려면, 프로젝트의 최상위를 `TDSMobileAITProvider`로 감싸야 해요." (v2 마이그레이션 이후 명칭. 과거에는 `TDSMobileBedrockProvider`였음 — [마이그레이션 가이드](#8-마이그레이션-가이드) 참고)

## 3. Foundation — Colors (색상)

출처: `/tds-mobile/foundation/colors/`

설치: `yarn add @toss/tds-colors`

> "토스의 색상 시스템은 개발자와 디자이너가 **통일된 색상 이름**을 사용하도록 도와줘요."

### 3.1 기본 팔레트 (Grey)

| 토큰 | Hex |
|---|---|
| colors.grey50 | #f9fafb |
| colors.grey100 | #f2f4f6 |
| colors.grey200 | #e5e8eb |
| colors.grey300 | #d1d6db |
| colors.grey400 | #b0b8c1 |
| colors.grey500 | #8b95a1 |
| colors.grey600 | #6b7684 |
| colors.grey700 | #4e5968 |
| colors.grey800 | #333d4b |
| colors.grey900 | #191f28 |

### 3.2 그 외 팔레트 (범위값, 50~900)

| 팔레트 | 범위 (50 → 900) |
|---|---|
| Blue | #e8f3ff → #194aa6 |
| Red | #ffeeee → #a51926 |
| Orange | #fff3e0 → #e45600 |
| Yellow | #fff9e7 → #dd7d02 |
| Green | #f0faf6 → #027648 |
| Teal | #edf8f8 → #076565 |
| Purple | #f9f0fc → #65237b |

> 주의: WebFetch 요약 결과에는 각 팔레트의 50~900 사이 중간 단계(100~800) 개별 hex 값이 생략되어 있음. Grey처럼 10단계 전체가 필요하면 반드시 `/tds-mobile/foundation/colors/` 원문을 직접 열어 확인할 것.

### 3.3 Grey Opacity

| 토큰 | 값 |
|---|---|
| colors.greyOpacity50 ~ greyOpacity900 | #001733 (0.02 알파) ~ #020913 (0.91 알파) 범위 |

### 3.4 배경 색상

| 용도 | 토큰 | 값 |
|---|---|---|
| 기본 배경 | colors.background | #FFFFFF |
| 그레이 배경 | colors.greyBackground | lightThemeGrey100 |
| 레이어드 배경 | colors.layeredBackground | #FFFFFF |
| 플로팅 배경 | colors.floatedBackground | #FFFFFF |

### 3.5 컴포넌트에서 반복 등장하는 adaptive 색상 토큰 (다크모드 대응 색상)

여러 컴포넌트 문서에서 공통적으로 참조되는 `adaptive.*` 토큰(라이트/다크 모드 자동 대응):

| 토큰 | 주 용도 (등장 컴포넌트) |
|---|---|
| adaptive.grey800 | 타이틀 텍스트 (ListHeader, Top, AlertDialog, ConfirmDialog 타이틀) |
| adaptive.grey700 | 설명/보조 텍스트 (ListHeader) |
| adaptive.grey600 | 보조 텍스트, 설명 텍스트 (ListHeader, Top 아이콘, AlertDialog/ConfirmDialog 설명) |
| adaptive.grey400 | 화살표 아이콘, 비활성 아이콘 (ListHeader, BoardRow) |
| adaptive.blue500 | 필수 동의 표시, 링크, ListFooter 텍스트/아이콘 기본색, BoardRow 접두사 |
| adaptive.greyOpacity100 | IconButton/ListRow.IconButton 기본 배경색 |
| adaptive.greyBackground | BottomInfo 그라디언트 시작색 |
| adaptive.yellow50 / adaptive.yellow500 | AgreementV4 필수 배지(배경/텍스트) |

## 4. Foundation — Typography (타이포그래피)

출처: `/tds-mobile/foundation/typography/`

> 핵심 가이드: "사용자는 계층화된 토큰을 그대로 사용하도록 추상화되어 있어요" — 즉 폰트 크기를 하드코딩하지 말고 토큰(t1~t7, st1~st13)을 그대로 사용할 것.
> 접근성: iOS/Android의 큰 텍스트 모드(다이나믹 타입)에 대응하는 동적 스케일링 지원.

### 4.1 타이포그래피 토큰 표 (px)

| 토큰 | Font Size | Line Height | 한글 용도 | 영문 용도 |
|---|---|---|---|---|
| Typography 1 (t1) | 30 | 40 | 매우 큰 제목 | Very Large Title |
| sub Typography 1 | 29 | 38 | - | - |
| sub Typography 2 | 28 | 37 | - | - |
| sub Typography 3 | 27 | 36 | - | - |
| Typography 2 (t2) | 26 | 35 | 큰 제목 | Large Title |
| sub Typography 4 | 25 | 34 | - | - |
| sub Typography 5 | 24 | 33 | 조금 큰 제목 | Slightly Large Title |
| sub Typography 6 | 23 | 32 | - | - |
| Typography 3 (t3) | 22 | 31 | 일반 제목 | Regular Title |
| sub Typography 7 | 21 | 30 | - | - |
| Typography 4 (t4) | 20 | 29 | 작은 제목 | Small Title |
| sub Typography 8 | 19 | 28 | 조금 큰 본문 | Slightly Large Body |
| sub Typography 9 | 18 | 27 | - | - |
| Typography 5 (t5) | 17 | 25.5 | 일반 본문 | Regular Body |
| sub Typography 10 | 16 | 24 | - | - |
| Typography 6 (t6) | 15 | 22.5 | 작은 본문 | Small Body |
| sub Typography 11 | 14 | 21 | - | - |
| Typography 7 (t7) | 13 | 19.5 | 안 읽어도 됨 | Optional Reading |
| sub Typography 12 | 12 | 18 | - | - |
| sub Typography 13 | 11 | 16.5 | 아예 안읽어도 됨 | Not Required Reading |

> t1~t7이 "본문/타이틀에 자주 쓰는" 메인 레벨, st1~st13("서브 타이틀 또는 부가 텍스트용")이 세부 단계. sub Typography 표의 정확한 st 번호 매핑(예: sub Typography 8 = st8인지)은 요약에서 명확히 구분되지 않아 원문 확인 필요.

### 4.2 폰트 굵기 (Weight)

- Typography_Light
- Typography_Regular
- Typography_Medium
- Typography_Semibold
- Typography_Bold

## 5. 기본 컴포넌트 (Components)

`/tds-mobile/components/` 하위, 그룹 없이 단독으로 존재하는 컴포넌트들.

### 5.1 Button

- **variant(스타일)**: `fill`(고채도, 주요 액션) / `weak`(저채도, 보조 액션)
- **color**: primary, dark, danger, light
- **display 모드**: inline, block, full
- **html type**: button, submit, reset
- **size**: small, medium, large, xlarge(기본값)
- **상태**:
  - 기본: variant별 배경색 100% opacity
  - Pressed: `--button-pressed-background-color` + `--button-pressed-opacity`로 dim 처리
  - Disabled: `--button-disabled-opacity-color`, `--button-disabled-text-opacity`로 투명도 감소
  - Loading: 그라디언트 스피너(`--button-loader-color`), dim 레이어(`--button-loading-background-color`, `--button-loading-opacity`)
- **커스터마이즈 CSS 변수**: `--button-color`, `--button-background-color`, `--button-disabled-opacity-color`, `--button-disabled-text-opacity`, `--button-gradient-color`, `--button-loader-color`, `--button-loading-background-color`, `--button-loading-opacity`, `--button-pressed-background-color`, `--button-pressed-opacity`
- **접근성**: role="button", 로딩 시 aria-busy, 아이콘 전용 버튼은 aria-label 필수
- 예시에서 버튼 간 gap 8px 사용 (정식 스펙 아님)
- 모서리 반경(corner radius): 문서에 값 없음 → 원문 확인 필요

### 5.2 Badge

- **variant**: fill(고채도, 중요 항목 강조) / weak(저채도)
- **size**: xsmall, small, medium, large
- **color**: blue, teal, green, red, yellow, elephant
- 용도: "항목의 상태를 빠르게 인식할 수 있도록"
- 모서리 반경·타이포·간격: 문서에 값 없음

### 5.3 Modal

- 구조: `Modal.Overlay` + `Modal.Content` 2개 서브 컴포넌트
- 예시 패딩: `32px 20px 20px 20px` (코드 예시일 뿐 공식 스펙 아님일 수 있음)
- content 레이아웃: flexbox column, 중앙 정렬
- 접근성: 열려있을 때 외부 콘텐츠에 aria-hidden, tabIndex={0}으로 포커스 자동 이동, overlay에 role="button"
- 상태: open={true/false}
- 콜백: onOpenChange, onExited(애니메이션 종료 후), Overlay onClick
- 렌더링: 기본 document.body에 포탈, portalContainer로 커스텀 가능
- 색상/모서리 반경/그림자: 문서에 값 없음

### 5.4 Toast

- **위치**: top, bottom
- **노출 시간**: 기본 3000ms, 버튼 있을 시 기본 5000ms, 시간 경과 후 자동 닫힘
- **구성요소**: leftAddon(아이콘/Lottie), button(bottom 위치 전용), text, higherThanCTA(고정 하단 CTA 위에 표시할지)
- **기본 frameShape**: `{ width: 24, height: 24 }`
- **접근성**: aria-live="polite"(기본) / "assertive"(긴급)
- **닫힘 트리거**: 시간 경과, 드래그, 상태 변경, 버튼 클릭
- **콜백**: onClose, onExited
- 색상/타이포/모서리 반경: 문서에 값 없음

### 5.5 Tab

- **size**: large(기본, 높이·텍스트 큼), small
- **itemGap**: px 단위로 커스텀 가능 (예: 36)
- **fluid**: true 시 콘텐츠 너비에 맞춰 가로 스크롤 (4개 이상 항목 시 fluid 미사용이면 최대 4개 권장)
- **상태**: selected(aria-selected 자동 반영), redBean(우측 상단 빨간 점 알림 표시, title에 "(업데이트 있음)" 자동 추가)
- **접근성**: role="tablist"/"tab", aria-selected, aria-label
- 색상/폰트 크기: 문서에 값 없음

### 5.6 Checkbox

- **variant**: Checkbox.Circle(원 안 체크), Checkbox.Line(체크만)
- **inputType**: 'checkbox'(기본) / 'radio'
- **size**: 기본 24px, 숫자로 커스터마이즈 가능
- **상태**: checked/unchecked(aria-checked), disabled(aria-disabled, 흔들림 애니메이션), defaultChecked(비제어), checked+onCheckedChange(제어)
- 예시 gap: 8px
- **접근성**: aria-label 필수 제공 권장(예: "이용약관 동의"), "체크박스"라는 단어는 aria-label에 포함하지 말 것(스크린리더가 role을 이미 읽어줌)

### 5.7 Switch

- **상태**: checked(on)/unchecked(off), disabled
- **props**: checked, disabled(기본 false), hasTouchEffect(기본 true), name
- **인터랙션**: onChange, onClick, 터치 애니메이션 hasTouchEffect={false}로 비활성화 가능
- **접근성**: role="switch", aria-checked, aria-disabled, aria-label 권장
- 색상/치수/모서리반경/애니메이션 시간: 문서에 값 없음

### 5.8 TextButton

- **size**: xsmall, small, medium, large, xlarge, xxlarge
- **variant**: arrow(우측 화살표), underline(밑줄), clear(기본)
- **상태**: active, disabled
- ParagraphText 컴포넌트를 확장하여 제작 — 타이포 속성 상속
- 예시 gap: 8px

### 5.9 IconButton

- **variant**: clear(아이콘만, 배경은 눌렀을 때만), fill(항상 배경 있음, 눌렀을 때 배경 사라짐), border(테두리, 눌렀을 때 배경 등장)
- **iconSize**: 24(기본), 20, 16
- **color**: mono 아이콘(이름이 `-mono`로 끝나는 것)에만 적용 가능, 예: red500, blue500, yellow500, green500
- **bgColor**: 기본값 `adaptive.greyOpacity100`
- **필수 속성**: aria-label, src 또는 name(둘 중 하나)
- 예시 gap: 8px

### 5.10 SearchField

- **fixed**: 기본 false, true 시 화면 상단 고정(스티키 헤더)
- **takeSpace**: 기본 true, fixed+takeSpace 조합 시 레이아웃 공간 유지
- **onDeleteClick**: 삭제(clear) 버튼 콜백
- 색상/사이즈/패딩/모서리 반경: 문서에 값 없음

### 5.11 SegmentedControl

- **size**: small(기본), large
- **alignment**: fixed(기본, 항목 동일 너비) / fluid(콘텐츠 크기 맞춤 + 가로 스크롤)
- **상태**: selected/unselected (aria-checked)
- **접근성**: role="radiogroup"/"radio", aria-checked, aria-labelledby
- **구조**: SegmentedControl + SegmentedControl.Item(value, children)
- 패딩/간격/모서리 반경: 문서에 값 없음

### 5.12 BottomSheet

- **ctaContentGap** 기본값: 34px (BottomSheet.Gradient 높이와 동일)
- **maxHeight / expandedMaxHeight**: 커스텀 가능(px)
- 기본적으로 열릴 때 애니메이션 적용(슬라이드업), **animationDelay** ms 단위 커스텀, 확장 시 onExpanded 콜백
- **포커스**: 기본 focus lock + dimmer 적용, UNSAFE_disableFocusLock으로 해제 가능, disableDimmer로 어둡게 처리 제거 가능
- **드래그**: 위로 10px 드래그 시 전체화면 확장 트리거(expandBottomSheet 활성 시), disableChildrenDragging으로 콘텐츠 드래그 간섭 방지
- **콘텐츠 영역**: Header는 `<h1>` + t4 스타일, HeaderDescription은 t6 스타일
- **CTA**: BottomSheet.CTA(단일 버튼), BottomSheet.DoubleCTA(좌우 버튼), BottomSheet.Select(체크박스 선택형)
- **접근성**: ariaLabelledBy/ariaDescribedBy, 텍스트 확대 160% 이상 시 a11yIncludeHeaderInScroll 자동 true

### 5.13 ProgressBar

- **size**: light, normal(기본), bold — 정확한 px 값은 문서에 없음
- **color**: 기본 blue400, CSS color 값으로 커스텀 가능(green400, red400 등 예시)
- **진행률 범위**: 0.0 ~ 1.0 (0.5 = 50%)
- **animate**: 기본 false, true 시 부드러운 애니메이션
- 예시 gap: 16px, 40px(애니메이션 예제 컨테이너)

### 5.14 ProgressStepper

- **variant**: compact(간결), icon(아이콘 포함, 단계 구분 용이)
- **paddingTop**: "wide" = 24px, "default" = 16px
- **activeStepIndex**: 기본 0
- **checkForFinish**: 기본 false, true+variant="icon" 조합 시 완료 단계에 체크 아이콘 표시
- 구조: ProgressStepper(컨테이너) + ProgressStep(개별 스텝, title/icon 선택적)

### 5.15 Skeleton

- **patterns**(9종): topList, topListWithIcon, amountTopList, amountTopListWithIcon, subtitleList, subtitleListWithIcon, listOnly, listWithIconOnly, cardOnly
- **커스텀 패턴 타입**: title, subtitle, list, listWithIcon, card, `spacer(${number})`
- **repeat**: 기본 3회, repeatLastItemCount로 커스텀, 최대 무한값 30
- **배경색**: white, grey(기본), greyOpacity100
- **표시 상태**: show(기본)/hide
- **height**: 기본 auto, 문자열/숫자 가능
- 애니메이션 타이밍/정확 색상 hex: 문서에 값 없음

### 5.16 Loader

- **size**: small, medium(기본), large
- **type**: primary(기본), dark, light(어두운 배경에 적합)
- **label**: 로더 하단 설명 텍스트, 여러 줄 지원
- 정확한 색상 hex/애니메이션 시간: 문서에 값 없음

### 5.17 Tooltip

- **size**: small, medium(기본), large
- **placement**: top, bottom(기본)
- **messageAlign**: left, center, right
- **clipToEnd**(화살표 스타일): left, right, none(기본)
- **anchorPositionByRatio**: 0~1, 기본 0.5(중앙)
- **motionVariant**: weak(기본), strong
- **positioning strategy**: absolute(기본, 가장 가까운 위치 지정 조상 기준) / fixed(뷰포트 기준)
- **상태**: defaultOpen(false), open(외부 제어), openOnHover, openOnFocus, dismissible(외부 클릭/esc로 닫힘)
- **offset**: 트리거와의 거리, 기본값은 화살표 크기+컴포넌트 크기로 결정
- **autoFlip**: 뷰포트 벗어나면 자동 위치 반전

### 5.18 BoardRow

- **기본 텍스트 타이포**: t6 (BoardRowTextProps)
- **접두사(prefix) 타이포**: st8 (BoardRowPrefixProps)
- **prefix 색상**: adaptive.blue500(기본)
- **아이콘 색상**: adaptive.grey400(기본)
- **prefix-title 간 gap**: 8px
- **상태**: initialOpened(기본 false), isOpened(외부 제어), onOpen()/onClose() 콜백
- **화살표 아이콘**: 기본 크기 24px, 기본 이름 "icon-arrow-right-mono"

### 5.19 Border

- **variant**: full(전체 너비 구분선), padding24(양쪽 24px 여백), height16(여백 전용 스페이서, height 커스텀 가능)
- 색상: 명시적 값 없음, `adaptive.grey100` 예시 참조(Colors Foundation 따름)
- 용도: 리스트 아이템/섹션 구분에 full 또는 padding24, 콘텐츠 섹션 간 세로 여백에 height16(기본 16px)

### 5.20 BottomInfo

- **기본 타이포**: t7
- **paddingBottom**: 24 (Post.Ul과 함께 사용 예시)
- **기본 그라디언트**: `linear-gradient(adaptive.greyBackground, rgba(255,255,255,0))`
- **bottomGradient** 옵션: 커스텀 그라디언트 문자열, 또는 "none"(그라디언트 제거)
- 용도: 화면 하단에 중요 정보/주의사항을 명확히 표시. 스크롤 시 색상 부조화 방지를 위해 그라디언트 사용 권장(특히 iOS에서 none 비권장)

### 5.21 Bubble

- **background**: blue(내 메시지), grey(상대방 메시지)
- **withTail**: 기본 true(꼬리 있음) / false. 꼬리 위치는 자동(grey=좌측, blue=우측)
- 예시 레이아웃: flexbox, gap 8px, justifyContent로 좌/우 정렬
- 모서리 반경/패딩/폰트: 문서에 값 없음

### 5.22 GridList

- **column**: 1(강조 콘텐츠, 긴 설명용), 2(큰 아이템, 가독성 개선), 3(기본값, 다수 옵션 효율적 표시)
- 이미지 예시 24×24px 아이콘 (스펙은 아님)
- GridList.Item = 이미지+텍스트, 텍스트는 Paragraph 컴포넌트로 렌더
- 모바일 터치 시 확대(zoom) 피드백
- 간격/패딩: 문서에 값 없음

### 5.23 Highlight

- **message 기본 색상**: colors.white
- 커스텀 색상 문자열 지원(예: "pink")
- 배경: 강조 영역 외 나머지에 어둡게 오버레이
- **props**: open(필수), padding(px), delay(초), message, messageXAlignment(left/center/right/auto), messageYAlignment(top/bottom/auto)
- 화살표 아이콘은 messageXAlignment와 무관하게 항상 가로 중앙
- 정렬 미지정 시 화면/요소 크기 비교로 자동 조정
- onClick, onExited 콜백 지원, 토스 앱 환경 앱브릿지와 호환

### 5.24 ListHeader

- **title 타이포**: t4, t5, t7 / **right·description 타이포**: t6, t7
- **font weight**: bold, medium, regular
- **버튼 size**: xsmall, medium, large
- **titleWidthRatio**: 기본 0.66(66%), 텍스트 비율 200% 초과 시 0.5로 고정
- 예시 gap: 32px
- **색상**: title=adaptive.grey800, description/right=adaptive.grey700, 보조텍스트=adaptive.grey600, 화살표 아이콘=adaptive.grey400, RightArrow 기본 텍스트색=adaptive.grey700
- **description 위치**: top(기본)/bottom, **right 정렬**: center(기본)/bottom

### 5.25 ListFooter

- **텍스트 weight**: regular, medium(기본), semibold, bold
- **indent**(Hairline 좌측 여백): px 커스텀, 예시 50px
- **색상**: 텍스트/아이콘 기본 adaptive.blue500, 예시 대체값 adaptive.grey600, 그림자 예시에 adaptive.blue100(radial gradient)
- **구분선(Hairline) variant**: full(기본, 전체폭), indented(좌측 여백), none(없음)
- onClick 존재 시 ListFooter.Shadow로 커스텀 그림자 효과 가능

### 5.26 NumericSpinner

- **size**: tiny, small, medium, large
- **기본값**: 0, **최소** 0, **최대** 999(모두 기본값, 커스텀 가능)
- **상태**: disable={true} 시 버튼 클릭해도 숫자 변경 안 됨
- **접근성**: aria-live="polite", decreaseAriaLabel/increaseAriaLabel 커스텀 가능(기본 "빼기"/"더하기")
- 제어(number+onNumberChange) / 비제어(defaultNumber) 지원

### 5.27 Post

- **본문 타이포**: t1~t7 ("주로 본문 텍스트에 사용하는 크기와 굵기 스타일")
- **서브타이틀**: st1~st13 ("서브 타이틀 또는 부가적인 텍스트에 적합한 스타일")
- **헤딩 기본 타이포**: Post.H1=t2, Post.H2=t3, Post.H3=st8, Post.H4=t5
- **paddingBottom**: 문자열/숫자(px)로 텍스트 하단 여백 조정
- **리스트**: Post.Ol(번호), Post.Ul(불릿), Post.Li(중첩 가능)
- **Post.Hr**: 구분선, paddingBottom 지원

### 5.28 Rating

- **size**(interactive, readOnly=false): medium, large, big
- **size**(readOnly=true): tiny, small, medium, large, big
- **variant**(readOnly 전용): full, compact, iconOnly
- **상태**: interactive, read-only, disabled
- **기본값**: max=5점, readOnly=false, disabled=false
- **접근성**: aria-label, aria-valuetext ("X점 만점 중 Y점" 패턴)

### 5.29 Slider

- **트랙 기본색**: blue400, color prop으로 커스텀 (예시: adaptive.blue500, adaptive.green500, adaptive.red500)
- 예시 값: 툴팁 paddingTop 55px, 슬라이더 간 gap 10px(예시일 뿐)
- **props**: value, minValue/maxValue, label(min/max/mid 텍스트), tooltip(Slider.Tooltip, message 표시)
- onValueChange 콜백

### 5.30 Stepper

- **번호 아이콘**: 1~9 숫자 배지
- **버튼 size**: small, medium, large, xlarge
- **텍스트 스케일**: t4(큰 제목), t5/t6(본문), t7(작은 텍스트)
- **Asset frameShape**: CircleMedium, CleanW24(기본), CleanW32(텍스트 확대 160%+ 시)
- **아이콘 색**: adaptive.grey400(우측 화살표 기본)
- **버튼 색**: primary, danger, light, dark, 배경 투명 옵션 있음
- **텍스트 타입 variant**: A, B, C(제목/설명 크기 제어)
- **애니메이션**: play(true/false), hideLine(true/false), staggerDelay 기본 0.1초, delay 기본 0초
- 레이아웃: left, center(필수), right 3컬럼, 연결선(line) 기본 표시(마지막 단계는 숨김 가능)

### 5.31 TableRow

- **align**: "space-between"(좌우 끝 배치, 제목/내용 명확 구분), "left"(둘 다 좌측 근접 배치)
- **left, right**(필수): ReactNode
- **leftRatio**(선택): 숫자, 좌측 영역 너비 비율
- 색상/타이포/패딩: 문서에 값 없음

### 5.32 Top

- **타이틀 크기**: 22px, 28px / **서브타이틀 크기**: 13px, 15px, 17px
- **font weight**: regular, medium, semibold, bold
- **타이포 토큰**: t1~t7, st1~st13
- **상하 여백**: upperGap 기본 24px, lowerGap 기본 24px
- **색상**: 타이틀=adaptive.grey800, 서브타이틀=adaptive.grey700, 아이콘=adaptive.grey600
- **배지**: color(blue/teal/green/red/yellow/elephant), variant(fill/weak)
- **버튼 기본 size**: LowerButton=small, LowerCTAButton=large, RightButton=medium, TitleTextButton=xlarge, SubtitleTextButton=medium
- **레이아웃 위치**: Upper, Title, SubtitleTop/Bottom, Lower, Right(세로 정렬 center/end)
- **기본 화살표 아이콘**: "icon-arrow-right-small-mono"

## 6. 컴포넌트 그룹

### 6.1 Agreement (약관 동의)

#### AgreementV4 (`/components/Agreement/v4/`, 현재 권장 버전)

- **variant**: xLarge, large, medium, medium-title, small, small-last (정확한 px는 문서에 없음)
- **필수 여부 색상**: 필수(mandatory)=파란색(adaptive.blue500), 선택(optional)=진한 회색
- **배지**: fill(배경 adaptive.yellow50 + 텍스트 adaptive.yellow500), clear(텍스트 adaptive.blue500)
- **indent**: 숫자 prop, 단계별 시각적 위계
- **체크박스 variant**: checkbox, dot, hidden(공간은 유지하되 숨김)
- **transitionDelay**: 기본 지연 0.1초 + prop 추가
- **상태**: checked, collapsed(부드러운 펼침/접힘), necessity(mandatory/optional), badge(fill/clear), motion(strong=탄력적, weak=미세함)

#### AgreementV3 (`/components/Agreement/v3/`, **Deprecated — AgreementV4로 마이그레이션 권장**)

- **type**: big, medium(기본), medium-bold
- **tag color**: 커스텀 가능(예시 "#3182f6")
- **설명 텍스트**: 작은 회색 텍스트
- **indent**: 숫자(0, 1, 3 예시)
- **체크박스**: checked/unchecked, **collapsible**: open/defaultOpen
- **arrow type**: none, link, collapsible
- **necessity**: none, optional, mandatory

### 6.2 Asset (미디어 자산 프레임워크)

개요(`/components/Asset/check-first/`): Asset 컴포넌트는 아이콘/이미지/동영상/Lottie 등 다양한 미디어를 일관되게 표시하기 위한 구조. **Frame**(모든 Asset에 일관된 크기·모양 제공) + **Content**(실제 미디어) + **Union**(중첩/부가정보 표시)의 3요소로 구성. Frame이 전체 레이아웃/스타일의 기반.

#### Frame (`/components/Asset/frame/`)

프리셋 shape (정확한 px 치수는 문서에 없음 — 원문 확인 필요):
- Square: SquareSmall, SquareMedium, SquareLarge
- Rectangle: RectangleMedium, RectangleLarge
- Circle: CircleSmall, CircleMedium, CircleLarge
- Card: CardSmall, CardMedium, CardLarge
- `FrameShapeType`으로 width/height(string|number), radius(모서리 반경) 커스텀 가능

#### Asset (`/components/Asset/asset/`)

- 래핑 컴포넌트: Asset.Icon(Frame+ContentIcon), Asset.Image(Frame+ContentImage), Asset.Lottie(Frame+ContentLottie), Asset.Text(Frame+ContentText), Asset.Video(Frame+ContentVideo)
- Frame의 `shape` prop은 래핑 컴포넌트에서 `frameShape`로 이름 변경 (예: `Asset.frameShape.SquareMedium`)
- **Icon**: color prop으로 adaptive 색상 지정 가능
- **Image**: scaleType 'fit'(기본, 비율 유지)/'crop'(채우고 자름)
- **Video**: 기본값 autoPlay=true, loop=true, muted=true, controls=false, playsInline=true
- **Lottie**: scaleType 'fit'(기본)/'crop'
- 공통: frameShape, backgroundColor, acc(부가 요소), accPosition 기본 'bottom-right', overlap(겹침 표시)

> ListRow 문서에서 파악된 Asset 관련 고정 치수(참고):
> - AssetImage: square 52×52, circle 40×40, original height 56
> - AssetLottie: square 52×52, circle 40×40, original height 40

### 6.3 BottomCTA (하단 고정 액션 버튼)

개요(`/components/BottomCTA/check-first/`): 사용자가 특정 작업을 완료하도록 돕는 CTA 버튼, 보통 화면 하단에 고정. **FixedBottomCTA**는 fixed=true가 기본값인 BottomCTA. **Single**은 단일 버튼(children), **Double**은 leftButton/rightButton 2버튼. FixedBottomCTA는 기본적으로 Single 형태이며, 2버튼 고정형은 `FixedBottomCTA.Double` 사용.

#### Single (`/components/BottomCTA/Single/`)

- **기본 paddingBottom**: 20px (hasPaddingBottom=true & hasSafeAreaPadding=false일 때)
- **Safe Area 처리**: `max(var(--toss-safe-area-bottom, 0px), env(safe-area-inset-bottom), 20px)`
- **애니메이션 타입**(showAfterDelay): fade, scale, slide(기본)
- **배경**: 'default'(그라디언트+배경색 포함, 기본) / 'none'
- **fixed**: 옵션, true면 takeSpace 기본 true
- **hideOnScrollDistanceThreshold**: 기본 1px
- 기본값: hasSafeAreaPadding=true, hasPaddingBottom=true, show=false, hideOnScroll=false
- 주의: 모바일 키보드 활성화 시 opacity나 bottom CSS 속성 사용 금지 (명시적 경고)

#### Double (`/components/BottomCTA/Double/`)

- Single과 동일한 paddingBottom(20px)/SafeArea 공식/hideOnScrollDistanceThreshold(1px) 사용
- 좌우 2버튼 배치, fixed/takeSpace 옵션 동일
- 버튼 variant 예시로 "danger" + "weak" 조합 언급

#### FixedBottomCTA (`/components/BottomCTA/fixed-bottom-cta/`)

- 좌우 2버튼 구성 지원, hideOnScroll 시 아래로 스크롤하면 숨김/위로 스크롤하면 재표시
- 버튼 색상 예시: "dark", variant "weak"(보조 액션)
- 그 외 패딩/색상 hex/애니메이션 시간: 문서에 값 없음

### 6.4 Chart

#### BarChart (`/components/Chart/bar-chart/`)

- **색상 테마**(7종): Blue, Green, Yellow, Orange, Red, Grey, Default
- **기본 높이**: 205px (height prop으로 커스텀)
- **데이터 라벨 규칙**: 항목 12개 이하면 모든 막대에 라벨 표시, 12개 초과 시 첫/마지막만 표시(겹침 방지)
- **fill 타입**: all-bar(전체 동일색), single-bar(인덱스로 특정 막대 강조), auto(오른쪽→왼쪽 순서로 blue→green→yellow→orange→red→grey 순차 채색)
- **데이터 구조**: value, maxValue(비례 스케일 기준), barAnnotation(막대 위 텍스트/숫자)

### 6.5 Dialog

#### 개념 개요 (`/components/Dialog/dialog/`)

이 페이지는 개념 설명 전용이며 수치 값은 없음. AlertDialog/ConfirmDialog 구조 차이(Title/Description/Buttons 구성)만 설명. 실제 색상·타이포는 하위 페이지 및 Foundation 참고.

#### AlertDialog (`/components/Dialog/alert-dialog/`)

- **타이틀**: t4, bold, `<h3>` 태그, 색상 adaptive.grey800
- **설명**: t6, medium, `<h3>` 태그, 색상 adaptive.grey600
- **알림 버튼 색상**: 기본 colors.blue500
- **버튼 size**: xsmall, small, medium(기본), large, xlarge, xxlarge
- **버튼 variant**: arrow, underline, clear / **weight**: regular, medium, semibold, bold
- **동작**: 긴 타이틀은 자연 줄바꿈, 긴 설명은 스크롤 자동 적용
- **closeOnDimmerClick**: 기본 true, false면 wiggle(흔들림) 애니메이션
- 포탈: 기본 document.body, portalContainer로 커스텀

#### ConfirmDialog (`/components/Dialog/confirm-dialog/`)

- **버튼 배치**: 짧은 텍스트는 가로 배치, 긴 텍스트는 세로(스택) + 전체 너비
- **버튼 size**: 기본 'large', 옵션 medium/big/large/tiny
- **취소 버튼 기본값**: type='dark', style='weak', size='large'
- **타이틀**: t4, bold, adaptive.grey800, `<h3>`
- **설명**: t6, medium, adaptive.grey600, `<h3>`
- **동작**: closeOnDimmerClick 기본 true, closeOnBackEvent 기본 true, 닫기 불가 시 dimmer에 Wiggle 애니메이션
- 포탈: 기본 document.body

### 6.6 Keypad (보안 키패드)

#### NumberKeypad (`/components/Keypad/number-keypad/`)

- **기본 배열**: 1~9가 3×3 그리드, 0은 하단 별도
- **커스텀 배열 예시**: `[1, 3, 5, 7, 9, 2, 4, 6, 8, 0]`
- **secure 모드**: true 시, 숫자 키 클릭 시 인접하지 않은 임의의 2개 키가 추가로 동시 입력 처리되어 타이핑 패턴 노출 방지
- 보안 기능: 앱이 백그라운드로 이동 시 화면 마스킹, Android 스크린샷 방지
- 콜백: onKeyClick(value), onBackspaceClick()
- 주민등록번호 등 민감정보 입력 시 secure=true 필수 명시

#### AlphabetKeypad (`/components/Keypad/alphabet-keypad/`)

- 기본 배열: A~Z 대문자, alphabets prop으로 대/소문자 배열 커스텀 가능
- backspace 키 포함, 색상/간격: 문서에 값 없음

#### FullSecureKeypad (`/components/Keypad/full-secure-keypad/`)

- 4행 레이아웃: 1행 숫자 0~9, 2행 10개 영문/한글 키(q~p), 3행 9개 키(a~l), 4행 7개 키(z~m)+유틸 버튼
- 제어 버튼: backspace, 특수문자, 스페이스바, 제출(submit)
- **보안 기능**: `reorderEmptyCells()`로 키패드 빈 공간 위치를 무작위 재배치(패턴 공격 방지)
- 콜백: onKeyClick, onBackspaceClick, onSpaceClick, onSubmit
- submitDisabled(불리언), submitButtonText(기본 "입력 완료")

### 6.7 ListRow (가장 상세한 컴포넌트 문서)

#### 개요 (`/components/ListRow/list-row-overview/`)

**세로 패딩**:

| 크기 | 값 |
|---|---|
| small | 8px |
| medium(기본) | 12px |
| large | 16px |
| xlarge | 24px |

**가로 패딩**:

| 크기 | 값 |
|---|---|
| small | 20px |
| medium(기본) | 24px |

- **로더 세로 패딩**: extraSmall(가장 작음), small/medium/large(ListRow와 동일)
- **레이아웃 3영역**: Left(아이콘/이미지), Contents(주요 텍스트), Right(보조 정보/인터랙션)
- **구분선(divider)**: indented(좌측 들여쓴 구분선, 기본), none(구분선 없음, 연결된 느낌)
- **비활성(disabled) 스타일**: type1(연한 배경), type2(더 진한 배경, 강한 비활성 표시)
- **효과**: shine(가로로 훑는 밝기 효과), blink(전체 깜빡임)
- **로더 타입**: square, circle, bar
- **정렬**: left/right 영역 모두 top / center(기본)

#### 세부 컴포넌트 (`/components/ListRow/list-row-components/`)

- **ListRow.Texts 타입**: 1RowTypeA~C, 2RowTypeA~F, 3RowTypeA~F, Right1RowTypeA~E, Right2RowTypeA~E
- **ListRow.AssetIcon**: size(xsmall/small/medium, 기본 medium), shape(original/squircle/card/circle-background/circle-masking)
- **ListRow.AssetImage**: size(xsmall/small/medium), 고정 치수 — square 52×52, circle 40×40, original height 56, shape(original/squircle/card/square/circle)
- **ListRow.AssetLottie**: size(xsmall/small/medium), 고정 치수 — square 52×52, circle 40×40, original height 40
- **ListRow.AssetText**: size(xsmall/small/medium), shape(squircle/card)
- **ListRow.IconButton**: 기본 아이콘 24px(커스텀 가능), variant(fill/clear/border), 기본 배경 adaptive.greyOpacity100
- **뱃지(accessory)**: 위치 bottom-right/top-right, 마스킹 none/circle

#### ListRowLegacy (`/components/ListRow/ListRowLegacy/list-row-legacy/`, **v3에서 제거 예정 — Deprecated**)

- ListRow.Icon shape: no-background, squircle-background(medium/large), circle-background, circle-masking
- ListRow.FillIcon shape: default, squircle(medium/large), circle-background, circle-masking
- 이미지 컨테이너 타입: default, square, rectangle, rectangle-small, circle, circle-small, 3d-emoji
- 텍스트 타입: 1RowTypeA~C, Right1RowTypeA~E, 2RowTypeA~F, Right2RowTypeA~E, 3RowTypeA~F
- IconButton variant: fill, clear(기본), border / 기본 iconSize 24px, bgColor adaptive.greyOpacity100
- 레이아웃: left, contents, right 3영역 (신규 ListRow와 동일한 개념)

### 6.8 TextField (입력 필드)

#### TextField (`/components/TextField/text-field/`)

- **variant**: box(기본 사각형), line(밑줄만), big(강조된 큰 스타일), hero(대형 강조 스타일)
- **label 표시 방식**: sustain(항상 표시), appear(텍스트 입력 시에만 표시)
- **상태**: 기본, focus, error(hasError), disabled
- **기능**: prefix/suffix(통화기호·단위 등), right(커스텀 우측 요소)
- **하위 variant**: TextField.Clearable(onClear 지우기 버튼), TextField.Password(표시 토글+onVisibilityChange), TextField.Button(클릭형, 기본 하단 화살표 아이콘)
- **속성**: placeholder, help(보조 안내 텍스트), value/defaultValue, onChange/onFocus/onBlur, format(변환 규칙+reset 함수)
- **간격**: paddingTop, paddingBottom 커스텀 가능

#### TextArea (`/components/TextField/text-area/`)

- **height**: 문자열/숫자로 고정 높이 지정 가능 (예: "200px")
- **minHeight**: 콘텐츠에 따라 자동 확장되는 최소 높이 (예: 100)
- **variant**: "box" 확인됨
- placeholder, help 속성 지원
- TextField를 확장하되 prefix/suffix/right는 명시적으로 제외
- 용도: 후기, 주소, 메모 등 여러 줄 텍스트 입력 — "넉넉한 입력 공간" 강조

#### SplitTextField (`/components/TextField/split-text-field/`)

- **variant**: box(기본 사각형), line(밑줄), big(강조), hero(대형)
- **label**: appear(입력값 있을 때만 표시), sustain(항상 표시) — box는 기본 sustain, 나머지는 기본 appear
- **마스킹**(주민등록번호 특화): RRN13(13자리 전체, 기본 mask=true, 뒤 7자리 숨김), RRNFirst7(7자리, 기본 mask=false, 성별 코드 표시)
- **간격**: paddingTop, paddingBottom
- **상태**: hasError, focused
- first/second 필드 각각 TextFieldPublicProps로 개별 커스터마이즈 가능(placeholder, disabled 등)

## 7. Hooks — Overlay Extension

개요(`/hooks/OverlayExtension/check-first/`): Dialog, Toast, BottomSheet 같은 오버레이 UI를 선언적으로 쉽게 사용하기 위한 유틸리티 훅 모음.

**선택 기준**:
- **useDialog**: 사용자의 명확한 결정/주의가 필요할 때(중요 액션 확인, 경고, 명시적 확인)
- **useToast**: 일시적 알림/피드백(작업 완료, 오류, 상태 변화 등 사용자 조작 불필요)
- **useBottomSheet**: 추가 정보나 선택지를 화면 하단에서 제공(상세 콘텐츠, 다중 선택, 복잡한 인터랙션)

### 7.1 useDialog (`/hooks/OverlayExtension/use-dialog/`)

- **openAlert**: 정보 전달용, 기본 버튼 텍스트 '확인'
- **openConfirm**: 확인/취소 선택, 기본 값 '확인'/'취소'(confirmButton/cancelButton 커스텀 가능)
- **openAsyncConfirm**: 비동기 처리, 로딩 상태 자동 관리, onConfirmClick/onCancelClick 비동기 함수 지원, confirmButtonLoadingPropName/cancelButtonLoadingPropName 커스텀
- **공통 옵션**: closeOnDimmerClick 기본 **false**(실수로 닫히는 것 방지), onEntered/onExited 콜백, title(필수), description(선택)

### 7.2 useToast (`/hooks/OverlayExtension/use-toast/`)

**웹 기본 동작**:
- 버튼 없는 메시지: 3000ms 후 자동 닫힘
- 버튼 있는 메시지: 5000ms 후 자동 닫힘
- closeToast 메서드로 수동 닫기 가능, duration으로 커스텀

**앱(네이티브) 기본 동작**:
- Android: 화면 상단에서 26px
- iOS: 화면 상단에서 46px
- SafeArea 및 BottomCTA 컴포넌트 높이 자동 고려
- 앱 환경에서는 수동 닫기 메서드 없음(앱브릿지 필요)

**설정**:
- type: "top" / "bottom"
- gap: 가장자리로부터 거리(px), 다른 위치 값보다 우선순위 높음
- icon(lottie와 동시 사용 불가), iconType("circle"/"square")
- url로 Lottie 애니메이션(정적 아이콘과 상호 배타적)
- button: {text, onClick}
- higherThanCTA: true 시 BottomCTA 위에 표시

### 7.3 useBottomSheet (`/hooks/OverlayExtension/use-bottom-sheet/`)

- **open()**: header + children으로 기본 바텀시트, closeOnDimmerClick 기본 true
- **openOneButtonSheet()**: 버튼 1개(문자열 또는 커스텀 엘리먼트), closeOnButtonClick 제어
- **openTwoButtonSheet()**: 좌우 버튼, 기본 텍스트 "취소"/"확인", 버튼별 개별 닫힘 제어
- **openAsyncTwoButtonSheet()**: Promise 기반, 비동기 처리 중 자동 로딩 표시, 완료 전 닫힘 방지, onLeftButtonClick/onRightButtonClick 비동기 지원

| 속성 | 기본값 | 설명 |
|---|---|---|
| children | 필수 | 모달 콘텐츠 |
| header | 선택 | 제목 텍스트/엘리먼트 |
| closeOnDimmerClick | true | 배경 탭으로 닫기 허용 |
| onEntered/onExited | — | 생명주기 콜백 |
| UNSAFE_disableFocusLock | false | 포커스 외부 허용(접근성 영향 있음, 필요시에만 사용) |
| loadingPropName | 'loading' | 버튼 로딩 상태 prop 이름 |

## 8. 마이그레이션 가이드

### 8.1 구 Toss Design System → @toss/tds-* (`/migration/from-toss-design-system/`)

> "Deprecation Notice: `@toss-design-system/*` scope 패키지는 더 이상 지원되지 않습니다. 모든 사용자는 `@toss/tds-*` scope 패키지로 마이그레이션해야 합니다."

| 이전 패키지 | 신규 패키지 | 버전 |
|---|---|---|
| @toss-design-system/colors | @toss/tds-colors | ^0 |
| @toss-design-system/mobile | @toss/tds-mobile | ^2 |
| @toss-design-system/mobile-bedrock | @toss/tds-mobile-ait | ^1 |
| @toss-design-system/react-native | @toss/tds-react-native | ^1 |

- 자동 마이그레이션 CLI: `pnpm exec tds-migrate all --path "."` (import 문 + JSX 요소 모두 처리)
- **핵심 변경**: `TDSMobileBedrockProvider` → `TDSMobileAITProvider` (import 및 사용처 모두 영향)
- 수동 마이그레이션 시: 구 패키지 제거 → 신규 패키지 설치 → IDE 찾아바꾸기로 import 경로 일괄 수정

### 8.2 v2 마이그레이션 (`/migration/v2/`)

v1 → v2는 "더 직관적이고 일관된 컴포넌트 API"를 위한 **prop 이름 변경**이 핵심. 대표 패턴: `type` → `color`, `style` → `variant`.

| 컴포넌트 | 변경 내용 |
|---|---|
| Badge | type/style/color 관련 prop을 color, variant, style(HTML 스타일용)로 재정리 |
| Button | type→color, style→variant, htmlType→type, size 값 표준화(예: tiny→small) |
| IconButton | label prop이 필수이며 aria-label로 이름 변경(접근성 강화) |
| ListRow | 패딩 값이 T셔츠 사이징으로 전환(extraSmall→small, medium→large) |
| TextButton | typography prop → size prop으로 전환(값 매핑됨) |
| Top | 서브타이틀 prop이 subtitleTop/subtitleBottom으로 명확화 |
| BottomCTA/FixedBottomCTA | 서브컴포넌트명 TypeA/TypeB → Single/Double로 변경 |

- CLI 자동 마이그레이션: `pnpm exec @toss/tds-mobile-migration tds-v2`
- **주의**: 로컬 래퍼 컴포넌트는 자동 마이그레이션 대상 아님(수동 수정 필요)
- 패키지 업데이트: `pnpm up "@toss/tds-mobile*"`

## 9. NoticeTogether 적용 시 참고 메모

이 섹션은 원문에 없는, NoticeTogether 프로젝트 관점의 메모입니다(원문 인용 아님, 향후 설계 판단용 참고 노트).

- NoticeTogether는 React Native(Android) 앱이며, TDS Mobile은 `@toss/tds-mobile`(웹/PWA용)과 `@toss/tds-react-native`(네이티브용) 패키지로 나뉘어 있음을 마이그레이션 표에서 확인. 실제 RN 개발 시에는 `@toss/tds-react-native` 문서(이 사이트에서 별도 경로가 있는지 여부는 확인되지 않음 — 사이드바에는 노출되지 않았음)를 추가로 찾아봐야 함.
- 알림/공지사항 리스트 UI는 **ListRow**(패딩 8/12/16/24px 스케일, small/medium 아이콘 프레임) 및 **ListHeader**, **Border**(구분선), **Skeleton**(로딩 상태) 조합으로 설계하면 TDS 패턴과 정합적일 것으로 보임.
- 체크리스트(준비물/과제 체크) 기능은 **Checkbox**(24px 기본, circle/line variant) 또는 **NumericSpinner**(수량형 체크가 필요할 경우) 활용 가능.
- 마감 임박 알림 등은 **Badge**(yellow/red 계열 fill variant로 긴급도 표시) + **Toast**(3~5초 자동 노출) 조합 고려.
- 학부모 간 확인 여부 공유 같은 액션은 **BottomSheet**(useBottomSheet 훅)나 **Dialog**(useDialog 훅)로 확인 흐름 구성 가능.
- 색상 토큰은 `@toss/tds-colors`의 grey/blue/red/yellow 팔레트를 우선 채택하고, 실제 입점 심사 전 반드시 Figma/공식 디자인 리소스(이 문서에는 없음)를 통해 정확한 hex 전체 스케일과 컴포넌트별 모서리 반경·그림자 값을 재검증할 것.

## 10. 출처 페이지 목록

아래는 실제로 WebFetch로 조회한 모든 URL입니다.

```
https://tossmini-docs.toss.im/tds-mobile/
https://tossmini-docs.toss.im/tds-mobile/start/
https://tossmini-docs.toss.im/tds-mobile/foundation/colors/
https://tossmini-docs.toss.im/tds-mobile/foundation/typography/

https://tossmini-docs.toss.im/tds-mobile/components/badge/
https://tossmini-docs.toss.im/tds-mobile/components/board-row/
https://tossmini-docs.toss.im/tds-mobile/components/border/
https://tossmini-docs.toss.im/tds-mobile/components/bottom-info/
https://tossmini-docs.toss.im/tds-mobile/components/bottom-sheet/
https://tossmini-docs.toss.im/tds-mobile/components/bubble/
https://tossmini-docs.toss.im/tds-mobile/components/button/
https://tossmini-docs.toss.im/tds-mobile/components/checkbox/
https://tossmini-docs.toss.im/tds-mobile/components/grid-list/
https://tossmini-docs.toss.im/tds-mobile/components/highlight/
https://tossmini-docs.toss.im/tds-mobile/components/icon-button/
https://tossmini-docs.toss.im/tds-mobile/components/list-footer/
https://tossmini-docs.toss.im/tds-mobile/components/list-header/
https://tossmini-docs.toss.im/tds-mobile/components/loader/
https://tossmini-docs.toss.im/tds-mobile/components/menu/
https://tossmini-docs.toss.im/tds-mobile/components/modal/
https://tossmini-docs.toss.im/tds-mobile/components/numeric-spinner/
https://tossmini-docs.toss.im/tds-mobile/components/paragraph/
https://tossmini-docs.toss.im/tds-mobile/components/post/
https://tossmini-docs.toss.im/tds-mobile/components/progress-bar/
https://tossmini-docs.toss.im/tds-mobile/components/progress-stepper/
https://tossmini-docs.toss.im/tds-mobile/components/rating/
https://tossmini-docs.toss.im/tds-mobile/components/result/
https://tossmini-docs.toss.im/tds-mobile/components/search-field/
https://tossmini-docs.toss.im/tds-mobile/components/segmented-control/
https://tossmini-docs.toss.im/tds-mobile/components/skeleton/
https://tossmini-docs.toss.im/tds-mobile/components/slider/
https://tossmini-docs.toss.im/tds-mobile/components/stepper/
https://tossmini-docs.toss.im/tds-mobile/components/switch/
https://tossmini-docs.toss.im/tds-mobile/components/tab/
https://tossmini-docs.toss.im/tds-mobile/components/table-row/
https://tossmini-docs.toss.im/tds-mobile/components/text-button/
https://tossmini-docs.toss.im/tds-mobile/components/toast/
https://tossmini-docs.toss.im/tds-mobile/components/tooltip/
https://tossmini-docs.toss.im/tds-mobile/components/top/

https://tossmini-docs.toss.im/tds-mobile/components/Agreement/v3/
https://tossmini-docs.toss.im/tds-mobile/components/Agreement/v4/
https://tossmini-docs.toss.im/tds-mobile/components/Asset/check-first/
https://tossmini-docs.toss.im/tds-mobile/components/Asset/frame/
https://tossmini-docs.toss.im/tds-mobile/components/Asset/asset/
https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/check-first/
https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/Single/
https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/Double/
https://tossmini-docs.toss.im/tds-mobile/components/BottomCTA/fixed-bottom-cta/
https://tossmini-docs.toss.im/tds-mobile/components/Chart/bar-chart/
https://tossmini-docs.toss.im/tds-mobile/components/Dialog/dialog/
https://tossmini-docs.toss.im/tds-mobile/components/Dialog/alert-dialog/
https://tossmini-docs.toss.im/tds-mobile/components/Dialog/confirm-dialog/
https://tossmini-docs.toss.im/tds-mobile/components/Keypad/alphabet-keypad/
https://tossmini-docs.toss.im/tds-mobile/components/Keypad/full-secure-keypad/
https://tossmini-docs.toss.im/tds-mobile/components/Keypad/number-keypad/
https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-overview/
https://tossmini-docs.toss.im/tds-mobile/components/ListRow/list-row-components/
https://tossmini-docs.toss.im/tds-mobile/components/ListRow/ListRowLegacy/list-row-legacy/
https://tossmini-docs.toss.im/tds-mobile/components/TextField/text-field/
https://tossmini-docs.toss.im/tds-mobile/components/TextField/split-text-field/
https://tossmini-docs.toss.im/tds-mobile/components/TextField/text-area/

https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/check-first/
https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/use-dialog/
https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/use-toast/
https://tossmini-docs.toss.im/tds-mobile/hooks/OverlayExtension/use-bottom-sheet/

https://tossmini-docs.toss.im/tds-mobile/migration/from-toss-design-system/
https://tossmini-docs.toss.im/tds-mobile/migration/v2/
```

**주의**: `https://tossmini-docs.toss.im/sitemap.xml`은 404로 존재하지 않아, 링크 수집은 랜딩 페이지 사이드바 순회 방식으로만 이루어졌습니다. 사이드바에 노출되지 않은 페이지(예: React Native 전용 패키지 문서, 별도 도메인의 Figma 리소스 등)가 있을 가능성이 있으며, 이 문서는 그런 페이지를 포함하지 않습니다.

# 작업 기록 (Process Log)

이 문서는 NoticeTogether 프로젝트에서 이루어진 모든 변경 사항을 시간순으로 기록합니다.

## 2026-09-27

- 로컬 저장소를 초기화하고 GitHub 원격 저장소(`https://github.com/HongTaeuk/NoticeTogether`)에 연결함.
- 기존 원격 `main` 브랜치(README.md만 존재)를 로컬 `main`으로 추적하도록 설정함.
- 코드 변경 시 자동으로 git에 커밋/푸시(및 필요 시 pull)하도록 hook을 설정함.
- 모든 변경 사항을 이 파일(`docs/process.md`)에 기록하도록 규칙을 정함.
- 기존 조사 자료 추가: `docs/01_research.md`, `docs/02_customer_profile.md`, `docs/제안요청서(RFP).txt.txt`, `docs/해결검토.txt.txt`.
- `.claude/settings.json`에 파일 수정(Edit/Write/NotebookEdit) 후 자동으로 git add/commit/pull/push를 수행하는 hook을 추가함.
- `README.md`를 RFP·리서치 자료를 바탕으로 프로젝트 소개, 핵심 기능, 사용 도구, 문서 링크가 담긴 형태로 재작성함.
- 개발용 안드로이드 기기 연결 확인: Android platform-tools(adb) 설치 및 PATH 등록, 기기 USB 디버깅 승인 완료 (Samsung Galaxy A56, SM-A566S).
- `docs/` 전체 문서(01~06, RFP, 해결검토) 분석 완료 — 기술 스택(Bare React Native+TS, Kotlin 네이티브 모듈, Next.js/Vercel, Supabase, NVIDIA NIM), MVP 범위와 10단계 개발 순서 확정 내용 확인.
- 개발 환경 구축 시작: Node.js LTS, Microsoft OpenJDK 17 설치.
- `CLAUDE.md` 추가 — 모든 작업이 `docs/06_prd.md`(PRD)와 `docs/05_tech_review.md` 기준을 따르도록 작업 원칙, 확정 기술 스택, MVP 순서, 작업 규칙을 명시함.
- `apps/mobile`에 Bare React Native + TypeScript 프로젝트 스캐폴딩 (Android 전용이므로 `ios/` 폴더는 제거), 의존성 설치 완료.
- `apps/web-api`에 Next.js(App Router, TypeScript) 프로젝트 스캐폴딩.
- Android SDK 커맨드라인 도구(cmdline-tools) 설치 진행 — 빌드도구/플랫폼 37 설치 및 실기기 빌드 테스트 예정.
- `docs/07_design_reference.md` 추가 — 토스미니 TDS(Toss Design System) Mobile 문서 전체(사이드바 기준 약 55개 하위 페이지)를 조사해 색상/타이포그래피/컴포넌트 32종/컴포넌트 그룹/훅/마이그레이션 가이드 정리. 향후 앱인토스(tossmini) 입점을 대비한 디자인 참고 자료. **NoticeTogether는 회색(grey)을 사용하지 않기로 결정**하여 이 점을 문서에 명시함.
- `apps/web-api`에 AI 요약 파이프라인 뼈대 작성: `src/lib/ai/client.ts`(OpenAI 호환 채팅완성 호출, NVIDIA NIM 기본), `src/lib/ai/summarize.ts`(준비물/제출서류/기한 추출 프롬프트+파싱), `src/app/api/summarize/route.ts`(POST 엔드포인트), `src/lib/supabase/client.ts`(서버 전용 Supabase 클라이언트), `.env.local.example` 추가.
- `supabase/migrations/0001_init.sql` 추가 — PRD/기술검토 기준 초기 스키마(households, users, children, notices, checklist_items, item_actions, notice_events, consents, ai_summary_logs) 및 RLS 활성화.
- 참고 프로젝트 Wolharang/moa(develop 브랜치, TempClassifierService)의 NVIDIA 연동 방식을 실제 코드까지 확인 후 반영: `lib/ai/client.ts`에 **모델 체인(콤마 구분 다중 모델 폴백) + 연속 실패 시 일시 중단(cool-down)** 구조 추가. NVIDIA NIM 40 RPM 제한 위험에 대한 구체적 대응책. 모델 네이밍 컨벤션(제공사/모델명) 확인 결과 moa와 동일한 NVIDIA NIM API 계열로 확인됨.
- Android SDK 커맨드라인 도구 설치 완료(플랫폼 36/37.0, 빌드도구 36.0.0/37.0.0), JAVA_HOME/ANDROID_HOME 영구 환경변수 등록. `apps/mobile/android`에서 `gradlew assembleDebug` 실기기 빌드 시작.
- `apps/mobile`에 PRD 1~2단계 화면 구현: `src/screens/NoticeInputScreen.tsx`(텍스트 붙여넣기 → `/api/summarize` 호출 → 카테고리별 체크리스트 표시 + 원문 보기 토글), `src/types/notice.ts`(백엔드와 타입 공유), `src/config/api.ts`(`adb reverse`로 로컬 백엔드 연결). `App.tsx`를 이 화면으로 교체. 회색 미사용 원칙에 맞춰 blue/orange/red 팔레트로 카테고리 색상 구성.
- NVIDIA NIM API 키, Supabase 프로젝트 키는 아직 발급 전 — 사용자에게 발급 방법 안내함(둘 다 준비되면 `.env.local` 연결 예정). 목표를 "실제 기기에서 바로 테스트 가능한 완성된 MVP"로 재확인함.
- Android SDK 37/NDK 설치, JAVA_HOME 확정. `gradlew assembleDebug` 첫 빌드 성공(12분 48초) → `app-debug.apk` 생성.
- 실제 API 키 발급 및 연동: NVIDIA NIM 키, Supabase URL/service_role 키 수령 → `apps/web-api/.env.local` 구성(git에는 커밋 안 됨). `supabase/migrations/0001_init.sql`을 Supabase SQL Editor에서 직접 실행해 스키마 적용 완료.
- NVIDIA NIM 원래 지정 모델(`meta/llama-3.1-70b-instruct`)이 단종(410 Gone) 확인 → `/v1/models`로 계정에서 실제 접근 가능한 모델 전수 조사(82개 중 6개만 접근 가능: super-120b, lightning-30b, ultra-550b, gemma-4-31b, mistral-nemotron, glm-5.3, deepseek-v4.1-flash, gpt-oss-20b).
- `deepseek-ai/deepseek-v4.1-flash`로 첫 실제 요약 테스트 → **원문에 없는 내용을 지어내는 환각 확인**(예: "체력검사" 조작, "색종이/가위"를 "크레파스/물감"으로 변경). NVIDIA NIM 무료 티어 품질 리스크(문서에 이미 명시)가 실제로 재현됨.
- 사용자가 Gemini API 키 제공, "Gemini를 표준으로 쓰고 안 되면 폴백" 제안 → Gemini의 OpenAI 호환 엔드포인트(`generativelanguage.googleapis.com/v1beta/openai`) 사용 결정. `client.ts`를 프로바이더 배열 구조로 재작성(Gemini 1순위 + NVIDIA 폴백, 프로바이더별 base URL/키/모델 체인, (프로바이더,모델) 단위 실패 쿨다운).
- Gemini/NVIDIA 총 10개 모델을 동일한 두 문장(현장학습 동의서·체육대회 준비물 / 미술 준비물·건강검진 회신서)으로 반복 비교 테스트. 결과: `gemini-3.5-flash-lite`가 가장 정확(대체로 환각 없음, 항목 분리 정확)하지만 완벽하지 않음(가끔 원문에 없는 단어로 치환하는 환각 발생, temperature=0에도 비결정적). `gemini-3.5-flash`/`gemini-3.8-flash`는 추론형이라 토큰을 과도하게 쓰거나 상시 과부하(503)라 실사용 불가로 판단. NVIDIA는 접근 가능한 모델 대부분이 추론형이라 느리거나(900토큰으로도 답변 못 끝냄) 부정확함.
- 프롬프트를 여러 차례 반복 조정(정확성 vs 완전성 강조 균형) — 완전히 없애지 못하는 잔여 환각은 모델 자체의 본질적 한계로 판단하고 튜닝 중단. **PRD가 이미 이 문제를 전제로 설계됨**(FR-1: AI 신뢰도 confidence 표시, 사용자 직접 수정, 원문 비교 토글) → 추가 프롬프트 튜닝보다 그 UI를 구현하는 방향으로 결정.
- 최종 모델 우선순위 확정: 1순위 `gemini-3.5-flash-lite`, 2순위(폴백) NVIDIA `nemotron-3-ultra-550b-a55b` → `nemotron-3-super-120b-a12b` → `nemotron-3.5-lightning-30b-a3b` (정확도 실측 순). NVIDIA 폴백용 `maxTokens`를 2000으로 상향(추론 토큰 소모 감안).
- `docs/05_tech_review.md`의 "AI: NVIDIA NIM 단일" 결정은 위 실측 결과에 따라 "Gemini 1순위 + NVIDIA 폴백"으로 갱신, 문서 본문에 갱신 노트로 반영 완료.
- **중요 정정**: 앞서 관찰한 "환각"의 상당수가 실제로는 bash 커맨드라인 인자(`curl -d '한글...'`)로 한글을 전달할 때 인코딩이 깨지던 버그 때문이었음을 발견(NVIDIA가 "텍스트가 손상되었다"고 명시적으로 답해서 발각). 파일 기반(`--data-binary @file`)으로 깨끗하게 재검증한 결과 Gemini(4/4)와 NVIDIA 둘 다 훨씬 안정적으로 정확했음. 다만 일부 초기 비교 테스트는 Node 스크립트로 파일을 만들어 보낸 것이라 이 버그의 영향을 받지 않았음(6개 모델 비교 스윕 등) — 모델 우선순위 결론 자체는 유지.
- PRD 3단계(체크 완료 상태 저장) 구현: `apps/web-api/src/lib/supabase/devSeed.ts`(PRD가 인증을 마지막 단계로 미루는 것에 맞춰, 실제 가입 전까지 쓸 개발용 가구+보호자 2명을 Supabase Auth admin API로 자동 생성/재사용), `POST /api/notices`(알림+체크리스트 저장), `PATCH /api/checklist/[id]`(체크 토글 + item_actions 로그), `GET /api/notices/[id]`(Pull 기반 동기화 조회 — 원문/요약/체크리스트/액션 이력 반환). 로컬에서 저장→토글→조회 전체 루프 검증 완료.
- **외부 시스템 전체 재점검 및 완전 검증** (사용자 요청):
  - 완성까지 필요한 외부 시스템은 총 4개로 확정: Supabase, NVIDIA NIM, Gemini, Vercel (FCM/Play스토어/도메인/이메일서비스는 문서상 불필요로 이미 결정됨).
  - NVIDIA: 실제 앱 코드의 폴백 경로까지 검증(Gemini 키를 일부러 무효화 → NVIDIA로 정상 폴백 → 정확한 결과, 27초).
  - Supabase: 알림 저장/체크 토글/Pull 동기화 조회 전체 루프 검증. (RLS 정책은 아직 미작성 — 지금은 service_role로 우회 중이라 문제 없으나, 실제 가입 단계에서 필요. consents/ai_summary_logs 테이블은 아직 코드에서 안 씀 — 추후 구현 필요.)
  - Vercel: GitHub 연동 프로젝트 생성(Hobby 무료 플랜), 환경변수 8개 등록, 프로덕션 배포 성공. **1차 배포 시 두 가지 문제 발견 후 해결**: ① 기본으로 켜져 있던 Vercel Deployment Protection(SSO 인증)이 외부 API 호출을 막아서 Vercel API로 직접 껐음. ② PowerShell 파이프로 환경변수를 등록할 때 BOM(U+FEFF)이 값 앞에 섞여 들어가 인증 헤더가 깨졌음 — bash `printf`로 재등록 후 재배포하여 해결. 재배포 후 `/api/summarize`, `/api/notices`, `/api/checklist/[id]`, `/api/notices/[id]` 전부 프로덕션 고정 도메인(`noticetogether-web-api-notice-together.vercel.app`)에서 정상 동작 확인.
  - `apps/mobile/src/config/api.ts`를 로컬(`adb reverse`) 대신 위 프로덕션 도메인을 기본값으로 사용하도록 변경.
- PRD 3~4단계 모바일 연결: `NoticeInputScreen.tsx`가 이제 AI 요약 후 자동으로 `/api/notices`에 저장하고, 체크박스 UI로 `/api/checklist/[id]`를 호출해 완료 상태를 토글(낙관적 업데이트 + 실패 시 롤백)한다. PRD가 요구하는 "임시 계정 2개로 동기화 검증"을 위해 화면 상단에 보호자1/보호자2 역할 전환 버튼을 추가했고, "같이 확인하기" 버튼으로 `/api/notices/[id]`를 다시 불러와 상대방이 체크한 내용을 Pull 방식으로 동기화한다.
- 안드로이드 기기가 adb에서 다시 안 보임(재연결 필요) — 기기 확인 후 새 화면으로 재빌드/설치 예정.

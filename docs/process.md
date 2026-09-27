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
- 참고 프로젝트 Wolharang/moa(develop 브랜치, TempClassifierService)의 NVIDIA 연동 방식을 실제 코드까지 확인 후 반영: `lib/ai/client.ts`에 **모델 체인(콤마 구분 다중 모델 폴백) + 연속 실패 시 일시 중단(cool-down)** 구조 추가. NVIDIA NIM 40 RPM 제한 위험에 대한 구체적 대응책.

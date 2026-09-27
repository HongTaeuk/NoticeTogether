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

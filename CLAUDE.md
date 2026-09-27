# NoticeTogether

맞벌이 부모를 위한 학교 알림 요약 및 준비물 체크리스트 앱. Android 전용.

## 작업 원칙

- **모든 개발/설계 결정은 `docs/06_prd.md`(PRD)와 `docs/05_tech_review.md`(기술 검토)를 기준으로 한다.** 새 기능을 추가하거나 구조를 바꾸기 전에 이 두 문서와 어긋나지 않는지 먼저 확인할 것.
- PRD의 범위를 벗어나는 기능(OCR/사진 업로드, 실시간 알림, 교사 직접 메시지, 결제, Play Store 배포 등)은 **명시적으로 Out of Scope**이므로 임의로 추가하지 않는다.
- 설계나 우선순위가 모호하면 `docs/` 전체(01~06, RFP, 해결검토)를 참고하고, 그래도 불명확하면 사용자에게 물어본다.
- 구현이 PRD/기술검토와 다르게 갈 수밖에 없는 상황이면, 조용히 다르게 만들지 말고 사용자에게 알리고 문서를 함께 갱신한다.

## 확정 기술 스택 (docs/05_tech_review.md)

- 모바일: Bare React Native + TypeScript (Expo 아님), 알림은 Kotlin 네이티브 모듈(AlarmManager + Notifee) — **Android 전용, iOS 없음**
- 백엔드: Next.js(App Router), Vercel Serverless Functions
- DB/인증: Supabase (Postgres + Auth, RLS로 가구 단위 접근 제어)
- AI: NVIDIA NIM 무료 API (OpenAI 호환 엔드포인트, Llama/Qwen) — OpenAI API 아님, `/lib/ai`로 벤더 추상화 유지
- 배포: Play Store 미사용, APK 직접 빌드 후 `adb install`/사이드로드
- 모노레포 구조: `/apps/mobile`, `/apps/web-api`, `/supabase/migrations`

## MVP 개발 순서 (docs/06_prd.md Part 8)

1. 텍스트 붙여넣기 → AI 요약/체크리스트 추출 (단일 화면)
2. 원문 보기 토글
3. 체크 완료 상태 저장
4. 임시 계정 2개로 상태 동기화(Pull 방식) 검증
5. 배너 미리보기가 "읽음" 처리 안 되는지 검증
6. 액션노트(한마디) 공유
7. 마감 임박 알림(정해진 시간)
8. 알림 타이밍 개인화
9. 아동 정보 동의 절차
10. 실제 가입/로그인/초대코드 연결 (의도적으로 마지막)

인증/가구 초대 시스템은 **의도적으로 맨 마지막**이다 — 핵심 가치 검증을 임시 계정으로 먼저 끝내기 위함이므로 순서를 앞당기지 않는다.

## 작업 규칙

- 코드를 수정하면 `.claude/settings.json`의 hook이 자동으로 git add/commit/pull/push한다 (조용히 동작, 별도 조치 불필요).
- **모든 변경 사항은 `docs/process.md`에 기록한다.**
- 개발에 필요한 도구/SDK/패키지 설치는 사용자 승인 없이 바로 진행해도 된다 (destructive/비가역적 작업은 예외).

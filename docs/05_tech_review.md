# 05_tech_review.md — 맞벌이 가정 학교 알림 & 자녀 준비물 챙김 지원 서비스: 기술 검토

작성일: 2026-09-27 | 작성자: 홍태욱
전제 문서: `01_research.md`(리서치), `02_customer_profile.md`(고객 프로필), `03_solution.md`(솔루션 탐구), `04_service_overview.md`(종합 개요)

본 문서는 PRD 작성 이전 단계에서 반드시 확인해야 할 기술 검토를 담는다. (1) 서비스 개요에 적힌 핵심 기능이 실제로 구현 가능한지, 어떤 기술이 필요하고 비용이 발생하는지, (2) 기술 스택(언어·프레임워크·DB)과 인프라(호스팅·서버·스토리지·도메인)를 여러 대안과 함께 비교해 확정하고, (3) 전체 시스템이 하나로 어떻게 동작하는지 아키텍처를 설계하고, (4) 저장할 데이터 모델을 신중히 설계하고, (5) 외부 의존성의 비용·대체가능성·장애영향을 정리한다.

---

# PART 1. 핵심 기능별 구현 가능성 및 비용 검토

## 1-1. 검토 대상 기능

`04_service_overview.md`에서 확정한 MVP 핵심 기능 3종(토글형 요약-원문 대조, 최소 이벤트 3종 추적, Pull 기반 배우자 상태 공유)과 원본 기능 요구사항(FR-1~3)을 기준으로 검토했다.

## 1-2. 기능별 검토표 (1차, OpenAI 유료 API 기준 — 이후 정정됨)

| 기능 | 구현 가능성 | 필요 기술 | 비용 발생 여부 |
|---|---|---|---|
| FR-1: AI 자동 요약(요약-원문 대조 포함) | 가능, 검증됨 | LLM API + Structured Output(`strict: true`) | 비용 발생(사용량 기반) |
| FR-2-1: 듀얼 보호자 계정·열람 | 가능 | Supabase Auth(가족 그룹·역할 기반 접근 제어) | 무료(무료 티어 내) |
| FR-2-2: Pull 기반 조치 공유 | 가능, 구현 단순 | Supabase Postgres 단순 조회 API | 무료(무료 티어 내) |
| FR-3: 개인화 알림 주기(스크린타임 기반) | 부분적으로만 가능 | 앱 내 행동 로그 기반 근사치(가능) vs OS 스크린타임 실측(불가능에 가까움) | PUSH 발송 자체는 무료 |
| 최소 이벤트 3종 추적 | 가능, 구현 단순 | 클라이언트 이벤트 로깅 + Supabase 테이블 저장 | 무료 |
| PUSH 발송(기한 임박 알림) | 가능, 완전 무료 | FCM 또는 자체 Web Push(VAPID), 이후 Notifee/AlarmManager로 정정 | 무료(볼륨 무관) |

## 1-3. 1차 비용 계산 (OpenAI GPT-4o-mini 기준, 참고용)

OpenAI 모델 가격을 기준으로 최초 계산했다. GPT-4o는 입력 100만 토큰당 2.50달러, 출력 10.00달러인 반면, GPT-4o-mini는 입력 0.15달러, 출력 0.60달러로 약 16.7배 저렴하다. 가정통신문 요약·항목 추출처럼 복잡한 추론이 필요 없는 고빈도 추출 작업에는 mini급 모델이 적합하다는 것이 업계 일반론이다.

가정통신문 1건(원문 약 1,500자)을 GPT-4o-mini로 요약하는 비용은 약 0.0003달러(약 0.4원) 수준이며, 월 15건씩 처리한다고 가정하면:
- 가정 100곳: 월 약 614원
- 가정 1,000곳: 월 약 6,142원
- 가정 10,000곳: 월 약 61,425원

이는 매우 저렴한 수준이지만, 이후 논의에서 "완전 무료로 진행하고 NVIDIA 무료 API를 사용한다"는 방향으로 전환되어 아래 Part 1-4로 대체되었다.

## 1-4. 정정: NVIDIA NIM 무료 API 기반 완전 무료 구현안

### NVIDIA NIM 무료 API의 실제 조건

`build.nvidia.com`(NVIDIA API Catalog)이 제공하는 무료 서비스형 API를 확인한 결과는 다음과 같다.

- **완전 무료, 카드 등록 불필요**: OpenAI 호환 엔드포인트(`integrate.api.nvidia.com/v1`)로 Llama 3.1/3.3, Mistral, Qwen 2.5, DeepSeek 등 100개 이상의 오픈 웨이트 모델을 무료로 호출할 수 있다.
- **속도 제한**: 계정(API 키) 단위로 약 40 RPM(분당 40회 요청)이라는 커뮤니티 관찰 기준이 있으며, 이는 모델별이 아니라 계정 전체에 공유되는 제한이다. NVIDIA는 공식 SLA를 발표하지 않으며, 이 수치는 트래픽 상황에 따라 변동될 수 있다.
- **용도 제한**: NVIDIA는 이 무료 티어를 "프로토타이핑·개발·테스트용"으로 명확히 규정하며, "실사용자 트래픽에는 적합하지 않다"고 공식·커뮤니티 양쪽에서 밝히고 있다. 속도 제한 인상 요청도 공식적으로 승인되지 않는다.
- **Structured Output 지원**: Llama 3.1/3.3, Qwen 2.5 등 대부분의 카탈로그 모델이 OpenAI 호환 엔드포인트를 통해 JSON 모드/함수 호출을 지원하므로, "준비물/제출서류/기한" 구조화 추출은 그대로 구현 가능하다.

**본 프로젝트는 테스트/검증 목적이므로 이 제약(프로토타입 전용, 40 RPM 제한)이 문제되지 않는다는 것을 확인했다.**

### 정정된 기능별 구현 가능성·비용표

| 기능 | 구현 가능성 | 기술 | 비용 |
|---|---|---|---|
| FR-1: AI 자동 요약 | 가능(개발·검증 단계) | NVIDIA NIM 무료 API(Llama 3.1/3.3 또는 Qwen 2.5, OpenAI 호환 엔드포인트) | 완전 무료(단, 40 RPM 계정 전체 공유 제한) |
| FR-2-1·2-2: 듀얼 계정·Pull 기반 조치 공유 | 가능 | Supabase 무료 티어 | 완전 무료 |
| FR-3: PUSH 발송 | 가능 | Kotlin 네이티브(AlarmManager/Notifee) | 완전 무료(볼륨 무관, OS 내장) |
| FR-3: 개인화 알림(스크린타임 대체) | 부분 가능(로그 기반 근사치) | 앱 내 이벤트 로그 + Supabase | 완전 무료 |
| 배포 | 가능 | Vercel Hobby 플랜(백엔드), APK 직접 배포(모바일) | 완전 무료 |

### 정정이 주는 트레이드오프

1. **처리량 제약**: 계정당 약 40 RPM 상한은 MVP 검증 단계(수십~수백 가정)에서는 문제가 되지 않을 가능성이 높으나, 새 학기 초처럼 다수 사용자가 동시에 몰리는 시점엔 병목 가능성이 있다.
2. **공식적으로 개발·테스트 목적**: 향후 실사용자 대상 정식 서비스로 확장하려면 NVIDIA Enterprise 라이선스 또는 타 벤더 전환이 필요하다. 본 프로젝트는 MVP 검증(캡스톤 성격의 실제 사용자 인터뷰·소규모 파일럿)까지가 목표이므로 무료 티어로 완결 가능하다.
3. **폴백 설계 권장**: 요청 제한에 걸렸을 때를 대비해 재시도 로직을 넣고, 프롬프트·스키마를 특정 벤더에 종속되지 않는 OpenAI 호환 인터페이스로 설계해 Gemini·Groq 등으로 즉시 교체 가능하도록 한다.

---

# PART 2. 기술 스택 및 인프라 환경 확정 (여러 대안 비교 후 결정)

기술 스택은 한번 정하면 바꾸기 극히 어렵다는 전제 아래, 각 레이어별로 여러 대안을 비교한 뒤 확정했다.

## 2-1. 레이어 1: 사용자 플랫폼(앱 형태) — 어디서 쓰는가부터 결정

### 1차 비교: PWA vs React Native/Expo vs Flutter

| 구분 | PWA(웹 앱) | React Native/Expo | Flutter |
|---|---|---|---|
| 개발 기간(MVP 기준) | 4~8주 | 8~14주(+앱스토어 심사 1~4주) | 8~14주(+앱스토어 심사) |
| 배포 방식 | 링크 하나로 즉시 배포, 심사 없음 | 앱스토어·플레이스토어 심사 필요 | 앱스토어·플레이스토어 심사 필요 |
| iOS 푸시 알림 | 가능하나 반드시 "홈 화면 추가" 후에만 작동(iOS 16.4+) | 네이티브 푸시, 제약 없음 | 네이티브 푸시, 제약 없음 |
| 배우자 동시 온보딩 마찰 | 매우 낮음(링크 클릭만으로 접근) | 앱 설치 필요(마찰 있음) | 앱 설치 필요(마찰 있음) |
| 성능/UX 완성도 | 네이티브보다 다소 낮음 | 네이티브에 가까움 | 네이티브에 가까움, 커스텀 UI 강점 |

### 2차 비교: Kotlin 네이티브(안드로이드) 안 추가 검토

처음에는 "Kotlin=Google Play 정식 배포"를 전제로 검토해, 신규 개인 개발자 계정은 12명 테스터로 14일 연속 비공개 테스트 + 심사 최대 7~14일이 걸려 총 3주 가까이 소요된다는 이유로 부적합하다고 판단했다. 그러나 **이 전제 자체가 틀렸다는 것이 확인됐다** — Google 공식 문서는 "Play와 같은 마켓플레이스에서 앱을 출시하고 싶지 않은 경우" APK를 이메일·웹사이트·드라이브로 직접 배포(사이드로딩)하는 것을 정식 지원하며, 2026년 하반기 기준으로도 한국에서는 이 방식이 계속 유효하다.

### 정정된 비교표: Kotlin 네이티브(APK 직접 배포) 포함

| 구분 | PWA | React Native/Expo | Flutter | Kotlin 네이티브(APK 직접 배포) |
|---|---|---|---|---|
| 배포 소요 시간 | 즉시 | 즉시(APK 빌드 시) | 즉시(APK 빌드 시) | 즉시 — `adb install` 한 줄 또는 APK 파일을 카톡으로 전송하면 끝. 심사 대기 0일 |
| iOS 지원 | 가능 | 가능 | 가능 | 불가능(안드로이드 전용) |
| 안드로이드 알림 최적화 | 웹 푸시로 제한적 | 네이티브 브릿지 필요 | 네이티브 브릿지 필요 | 최고 — WorkManager/AlarmManager로 배터리 최적화까지 고려한 안정적 백그라운드 스케줄링, NotificationChannel로 알림 유형별 세밀 제어 |
| 배우자 온보딩 마찰 | 매우 낮음 | 앱 설치 필요 | 앱 설치 필요 | APK 파일 전송 + "출처를 알 수 없는 앱" 설치 허용 — 링크 클릭보다는 한 단계 번거로움 |

### 최종 확정: React Native + Kotlin 네이티브 모듈 하이브리드

순수 Kotlin 네이티브 안(안드로이드 전용, iOS 완전 배제)과 순수 React Native 안(정교한 알림 제어의 한계) 사이에서, **React Native 코어 + Kotlin 네이티브 모듈 결합**으로 확정했다.

**구조의 원리**: React Native 공식 문서가 정의하는 구조 그대로다. 화면 UI, 화면 전환, 데이터 상태 관리 같은 공통 로직은 React Native(JS/TypeScript)로 작성하고, 안드로이드에 특화된 기능(정교한 알림 스케줄링, 배터리 최적화 대응)이 필요한 지점만 Kotlin으로 작성한 "네이티브 모듈"을 만들어 JS에서 호출한다. 최신 방식은 Turbo Native Module이라 불리며, TypeScript로 명세를 먼저 정의하고 Codegen이 타입을 자동 변환해주는 구조가 2026년 기준 권장된다.

**왜 이 조합이 적절한가**: 화면(로그인, 체크리스트, 요약-원문 대조 뷰)은 JS/TS로 빠르게 개발하면서도, FR-3(개인화 알림)처럼 정교한 안드로이드 알림 제어가 필요한 부분만 Kotlin으로 파고들 수 있다. 알림 라이브러리 생태계도 이미 이 하이브리드를 전제로 성숙해 있다 — Notifee(`@notifee/react-native`)는 React Native 앱에서 채널·커스텀 사운드·액션 버튼 등 세밀한 알림 표시를 담당하며 내부적으로 네이티브 코드(Kotlin/Java)를 사용한다. 최근 포크(`react-native-notify-kit`)는 중요한 기술적 사실을 알려준다 — WorkManager는 배터리 친화적이지만 시간 민감형 알림에는 신뢰할 수 없고(Doze 모드·OEM 전력 관리로 지연·누락 가능), 기본값을 AlarmManager로 바꿔 앱이 종료된 상태에서도 정시에 알림이 전달되도록 보장한다. 이는 `02_customer_profile.md`의 성공 정의(정확한 시점에 PUSH가 가야 확인-행동 격차가 줄어든다)와 직결되는 중요한 기술 선택이다.

**Expo(관리형) vs Bare React Native**: Kotlin 네이티브 모듈 추가가 자유로운 쪽이 더 낫다는 판단에 따라 **Bare React Native**를 최종 채택했다. Expo 관리형 워크플로우는 `expo-notifications`로 간편하게 처리할 수 있지만 Kotlin 네이티브 모듈을 직접 추가하려면 Bare 워크플로우 전환이나 Config Plugin이 필요해 자유도가 떨어진다. Bare React Native로 시작하면 처음부터 Kotlin 모듈을 자유롭게 추가할 수 있다.

## 2-2. 레이어 2: 백엔드/데이터베이스 (Supabase vs Firebase)

| 구분 | Supabase | Firebase |
|---|---|---|
| 데이터 모델 | 관계형(PostgreSQL) | NoSQL 문서형(Firestore) |
| 실시간 동기화 | Postgres 논리적 복제 기반, 테이블별 설정 필요, 오프라인 동기화·충돌 해결은 직접 구현 | Firestore 리스너 기반, 설정 없이 즉시 작동, 오프라인 동기화·충돌 해결 자동 지원 |
| 인증/권한 제어 | JWT + Row Level Security(행 단위 세밀한 제어) | Firebase Auth + Security Rules(성숙하지만 세밀한 다중 역할 제어는 직접 구현 필요) |
| 가격 구조 | 예측 가능(컴퓨트·스토리지 기준), 무료 티어 후 동일 워크로드 기준 월 $50~100 수준 | 읽기/쓰기/삭제 건별 과금, 대규모 시 급증 가능(동일 워크로드 월 $500~1,500 사례) |
| 오픈소스·이식성 | 오픈소스, 셀프호스팅 가능, 벤더 종속 낮음 | Google 종속, 이식성 낮음 |

**확정: Supabase.** `03_solution.md`에서 부부 공동확인을 이미 "Pull 기반 조회로 충분"하다고 결론 내렸으므로 Firebase의 실시간 강점이 결정적 이점이 되지 않는다. 반면 Supabase의 예측 가능한 가격과 Row Level Security(가족 단위 접근 제어에 적합)는 이 서비스 구조와 잘 맞는다.

## 2-3. 레이어 3: AI 연동 방식

| 구분 | NVIDIA NIM | Google Gemini API | Groq |
|---|---|---|---|
| 무료 여부 | 완전 무료, 전화번호 인증 필요 | 완전 무료, 카드 불필요 | 완전 무료, 카드 불필요 |
| 속도 제한 | 최대 40 RPM | AI Studio 기준 요율 제한 | 상대적으로 관대 |
| Structured Output 지원 | OpenAI 호환, 지원됨 | 네이티브 지원(JSON 모드) | OpenAI 호환, 지원됨 |
| 공식 용도 제한 | "프로토타입·개발·테스트 전용" 명시 | 엄격한 제한 명시 없음 | 엄격한 제한 명시 없음 |

**확정: NVIDIA NIM.** 테스트 목적임을 확인했으므로 용도 제한은 문제되지 않는다. 다만 40 RPM 제한이 실제 개발 중 병목이 될 경우를 대비해 프롬프트·스키마를 OpenAI 호환 형식으로 벤더 중립적으로 작성한다.

> **[갱신 2026-09-27] 실측 후 최종 결정: Gemini 1순위 + NVIDIA NIM 폴백.**
> 위 표는 API 스펙(무료 여부, 속도 제한) 비교였고, 실제 코드를 붙여 동일한 가정통신문 두 건으로 여러 모델을 반복 테스트해본 결과 **정확도** 문제가 드러났다.
> - NVIDIA NIM 무료 티어에서 이 계정이 접근 가능한 모델(원래 지정했던 `meta/llama-3.1-70b-instruct`는 단종됨)은 대부분 원문에 없는 내용을 지어내는 환각이 있었고(`deepseek-ai/deepseek-v4.1-flash`), 정확한 모델(`nvidia/nemotron-3-ultra-550b-a55b` 등)은 추론(reasoning) 토큰을 과도하게 써서 느리거나 응답이 잘렸다.
> - Google이 제공하는 Gemini OpenAI 호환 엔드포인트(`generativelanguage.googleapis.com/v1beta/openai`)를 사용자가 추가로 제안해 테스트한 결과, `gemini-3.5-flash-lite`가 속도·정확도 면에서 가장 우수했다(단, 완벽하지 않고 가끔 항목을 다른 단어로 착각하는 환각이 남아있음 — 이는 FR-1의 신뢰도 표시/수정 UI로 보완).
> - 최종 체인: **1순위 `gemini-3.5-flash-lite`, 2순위(폴백) NVIDIA `nemotron-3-ultra-550b-a55b` → `nemotron-3-super-120b-a12b` → `nemotron-3.5-lightning-30b-a3b`.** `lib/ai/client.ts`가 프로바이더(Gemini/NVIDIA) 단위로 base URL·API 키·모델 체인을 분리 관리하며, (프로바이더,모델) 조합별로 연속 실패 시 쿨다운 후 다음으로 넘어가는 구조는 유지된다. 근거 문서: `docs/process.md` 2026-09-27 기록.

## 2-4. 레이어 4: 배포/호스팅

이 레이어는 대안 간 차이가 크지 않아 Vercel로 수렴한다. Next.js와 완전 통합되고 Hobby 플랜이 무료이며, Netlify·Cloudflare Pages 등 대안이 있지만 Next.js App Router와의 통합도에서 Vercel이 가장 매끄럽다.

## 2-5. 최종 확정 기술 스택

| 영역 | 선택 | 선택 이유 |
|---|---|---|
| 모바일 앱 언어/프레임워크 | Bare React Native + TypeScript | 화면 개발 속도와 Kotlin 네이티브 모듈 자유도를 동시에 확보 |
| 네이티브 모듈 | Kotlin(Android) | 안드로이드 알림 최적화(AlarmManager, NotificationChannel)에 최적 |
| 알림 라이브러리 | Notifee(`@notifee/react-native`) | RN에서 Kotlin 기반 정교한 알림 표시·채널 제어, AlarmManager 대체 옵션 제공 |
| 백엔드 언어/프레임워크 | TypeScript + Next.js(App Router) | Vercel과 완전 통합, API Routes로 백엔드 로직 처리 |
| 데이터베이스 | Supabase(Postgres) | 무료 티어로 인증·DB 동시 해결, RLS로 가족 단위 접근 제어 |
| 인증 | Supabase Auth | 이메일/소셜 로그인, 가족 그룹 내 다중 계정 매핑에 적합 |
| AI 추론 | NVIDIA NIM 무료 API(OpenAI 호환) | 완전 무료, Llama 3.1/3.3 또는 Qwen 2.5로 Structured Output 지원 |
| PUSH 발송 | Kotlin 네이티브(AlarmManager) + Notifee | 완전 무료, OS 내장, 기기 로컬에서 정확한 시점 발화 보장 |

## 2-6. 최종 확정 인프라 환경

| 항목 | 선택 | 비용 |
|---|---|---|
| 백엔드 호스팅 | Vercel(Hobby 플랜) | 무료 |
| 서버 | Vercel Serverless Functions(Next.js API Routes) | 무료(Hobby 한도 내) |
| 데이터베이스/스토리지 | Supabase(Free tier: DB 500MB, MAU 5만 명) | 무료 |
| 모바일 앱 배포 | APK 직접 빌드 → 카카오톡/구글드라이브로 전달 | 무료, 스토어 심사 없음 |
| 도메인 | Vercel 기본 서브도메인(`프로젝트명.vercel.app`) | 무료 |

별도 백엔드 서버(EC2 등)가 필요 없는 이유는 Vercel Serverless Functions가 API 서버 역할을 대신하기 때문이다. 별도 오브젝트 스토리지도 불필요한데, 원문 텍스트·요약 결과·이벤트 로그 모두 Supabase Postgres 테이블에 저장하면 충분하고(이미지 업로드 같은 대용량 파일 저장은 MVP 범위에 없음, OCR 입력은 `03_solution.md`에서 이번 단계 제외로 결정됨) 커스텀 도메인도 테스트 목적이므로 불필요하다.

---

# PART 3. 서비스 아키텍처 설계

## 3-1. 배치 원칙: 초기엔 모놀리식

지금까지 확정된 기능은 크게 세 갈래(AI 요약, 데이터·인증, 알림)뿐이고, `03_solution.md`에서 채택한 3안(토글형 대조, Pull 기반 공유, 최소 이벤트 3종)은 모두 단순 조회·단순 저장 수준의 로직이다. 여러 서비스를 쪼갤 만큼 트래픽이나 팀 규모가 크지 않고, MVP 검증 단계에서는 배포·디버깅이 한곳에서 끝나는 것이 압도적으로 유리하다. 따라서 백엔드 로직 전체를 하나의 배포 단위(모놀리식)로 묶되, 내부적으로는 책임에 따라 폴더 구조로만 분리해, 나중에 특정 부분(예: AI 요약)만 별도 서비스로 분리하고 싶을 때도 코드 이동만으로 대응 가능하게 한다.

## 3-2. 시스템 배치도

```
[React Native 앱 (Kotlin 네이티브 모듈 포함)]
        │
        │  ① REST API 호출 (요약 요청, 체크리스트 CRUD)
        │  ② Supabase 클라이언트 SDK (인증, DB 직접 조회)
        ▼
┌───────────────────────────────────────────┐
│   Vercel 배포 (Next.js API Routes = 백엔드)  │  ← 모놀리식 서버
│                                             │
│   /api/summarize   → NVIDIA NIM API 호출     │
│   /api/notices     → Supabase 조회/기록       │
│   /api/checklist   → Supabase 조회/기록       │
│   /api/events      → 이벤트 3종 로깅          │
└───────────────────────────────────────────┘
        │                           │
        ▼                           ▼
[NVIDIA NIM 무료 API]        [Supabase (Postgres + Auth)]
 (Llama/Qwen, OpenAI 호환)     - 가족 그룹, 계정, 알림, 체크리스트
                                - 이벤트 로그 테이블
                                - Row Level Security로 가족 단위 격리

[Kotlin 네이티브 모듈: AlarmManager + Notifee]
 → 기기 로컬에서 정시 알림 스케줄링·표시 담당
 → 서버는 "언제 무엇을 알릴지"만 계산해서 앱에 내려주고,
   실제 발화 시점의 정확도는 기기 쪽 AlarmManager가 보장
```

## 3-3. 통신 방식: REST + Supabase 클라이언트 직접 통신(하이브리드)

**GraphQL을 기각한 이유**: 화면 수가 적고(요약 대조, 체크리스트, 배우자 상태 조회 정도) 클라이언트가 필요로 하는 데이터 형태가 화면마다 크게 다르지 않다. GraphQL의 강점(오버페칭 방지, 유연한 쿼리)이 빛을 발하려면 화면·엔티티 종류가 훨씬 많아야 하는데, 지금 단계에서는 스키마 설계·리졸버 작성이라는 불필요한 초기 비용만 늘린다.

**WebSocket을 기본으로 채택하지 않은 이유**: `03_solution.md`에서 이미 "Pull 기반(사용자가 앱을 열 때 조회)"을 명시적으로 채택했다. 실시간 소켓 연결을 유지하는 인프라 부담 없이도 핵심 가치(배우자가 뭘 했는지 안다)를 검증할 수 있다고 결론 냈으므로, 이번 단계에서 WebSocket을 도입할 이유가 없다.

**최종 선택**: AI 요약처럼 "서버가 반드시 중개해야 하는" 로직(API 키를 클라이언트에 노출하면 안 됨)은 REST 엔드포인트(`/api/summarize`)로 감싸고, 단순 CRUD(체크리스트 조회·갱신, 배우자 상태 조회)는 Supabase의 클라이언트 SDK가 Row Level Security를 통해 직접 안전하게 처리하도록 맡긴다. 이렇게 하면 불필요한 API 계층을 최소화하면서도, NVIDIA API 키 같은 비밀 정보는 서버 밖으로 나가지 않는다.

## 3-4. 코드 구조

```
/apps
  /mobile          ← React Native 앱
    /src
      /screens     (요약대조, 체크리스트, 배우자상태 등 화면)
      /native      (Kotlin 네이티브 모듈 브릿지 호출부)
    /android
      /app/src/main/java/.../modules
                    (AlarmManager, Notifee 연동 Kotlin 코드)

  /web-api         ← Next.js (Vercel 배포, 백엔드 역할)
    /app/api
      /summarize   (NVIDIA NIM 호출, Structured Output 검증)
      /notices     (알림 CRUD)
      /checklist   (체크리스트 CRUD)
      /events      (3종 이벤트 로깅)
    /lib
      /ai          (프롬프트, 스키마 정의 — 벤더 교체 대비 추상화)
      /supabase    (DB 클라이언트, RLS 헬퍼)

/supabase
  /migrations      (DB 스키마 버전 관리)
```

**이유**: `/apps/mobile`과 `/apps/web-api`를 한 저장소(모노레포) 안에서 물리적으로 분리하되 배포는 각각 독립적으로 한다(모바일은 APK 빌드, 백엔드는 Vercel 배포). `lib/ai`를 별도 폴더로 뺀 이유는 NVIDIA API의 40 RPM 제한에 걸릴 경우 Gemini나 Groq 같은 대안으로 교체해야 할 가능성이 있기 때문에, 프롬프트·스키마 정의를 특정 벤더 SDK에 종속시키지 않고 OpenAI 호환 인터페이스로 감싸두기 위함이다.

## 3-5. 배포 방식과 이유

| 구성요소 | 배포 방식 | 이유 |
|---|---|---|
| 백엔드(Next.js API) | Vercel 자동 배포(Git push 시 즉시 반영) | 서버 관리 불필요, 무료, Claude Code로 코드 수정 후 즉시 반영해 검증 속도 극대화 |
| 데이터베이스 | Supabase 클라우드(관리형) | 별도 서버 운영 없이 무료 티어로 인증·DB 동시 해결 |
| 모바일 앱 | Kotlin 네이티브 모듈 포함 APK를 직접 빌드해 카카오톡/드라이브로 전달 | 스토어 심사 없이 즉시 테스터에게 전달 가능, Bare RN이라 Kotlin 모듈 자유롭게 추가 가능 |
| 알림 발화 | 서버가 아니라 기기 로컬(AlarmManager)에서 최종 트리거 | 서버가 매 순간 푸시를 쏘는 대신 "언제 알릴지" 스케줄만 앱에 전달하고, 실제 발화는 기기가 담당해 배터리 최적화·네트워크 단절 상황에도 안정적으로 동작 |

## 3-6. 각 핵심 결정의 종합 근거

**왜 모놀리식인가**: 기능 3갈래(AI, 데이터, 알림)뿐이고 팀 규모가 1인이므로, 서비스를 쪼개는 순간 배포·디버깅 복잡도만 늘고 얻는 이득이 없다.

**왜 REST+Supabase 하이브리드인가**: GraphQL은 화면 다양성이 부족한 지금 단계엔 과하다. WebSocket은 이미 Pull 방식으로 대체하기로 결론 낸 사안이다. REST는 비밀키 보호가 필요한 AI 호출에만 쓰고, 나머지는 Supabase RLS로 직접 처리해 서버 부담을 최소화한다.

**왜 알림 발화를 서버가 아니라 기기가 맡는가**: `02_customer_profile.md`의 성공 정의(정확한 시점에 알림이 가야 한다)를 지키려면, 네트워크 끊김·서버 장애와 무관하게 알림이 발화되어야 한다. AlarmManager는 기기에 스케줄을 미리 심어두는 방식이라 이 요구를 만족시킨다.

---

# PART 4. 데이터 모델 설계

## 4-1. 설계 원칙

`02_customer_profile.md` Part 7(성공 정의)에서 `notice_opened`, `item_checked`, `partner_view_confirmed` 3개 이벤트를 성공 기준으로 정의했으므로, 이 이벤트들이 "누가, 언제, 무엇에 대해" 발생했는지 사후에도 재구성할 수 있어야 한다. 또한 `01_research.md` Part 5(도메인 지식)의 법적 요건(만 14세 미만 아동 정보의 법정대리인 동의, AI 생성물 표시)도 데이터 구조 자체에 반영해야 나중에 소급 적용이 불가능한 문제를 피할 수 있다. 원칙: **저장하지 않은 것은 나중에 꺼낼 수 없고, 처음 설계 안 한 데이터는 나중에 추가해도 이전 데이터에는 적용되지 않는다.**

## 4-2. ER 다이어그램(텍스트)

```
households (가정)
    │ 1:N
    ├── users (보호자 계정)         [households.id ← FK]
    ├── children (자녀)             [households.id ← FK]
    │
    └── notices (알림/가정통신문)    [households.id ← FK]
            │ 1:N
            ├── checklist_items (체크리스트 항목)  [notices.id ← FK]
            │       │ 1:N
            │       └── item_actions (조치 기록)   [checklist_items.id ← FK, users.id ← FK]
            │
            └── notice_events (열람 이벤트)         [notices.id ← FK, users.id ← FK]

consents (동의 기록)          [households.id ← FK, children.id ← FK]
ai_summary_logs (AI 처리 로그) [notices.id ← FK]
```

## 4-3. 테이블별 상세 설계

### 1) `households` (가정 단위)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | 가정 단위 식별자. 부부 2인이 하나의 가정에 묶이는 기준점 |
| created_at | timestamp | 가입 시점, 코호트 분석용 |
| invite_code | text | 배우자 초대용 코드. "배우자 초대가 온보딩 마찰"이라는 리스크 대응 — 초대 성공률을 추적하려면 코드 발급·사용 이력이 필요 |

**신중 사항**: 가정을 처음부터 "부부 2인 고정"으로 하드코딩하면 한부모 가정이나 다자녀 가정을 나중에 지원할 때 스키마 변경이 필요하다. `households`와 `users`를 1:N으로 설계해 2인이든 1인이든 3인이든 유연하게 수용한다.

### 2) `users` (보호자 계정)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | Supabase Auth 사용자 ID와 동일 |
| household_id | uuid FK | 소속 가정 |
| role | enum('primary','secondary') | 엄마(정보 확인 도맡는 쪽)/아빠(정보 소외되는 쪽)의 비대칭 구조를 데이터로 구분, 향후 개인화 로직 분기에 사용 |
| notification_activity_score | jsonb | 스크린타임 실측 불가라는 결론에 따라 "요일별·시간대별 앱 열람 빈도"를 프록시로 누적. 지금 로직이 없어도 원시 로그는 지금부터 쌓아야 나중에 개인화 알고리즘을 붙일 수 있음 |

### 3) `children` (자녀)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK | |
| name | text | |
| birth_year | integer(연도만) | 생년월일 전체가 아니라 연도만 저장 — 개인정보 최소 수집 원칙에 따라 만 14세 미만 판별에 필요한 최소 정보만 남김 |
| disability_type | text, nullable | 장애 유형(선택 입력). 장애 자녀 보호자 페르소나(쉬운 말 요약, 접근성)를 지원하려면 필요, 처음부터 없으면 나중에 소급 적용 불가 |

**신중 사항**: `disability_type`은 민감정보이므로 반드시 nullable(선택)로 두고, 별도 동의(`consents` 테이블)를 거쳐야만 채워지도록 애플리케이션 레벨에서 강제한다.

### 4) `notices` (알림/가정통신문 원문)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK | |
| raw_text | text | 원문 그대로 저장. 토글형 요약-원문 대조가 작동하려면 원문이 영구 보존되어야 함 |
| source_type | enum('school','welfare_center') | 학교 알림과 복지관 알림 구분(원본 필요 요구사항 1) |
| created_by | uuid FK(users) | 누가 입력했는지 |
| created_at | timestamp | |

### 5) `checklist_items` (AI가 추출한 체크리스트 항목)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | |
| notice_id | uuid FK | |
| category | enum('준비물','제출서류','기한') | 원본 필요 요구사항 2를 그대로 구조화 |
| content | text | AI가 추출한 항목 내용 |
| due_date | date, nullable | 기한. PUSH 타이밍 계산(기한 임박 판단)의 기준값 |
| ai_confidence | float, nullable | AI 확신도. 확신도 낮은 항목은 UI에서 "원문 확인 요청"을 강조해 AI 신뢰 불안 완화. 처음부터 안 받으면 나중에 신뢰도 기반 UI를 붙일 때 과거 항목엔 값이 없음 |
| is_edited_by_user | boolean | 사용자가 AI 추출 결과를 직접 수정했는지 여부. "사용자 수정 비율로 AI 정확도 측정"이라는 성공 지표를 실제로 계산하려면 반드시 필요 |
| status | enum('pending','checked') | 체크 여부 |
| checked_by | uuid FK(users), nullable | 누가 체크했는지. `item_checked` 이벤트를 이 필드로 재구성 가능 |
| checked_at | timestamp, nullable | |

### 6) `item_actions` (부부 조치 기록)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | |
| checklist_item_id | uuid FK | |
| user_id | uuid FK | 누가 조치했는지 |
| action_note | text | "구매 완료", "제출함" 같은 자유 기록. 원본 기능 요구사항 2-2를 그대로 구현 |
| created_at | timestamp | |

**신중 사항**: `checklist_items.checked_by` 단일 필드만으로는 "체크를 취소했다가 다시 했다"는 이력이 사라진다. `item_actions`를 별도 이력 테이블로 분리해, 상태값은 최신 상태만 보여주는 `checklist_items`에 두고 과거 이력 전체는 append-only로 쌓아, 나중에 "부부가 얼마나 자주 조치를 주고받았는가" 분석이 가능하게 한다.

### 7) `notice_events` (열람 이벤트 로그 — 성공 정의의 핵심)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | |
| notice_id | uuid FK | |
| user_id | uuid FK | |
| event_type | enum('notice_opened','partner_view_confirmed','source_compared') | 성공 정의 3개 이벤트 중 알림 단위 이벤트 둘 + 확장 이벤트(원문 대조 여부) |
| occurred_at | timestamp | |

**신중 사항**: 이 테이블을 `checklist_items`나 `users`에 컬럼 몇 개 추가하는 방식으로 대충 때우지 않고 별도 append-only 로그 테이블로 분리했다. 이렇게 해야 "한 알림을 여러 번 열어본 이력"이나 "배우자가 언제 확인했는지 시간차"까지 나중에 재구성할 수 있다. 상태값 하나만 저장하면 이 시간차 분석 자체가 영원히 불가능해진다.

### 8) `consents` (법정대리인 동의 기록)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK | |
| child_id | uuid FK, nullable | |
| consent_type | enum('child_info','disability_info','ai_processing') | 만 14세 미만 아동 정보, AI 처리 고지 등 법적 요건을 항목별로 분리 |
| granted_at | timestamp | |
| granted_by | uuid FK(users) | |

**신중 사항**: 동의 여부를 `users`나 `children`에 boolean 컬럼 하나로 넣지 않고 별도 테이블로 분리했다. 법적 분쟁 시 "언제, 누가, 무엇에 동의했는지"를 증빙해야 하는데, 값을 덮어쓰는 컬럼 방식이면 이전 동의 이력이 사라져 증빙 자체가 불가능해진다.

### 9) `ai_summary_logs` (AI 처리 로그)

| 필드 | 타입 | 이유 |
|---|---|---|
| id | uuid PK | |
| notice_id | uuid FK | |
| model_used | text | 어떤 모델(예: `meta/llama-3.3-70b-instruct`)로 처리했는지. NVIDIA API가 40 RPM 제한에 걸려 다른 벤더로 교체할 가능성이 있으므로, 어떤 요약이 어떤 모델에서 나왔는지 반드시 기록해야 향후 품질 비교나 롤백이 가능 |
| prompt_version | text | 프롬프트를 개선할 때마다 버전 표기 |
| raw_response | jsonb | 모델의 원본 구조화 응답 전체 저장(디버깅·재처리용) |
| created_at | timestamp | |

## 4-4. "지금 저장 안 하면 나중에 벌어지는 일" 요약

| 지금 저장 안 하면 | 나중에 벌어지는 일 |
|---|---|
| `ai_confidence`, `is_edited_by_user` | AI 정확도 개선 여부를 증명할 방법이 없음(채택한 핵심 검증 지표 자체가 무의미해짐) |
| `notice_events`를 별도 로그로 분리 안 함 | 성공 정의(3개 이벤트의 순차 발생)를 사후에 검증할 방법이 없음 |
| `notification_activity_score` | 개인화 알림 로직을 나중에 붙이려 해도 과거 행동 데이터가 없어 처음부터 다시 몇 주를 기다려야 함 |
| `consents`를 이력 테이블로 안 만듦 | 법적 분쟁 시 동의 증빙 불가능 |
| `raw_text`(원문) 미보존 | 토글형 대조 기능 자체가 성립 불가 |

---

# PART 5. 외부 의존성 정리

외부 서비스별 비용 구조, 대체 가능 여부, 장애 시 영향 범위를 정리했다.

| 외부 서비스 | 역할 | 비용 구조 | 대체 가능 여부 | 장애 시 영향 범위 |
|---|---|---|---|---|
| NVIDIA NIM API | AI 요약·구조화 추출 | 완전 무료(테스트 목적), 계정당 약 40 RPM 제한 | 높음 — `lib/ai`를 OpenAI 호환 인터페이스로 추상화해뒀으므로 Gemini·Groq 등으로 즉시 교체 가능 | 요약 생성 기능만 마비. 기존 알림 열람·체크리스트·부부 공유는 정상 동작(원문은 이미 저장되어 있으므로) |
| Supabase | 인증, DB, RLS | 무료 티어(DB 500MB, MAU 5만 명) | 중간 — 오픈소스라 이론상 셀프호스팅 가능하나, 실제 마이그레이션엔 상당한 작업 필요(Auth·RLS 정책 재구현) | **전면 장애** — 로그인·데이터 저장·조회 전체가 불가능해지는 단일 장애점(SPOF). 서비스 전체가 멈춤 |
| Vercel | 백엔드 API 호스팅, 배포 | 무료(Hobby 플랜) | 높음 — Next.js는 표준 Node.js로 어디서든 구동 가능, Netlify·Railway 등으로 이전 용이 | API 라우트 전체(`/api/summarize` 등) 마비. 단, 이미 기기에 저장된 로컬 알림 스케줄(AlarmManager)은 서버 장애와 무관하게 계속 동작 |
| AlarmManager/Notifee(기기 로컬) | 알림 발화 | 무료(OS 내장) | 해당 없음(제3자 서비스 아님) | 개별 기기 단위 문제(OS 버전 이슈 등)로 국한, 전체 서비스에 영향 없음 |

## 5-1. 가장 중요한 리스크: Supabase가 유일한 단일 장애점(SPOF)

이 구조에서 Supabase가 멈추면 서비스 전체가 멈춘다. 반면 NVIDIA API가 멈춰도 "이미 처리된 알림"은 정상적으로 보이고 열람·체크·공유가 가능하다(핵심 데이터가 이미 자체 DB에 저장되어 있기 때문). 이는 데이터 모델 설계에서 "원문을 반드시 저장한다"는 원칙이 장애 대응 관점에서도 정당화되는 지점이다 — AI가 다시 살아날 때까지 사용자는 원문을 직접 읽으며 서비스를 계속 쓸 수 있다.

---

# PART 6. 종합 요약

## 6-1. 확정된 전체 그림 (한 장 요약)

| 질문 | 답 |
|---|---|
| 비용은 얼마나 드는가 | 완전 무료(NVIDIA NIM 무료 API + Supabase 무료 티어 + Vercel Hobby + APK 직접 배포) |
| 사용자는 어디서 쓰는가 | 안드로이드 기기, React Native 앱(Kotlin 네이티브 모듈 포함) |
| 어떻게 배포하는가 | 백엔드는 Vercel 자동 배포, 앱은 APK 직접 빌드 후 카카오톡/드라이브로 전달(스토어 심사 없음) |
| 시스템 구조는 어떤가 | 모놀리식(Next.js API Routes 하나), REST+Supabase 클라이언트 하이브리드 통신 |
| 알림은 어떻게 정확히 오는가 | 서버가 스케줄만 계산해 전달하고, 실제 발화는 기기의 AlarmManager가 담당 |
| 무엇을 데이터로 남기는가 | 원문, AI 확신도·수정 여부, 열람 이벤트 3종, 동의 이력을 모두 별도 테이블로 append-only 보존 |
| 가장 큰 리스크는 무엇인가 | Supabase 장애 시 서비스 전체 마비(SPOF). NVIDIA API 장애는 요약 기능만 국한되어 영향 적음 |

## 6-2. 다음 단계 제안

1. Supabase 마이그레이션 SQL 작성(Part 4의 테이블 설계를 실제 DDL로 변환)
2. NVIDIA NIM API 프롬프트 및 JSON 스키마 설계(Structured Output `strict` 모드 적용)
3. React Native 프로젝트 초기 세팅 + Kotlin 네이티브 모듈(AlarmManager) 프로토타입
4. 위 기술 검토를 반영한 PRD 최종본 작성

---

*이 문서는 2026-09-27 21:37(KST) 기준으로 진행된 모든 기술 검토 논의(구현 가능성, 스택 비교, 아키텍처, 데이터 모델, 외부 의존성)를 통합한 기록이며, `01_research.md`·`02_customer_profile.md`·`03_solution.md`·`04_service_overview.md`와 함께 프로젝트의 근거 문서 세트를 완성한다. 이후 PRD 최종본 작성 시 이 문서를 기술 스택·아키텍처 근거로 참조한다.*

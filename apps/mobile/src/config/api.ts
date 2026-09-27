/**
 * Vercel에 배포된 apps/web-api 프로덕션 주소(고정 도메인, 배포마다 안 바뀜).
 * 로컬 백엔드로 테스트하려면 `adb reverse tcp:3000 tcp:3000` 후
 * "http://localhost:3000"으로 바꾸면 된다(에뮬레이터는 10.0.2.2:3000).
 */
export const API_BASE_URL = "https://noticetogether-web-api-notice-together.vercel.app";

/**
 * Google 로그인용 OAuth 2.0 "웹 애플리케이션" 클라이언트 ID(Supabase가 idToken을
 * 검증할 때 대조하는 값). 빈 문자열이면 AuthScreen이 Google 버튼을 눌러도 조용히
 * "아직 설정 중" 안내만 띄우고 이메일 가입으로 유도한다 — 아직 발급 전이라 비워둠.
 *
 * 발급 방법(사용자가 직접 해야 함, Claude Code가 대신 할 수 없는 외부 콘솔 작업):
 * 1) Google Cloud Console → OAuth 동의 화면 구성.
 * 2) 사용자 인증 정보 → OAuth 클라이언트 ID 2개 생성:
 *    - "웹 애플리케이션" 타입 1개 → 이 값을 여기 GOOGLE_WEB_CLIENT_ID에 채운다.
 *    - "Android" 타입 1개 → 패키지명(com.mobile)과 디버그/릴리즈 키스토어 SHA-1 지문 등록.
 * 3) Supabase 대시보드 → Authentication → Providers → Google 활성화,
 *    위 "웹" 클라이언트 ID/시크릿을 그대로 입력.
 */
export const GOOGLE_WEB_CLIENT_ID = "";

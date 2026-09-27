/**
 * Vercel에 배포된 apps/web-api 프로덕션 주소(고정 도메인, 배포마다 안 바뀜).
 * 로컬 백엔드로 테스트하려면 `adb reverse tcp:3000 tcp:3000` 후
 * "http://localhost:3000"으로 바꾸면 된다(에뮬레이터는 10.0.2.2:3000).
 */
export const API_BASE_URL = "https://noticetogether-web-api-notice-together.vercel.app";

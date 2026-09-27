/**
 * Vercel에 배포된 apps/web-api 프로덕션 주소(고정 도메인, 배포마다 안 바뀜).
 * 로컬 백엔드로 테스트하려면 `adb reverse tcp:3000 tcp:3000` 후
 * "http://localhost:3000"으로 바꾸면 된다(에뮬레이터는 10.0.2.2:3000).
 */
export const API_BASE_URL = "https://noticetogether-web-api-notice-together.vercel.app";

/**
 * Google 로그인용 OAuth 2.0 "웹 애플리케이션" 클라이언트 ID(Supabase가 idToken을
 * 검증할 때 대조하는 값). Google Cloud Console에서 발급 완료(패키지명 com.noticetogether.app +
 * 디버그 키스토어 SHA-1 등록), Supabase 대시보드에도 같은 웹 클라이언트 ID/시크릿 등록 완료.
 */
export const GOOGLE_WEB_CLIENT_ID = "803024437252-jqfspduvjij3p4501fpteve8cj9luppu.apps.googleusercontent.com";

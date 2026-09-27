/**
 * 개발 중에는 `adb reverse tcp:3000 tcp:3000`으로 기기의 localhost:3000을
 * 개발 PC의 apps/web-api(Next.js, `npm run dev`) 로 연결해서 쓴다.
 * 에뮬레이터를 쓸 경우 10.0.2.2:3000으로 바꿔야 한다.
 */
export const API_BASE_URL = "http://localhost:3000";

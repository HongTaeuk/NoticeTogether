import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

/**
 * 마감 임박 알림을 탭했을 때 해당 알림(notice) 화면으로 바로 이동하기 위한 브릿지.
 * 콜드 스타트(앱이 안 떠 있던 상태)는 `getInitialNoticeId()`로, 웜 스타트(앱이 이미
 * 떠 있던 상태)는 "NoticeDeepLink" 네이티브 이벤트로 구분해서 받는다
 * (android/.../MainActivity.kt 참고).
 */
type DeepLinkNative = {
  getInitialNoticeId: () => Promise<string | null>;
};

const NativeDeepLink = NativeModules.DeepLink as DeepLinkNative | undefined;

export async function getInitialNoticeId(): Promise<string | null> {
  if (Platform.OS !== "android" || !NativeDeepLink) return null;
  try {
    return await NativeDeepLink.getInitialNoticeId();
  } catch {
    return null;
  }
}

export function subscribeNoticeDeepLink(onNoticeId: (noticeId: string) => void): () => void {
  if (Platform.OS !== "android") {
    return () => {};
  }
  const subscription = DeviceEventEmitter.addListener("NoticeDeepLink", onNoticeId);
  return () => subscription.remove();
}

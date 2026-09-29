import { Linking, PermissionsAndroid, Platform } from "react-native";
import { areNotificationsEnabled } from "../native/alarmScheduler";

export type NotificationRequestResult = "granted" | "denied" | "blocked";

// Android 13(API 33)부터 알림 표시는 런타임 권한이 필요하다. 요청하지 않으면 알람이 울려도 알림이 안 뜬다.
const NEEDS_RUNTIME_PERMISSION = Platform.OS === "android" && Platform.Version >= 33;

export async function isNotificationEnabled(): Promise<boolean> {
  try {
    return await areNotificationsEnabled();
  } catch {
    return true;
  }
}

export async function requestNotificationPermission(): Promise<NotificationRequestResult> {
  if (NEEDS_RUNTIME_PERMISSION) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return "blocked";
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return "denied";
  }
  // 권한은 있어도 사용자가 시스템 설정에서 앱 알림을 꺼둔 경우 — 앱에서 다시 켤 방법이 없으니 설정으로 보낸다.
  return (await isNotificationEnabled()) ? "granted" : "blocked";
}

export function openAppSettings(): void {
  Linking.openSettings().catch(() => {});
}

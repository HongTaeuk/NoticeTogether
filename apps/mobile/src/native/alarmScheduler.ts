import { NativeModules, Platform } from "react-native";

/**
 * Kotlin 네이티브 모듈(android/app/.../modules/AlarmSchedulerModule.kt) 브릿지.
 * 서버(/api)는 "언제/무엇을" 알려줄지만 계산하고, 실제 알림 발화는 이 모듈을 통해
 * 기기에서 직접 예약한다(docs/05_tech_review.md 결정: on-device 발송).
 */
type AlarmSchedulerNative = {
  scheduleReminder: (
    notificationId: number,
    timestampMillis: number,
    title: string,
    body: string,
    noticeId: string,
  ) => Promise<void>;
  cancelReminder: (notificationId: number) => Promise<void>;
  canScheduleExactAlarms: () => Promise<boolean>;
};

const NativeAlarmScheduler = NativeModules.AlarmScheduler as AlarmSchedulerNative | undefined;

function ensureAndroid() {
  if (Platform.OS !== "android") {
    throw new Error("AlarmScheduler는 Android 전용입니다 (docs/05_tech_review.md: iOS 범위 밖).");
  }
  if (!NativeAlarmScheduler) {
    throw new Error(
      "AlarmScheduler 네이티브 모듈을 찾을 수 없습니다. 네이티브 빌드가 최신인지 확인하세요.",
    );
  }
}

/** 준비물/제출서류의 checklist_items.id를 안정적인 정수 알림 ID로 변환한다. */
export function toNotificationId(checklistItemId: string): number {
  let hash = 0;
  for (let i = 0; i < checklistItemId.length; i++) {
    hash = (hash * 31 + checklistItemId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export async function scheduleReminder(
  checklistItemId: string,
  when: Date,
  title: string,
  body: string,
  noticeId: string,
): Promise<void> {
  ensureAndroid();
  await NativeAlarmScheduler!.scheduleReminder(
    toNotificationId(checklistItemId),
    when.getTime(),
    title,
    body,
    noticeId,
  );
}

export async function cancelReminder(checklistItemId: string): Promise<void> {
  ensureAndroid();
  await NativeAlarmScheduler!.cancelReminder(toNotificationId(checklistItemId));
}

export async function canScheduleExactAlarms(): Promise<boolean> {
  ensureAndroid();
  return NativeAlarmScheduler!.canScheduleExactAlarms();
}

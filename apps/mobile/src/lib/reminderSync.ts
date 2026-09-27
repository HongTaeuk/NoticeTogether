import { authFetch } from "./apiClient";
import { cancelReminder, scheduleReminder } from "../native/alarmScheduler";

export type ReminderItem = {
  id: string;
  notice_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
};

/**
 * PRD 7~8단계: 기한 임박 알림의 발송 시각(기본 21시, 개인화되면 그 사람이 실제로
 * 앱을 여는 시각대)을 가져온다. 실패하면 기본값으로 조용히 넘어간다.
 */
export async function getPersonalizedHour(): Promise<number> {
  try {
    const res = await authFetch("/api/reminder-time");
    const data = await res.json();
    if (typeof data?.hour === "number") return data.hour;
  } catch {
    // 조회 실패 시 기본값(21시) 사용.
  }
  return 21;
}

export async function scheduleReminderForItem(item: ReminderItem, hour: number): Promise<void> {
  if (!item.due_date || item.is_done) return;
  const due = new Date(`${item.due_date}T${String(hour).padStart(2, "0")}:00:00`);
  due.setDate(due.getDate() - 1); // 기한 전날
  if (due.getTime() <= Date.now()) return;
  try {
    await scheduleReminder(
      item.id,
      due,
      "마감이 다가와요",
      `${item.title} — 내일(${item.due_date})까지예요.`,
      item.notice_id,
    );
  } catch (err) {
    // 기기가 없거나(개발 중) 권한이 없는 경우 등 — 조용히 무시하고 계속 진행.
    console.warn("알림 예약 실패:", err);
  }
}

export async function cancelReminderForItem(itemId: string): Promise<void> {
  try {
    await cancelReminder(itemId);
  } catch (err) {
    console.warn("알림 취소 실패:", err);
  }
}

/**
 * 앱을 열 때마다 서버의 현재 상태(완료 여부·기한)를 기준으로 알림을 다시 맞춘다.
 *
 * 이게 없으면 세 가지가 깨진다: (1) 항목을 만든 기기에서만 알림이 예약돼 배우자
 * 기기에는 아예 안 감, (2) 기기를 재부팅하면 AlarmManager에 예약된 알림이 전부
 * 사라짐, (3) 다른 기기에서 체크/기한 수정을 해도 이 기기에 예약된 알림은 그대로
 * 남음. "앱을 열 때마다 서버 기준으로 다시 맞춘다"는 한 가지 규칙으로 세 가지를
 * 동시에 해결한다 — 대신 기기 재부팅 자체를 감지해 즉시 복구하지는 않고, 사용자가
 * 다음에 앱을 열 때 복구된다(이 앱은 "저녁에 몰아본다"는 사용 패턴을 전제로
 * 설계됐으므로 실용적인 절충으로 판단함 — `docs/process.md` 참고).
 */
export async function resyncAllReminders(items: ReminderItem[]): Promise<void> {
  const hour = await getPersonalizedHour();
  for (const item of items) {
    if (item.is_done) {
      await cancelReminderForItem(item.id);
    } else {
      await scheduleReminderForItem(item, hour);
    }
  }
}

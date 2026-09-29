import { authFetch } from "./apiClient";
import { cancelReminder, scheduleReminder } from "../native/alarmScheduler";
import { formatKoreanDate, parseYmd } from "./dateFormat";
import { getReminderPref, type ReminderPref } from "./reminderPrefs";

export type ReminderItem = {
  id: string;
  notice_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
};

export type ReminderSchedule = {
  hour: number;
  /** 기한 며칠 전부터 반복 알림을 보낼지 — FR-4(빈도 개인화)의 핵심. */
  daysBeforeDue: number[];
};

const DEFAULT_SCHEDULE: ReminderSchedule = { hour: 21, daysBeforeDue: [1] };

// cancelReminderForItem이 항상 이 전체 집합을 취소 시도한다 — 이전에 어떤 빈도로
// 예약됐었는지(1회였는지 3회였는지) 몰라도 되게 하기 위한 상한선.
const MAX_POSSIBLE_DAYS_BEFORE = [1, 2, 3];

const CUSTOM_SLOT = "custom";

function reminderKey(itemId: string, slot: number | string): string {
  return `${itemId}#${slot}`;
}

export type PlannedReminder = { at: Date; slot: number | string; daysBefore: number | null };

/** 이 항목의 알림을 언제 울릴지(이미 지난 시각 제외). 예약과 화면 표시가 같은 계산을 쓴다. */
export function computeReminderTimes(
  item: Pick<ReminderItem, "due_date" | "is_done">,
  schedule: ReminderSchedule,
  pref: ReminderPref,
): PlannedReminder[] {
  if (item.is_done || pref.mode === "off") return [];
  const now = Date.now();
  if (pref.mode === "custom") {
    const at = new Date(pref.at);
    return at.getTime() > now ? [{ at, slot: CUSTOM_SLOT, daysBefore: null }] : [];
  }
  if (!item.due_date) return [];
  return schedule.daysBeforeDue
    .map((daysBefore) => {
      const at = parseYmd(item.due_date!);
      at.setDate(at.getDate() - daysBefore);
      at.setHours(schedule.hour, 0, 0, 0);
      return { at, slot: daysBefore, daysBefore };
    })
    .filter((r) => r.at.getTime() > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * PRD 7~8단계/FR-4: 기한 임박 알림의 발송 시각 + 빈도(며칠 전부터 반복할지)를
 * 그 사람의 실제 앱 확인 패턴에 맞춰 가져온다. 실패하면 기본값으로 조용히 넘어간다.
 */
export async function getPersonalizedSchedule(): Promise<ReminderSchedule> {
  try {
    const res = await authFetch("/api/reminder-time");
    const data = await res.json();
    const hour = typeof data?.hour === "number" ? data.hour : DEFAULT_SCHEDULE.hour;
    const daysBeforeDue = Array.isArray(data?.daysBeforeDue) && data.daysBeforeDue.length > 0
      ? (data.daysBeforeDue as number[])
      : DEFAULT_SCHEDULE.daysBeforeDue;
    return { hour, daysBeforeDue };
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

/** 이전 버전과의 호출부 호환을 위해 시각만 필요한 곳에서 쓴다. */
export async function getPersonalizedHour(): Promise<number> {
  return (await getPersonalizedSchedule()).hour;
}

function reminderBody(item: ReminderItem, daysBefore: number | null): string {
  if (!item.due_date) return `${item.title} — 챙길 시간이에요.`;
  const due = formatKoreanDate(item.due_date);
  if (daysBefore === null) return `${item.title} — ${due}까지예요.`;
  const label = daysBefore === 1 ? "내일" : `${daysBefore}일 후`;
  return `${item.title} — ${label}(${due})까지예요.`;
}

export async function scheduleReminderForItem(
  item: ReminderItem,
  schedule: ReminderSchedule,
): Promise<void> {
  const pref = await getReminderPref(item.id);
  for (const r of computeReminderTimes(item, schedule, pref)) {
    try {
      await scheduleReminder(
        reminderKey(item.id, r.slot),
        r.at,
        "마감이 다가와요",
        reminderBody(item, r.daysBefore),
        item.notice_id,
      );
    } catch (err) {
      // 기기가 없거나(개발 중) 권한이 없는 경우 등 — 조용히 무시하고 계속 진행.
      console.warn("알림 예약 실패:", err);
    }
  }
}

export async function cancelReminderForItem(itemId: string): Promise<void> {
  for (const slot of [...MAX_POSSIBLE_DAYS_BEFORE, CUSTOM_SLOT]) {
    try {
      await cancelReminder(reminderKey(itemId, slot));
    } catch (err) {
      console.warn("알림 취소 실패:", err);
    }
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
  const schedule = await getPersonalizedSchedule();
  for (const item of items) {
    if (item.is_done) {
      await cancelReminderForItem(item.id);
    } else {
      await cancelReminderForItem(item.id);
      await scheduleReminderForItem(item, schedule);
    }
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 항목별 "나한테 언제 알려줄지" 선택. 서버가 아니라 이 기기에만 저장한다 — 기한(due_date)은 가족이 공유하는
 * 사실이지만, 알림 시점은 FR-4대로 보호자 개인마다 다른 것이 맞아서 배우자 기기에 영향을 주면 안 된다.
 * 앱을 다시 설치하면 사라지고 자동(기본값)으로 돌아간다.
 */
export type ReminderPref = { mode: "auto" } | { mode: "custom"; at: string } | { mode: "off" };

const KEY = "noticetogether:reminderPrefs";
const AUTO: ReminderPref = { mode: "auto" };

export async function getAllReminderPrefs(): Promise<Record<string, ReminderPref>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReminderPref>) : {};
  } catch {
    return {};
  }
}

export async function getReminderPref(itemId: string): Promise<ReminderPref> {
  return (await getAllReminderPrefs())[itemId] ?? AUTO;
}

export async function setReminderPref(itemId: string, pref: ReminderPref): Promise<void> {
  const all = await getAllReminderPrefs();
  if (pref.mode === "auto") {
    delete all[itemId];
  } else {
    all[itemId] = pref;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

import AsyncStorage from "@react-native-async-storage/async-storage";

export type Role = "primary" | "secondary" | "child";

export type Session = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: Role;
  displayName: string | null;
  householdId: string;
  inviteCode: string;
  isAnonymous?: boolean;
  /** 아이 계정일 때, 양육자가 등록해 둔 자녀 정보와의 연결(그 아이 알림만 골라 보여줄 때 쓴다). */
  childId?: string | null;
};

const STORAGE_KEY = "noticetogether:session";

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

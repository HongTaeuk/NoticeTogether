import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authFetch } from "../lib/apiClient";
import { josa } from "../lib/josa";
import type { Session } from "../lib/authStorage";
import { COLORS, FONT_DISPLAY } from "../theme";
import {
  isNotificationEnabled,
  openAppSettings,
  requestNotificationPermission,
} from "../lib/notificationPermission";
import { memberName, ROLE_LABEL, type Role } from "../types/notice";
import ChildConsentSection from "./ChildConsentSection";

type ReminderInfo = {
  hour: number;
  daysBeforeDue: number[];
  personalized: boolean;
  sampleSize: number;
};

function formatHour(hour: number): string {
  if (hour === 0) return "밤 12시";
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return "낮 12시";
  return `오후 ${hour - 12}시`;
}

function formatDays(daysBeforeDue: number[]): string {
  const earliest = Math.max(...daysBeforeDue);
  return daysBeforeDue.length > 1 ? `마감 ${earliest}일 전부터 매일` : `마감 ${earliest}일 전`;
}

/**
 * PRD 4-5: "프로필 / 언제 알려줄지 / 계정 관리"는 최상위 흐름과 분리된 하단 영역에 둔다.
 * 라벨은 PRD 4-3 원칙대로 "알림 설정"이 아니라 "언제 알려줄지"를 쓴다.
 */
export default function SettingsScreen({
  session,
  accountLabel,
  onAccountPress,
  onManageHousehold,
  onChildAdded,
}: {
  session: Session;
  accountLabel: string;
  onAccountPress: () => void;
  onManageHousehold: () => void;
  onChildAdded: () => void;
}) {
  const [reminder, setReminder] = useState<ReminderInfo | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [members, setMembers] = useState<{ id: string; role: string; display_name: string | null }[]>([]);
  const [nameDraft, setNameDraft] = useState(session.displayName ?? "");
  const [nameSaved, setNameSaved] = useState(false);

  const loadMembers = useCallback(() => {
    authFetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setMembers(data.members ?? []);
        if (data.user?.displayName) setNameDraft(data.user.displayName);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function saveMyName() {
    const res = await authFetch("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ displayName: nameDraft }),
    }).catch(() => null);
    if (res?.ok) {
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
      loadMembers();
    }
  }

  const refreshNotificationStatus = useCallback(() => {
    isNotificationEnabled().then(setNotificationsOn);
  }, []);

  // 시스템 설정에서 알림을 켜고 돌아왔을 때 경고가 바로 사라지게 한다.
  useEffect(() => {
    refreshNotificationStatus();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshNotificationStatus();
    });
    return () => sub.remove();
  }, [refreshNotificationStatus]);

  async function turnOnNotifications() {
    const result = await requestNotificationPermission();
    if (result === "blocked") {
      openAppSettings();
      return;
    }
    setNotificationsOn(result === "granted");
  }

  useEffect(() => {
    authFetch("/api/reminder-time")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.hour === "number") setReminder(data as ReminderInfo);
      })
      .catch(() => {});
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "android" ? "height" : "padding"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>설정</Text>

        <Text style={styles.sectionTitle}>언제 알려줄지</Text>
        {!notificationsOn && (
          <View style={[styles.card, styles.warningCard]}>
            <Text style={styles.warningTitle}>휴대폰 알림이 꺼져 있어요</Text>
            <Text style={styles.warningBody}>
              이대로면 마감이 다가와도 알림이 오지 않아요. 알림을 켜주세요.
            </Text>
            <TouchableOpacity onPress={turnOnNotifications} style={styles.warningButton}>
              <Text style={styles.warningButtonText}>알림 켜기</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>마감 알림</Text>
            <Text style={styles.rowValue}>
              {reminder
                ? `${formatDays(reminder.daysBeforeDue)} · ${formatHour(reminder.hour)}`
                : "불러오는 중…"}
            </Text>
          </View>
        </View>
        {reminder && (
          <View style={[styles.card, styles.cardTinted]}>
            <Text style={styles.cardBody}>
              {reminder.personalized
                ? `앱을 주로 여는 시간과 횟수(최근 ${reminder.sampleSize}번 확인)에 맞춰 자동으로 조절했어요.`
                : "아직 확인 기록이 적어서 기본값으로 알려드려요. 앱을 몇 번 더 열어보면 평소 확인하는 시간에 맞춰 자동으로 바뀌어요."}
            </Text>
          </View>
        )}

        <ChildConsentSection onChildAdded={onChildAdded} />

        <Text style={styles.sectionTitle}>우리 가족</Text>
        <View style={styles.card}>
          {members.length === 0 ? (
            <Text style={styles.cardBody}>가족 정보를 불러오는 중이에요…</Text>
          ) : (
            members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Text style={styles.memberEmoji}>{m.role === "child" ? "🧒" : "🧑"}</Text>
                <Text style={styles.memberName}>
                  {memberName(m.role, m.display_name)}
                  {m.id === session.userId ? " (나)" : ""}
                </Text>
                <View style={[styles.roleChip, m.role === "child" && styles.roleChipChild]}>
                  <Text style={styles.roleChipText}>{ROLE_LABEL[m.role as Role] ?? "양육자"}</Text>
                </View>
              </View>
            ))
          )}
          {members.length === 1 && (
            <Text style={[styles.cardBody, styles.cardBodySpaced]}>
              아직 혼자예요. 다른 양육자(엄마·아빠·조부모 등)나 아이에게 초대 코드를 보내 보세요.
            </Text>
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>가족 안에서 불리는 내 호칭</Text>
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              placeholder="예: 엄마, 할머니"
              placeholderTextColor={COLORS.primarySoft}
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={20}
            />
            <TouchableOpacity
              style={[styles.nameSaveButton, !nameDraft.trim() && styles.nameSaveButtonDisabled]}
              onPress={saveMyName}
              disabled={!nameDraft.trim()}
            >
              <Text style={styles.nameSaveText}>{nameSaved ? "저장됨" : "저장"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.card} onPress={onManageHousehold}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>가족 초대 코드</Text>
            <Text style={styles.linkText}>보기 · 입력</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>{josa(ROLE_LABEL[session.role], "으로/로")} 사용 중</Text>
          {session.isAnonymous && (
            <Text style={[styles.cardBody, styles.cardBodySpaced]}>
              가입하지 않아도 초대 코드로 가족과 함께 쓸 수 있어요. 휴대폰을 바꿀 때를 대비해 계정을 만들어둘 수도 있어요.
            </Text>
          )}
          <TouchableOpacity onPress={onAccountPress} style={styles.accountButton}>
            <Text
              style={[
                styles.accountButtonText,
                !session.isAnonymous && styles.accountButtonTextLogout,
              ]}
            >
              {accountLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontFamily: FONT_DISPLAY,
    color: COLORS.ink,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONT_DISPLAY,
    color: COLORS.muted,
    marginTop: 22,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  memberEmoji: { fontSize: 22, marginRight: 10 },
  memberName: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.ink },
  roleChip: {
    backgroundColor: COLORS.tint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleChipChild: { backgroundColor: COLORS.sunSoft },
  roleChipText: { fontSize: 12, fontWeight: "700", color: COLORS.ink },
  nameEditRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  nameInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.ink,
    marginRight: 8,
  },
  nameSaveButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  nameSaveButtonDisabled: { backgroundColor: COLORS.primarySoft },
  nameSaveText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 15 },
  card: {
    borderWidth: 2,
    borderColor: "#CFE8D6",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  warningCard: {
    backgroundColor: "#FFF3E6",
    borderColor: "#FFF3E6",
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B85C00",
  },
  warningBody: {
    fontSize: 13,
    color: "#B85C00",
    lineHeight: 19,
    marginTop: 4,
  },
  warningButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#F58A1F",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  warningButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  cardTinted: {
    backgroundColor: "#F1FAF3",
    borderColor: "#F1FAF3",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3A2E1F",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#13854A",
  },
  cardBody: {
    fontSize: 13,
    color: "#7A5F33",
    lineHeight: 19,
  },
  cardBodySpaced: {
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#13854A",
  },
  accountButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  accountButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#13854A",
  },
  accountButtonTextLogout: {
    color: "#E8503A",
  },
});

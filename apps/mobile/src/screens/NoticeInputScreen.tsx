import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../config/api";
import type { ChecklistCategory, SummarizeResult } from "../types/notice";
import { scheduleReminder } from "../native/alarmScheduler";

const CATEGORY_COLOR: Record<ChecklistCategory, string> = {
  준비물: "#1B64F2", // blue
  제출서류: "#F2871B", // orange
  기한: "#F23B3B", // red
};

type Role = "primary" | "secondary";

type PersistedItem = {
  id: string;
  category: ChecklistCategory;
  title: string;
  detail: string | null;
  due_date: string | null;
  ai_confidence: number;
  is_edited_by_user: boolean;
  is_done: boolean;
};

type ItemAction = {
  id: string;
  checklist_item_id: string;
  user_id: string;
  action: "checked" | "unchecked" | "note";
  note: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<Role, string> = { primary: "보호자 1", secondary: "보호자 2" };

export default function NoticeInputScreen() {
  const [rawText, setRawText] = useState("");
  const [aiResult, setAiResult] = useState<SummarizeResult | null>(null);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [items, setItems] = useState<PersistedItem[]>([]);
  const [actions, setActions] = useState<ItemAction[]>([]);
  const [userRoleById, setUserRoleById] = useState<Record<string, Role>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // PRD 4단계: 실제 로그인 붙이기 전까지, 임시 계정 2개(보호자 1/2)를 전환해가며
  // 체크/동기화가 상대방 화면에도 반영되는지 검증하기 위한 역할 전환.
  const [role, setRole] = useState<Role>("primary");

  async function handleSummarize() {
    if (!rawText.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    setAiResult(null);
    setNoticeId(null);
    setItems([]);
    try {
      const summarizeRes = await fetch(`${API_BASE_URL}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const summarizeData = await summarizeRes.json();
      if (!summarizeRes.ok) {
        throw new Error(summarizeData?.error ?? "요약에 실패했습니다.");
      }
      const summary = summarizeData as SummarizeResult;
      setAiResult(summary);
      setShowOriginal(false);

      const noticeRes = await fetch(`${API_BASE_URL}/api/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          summary: summary.summary,
          items: summary.items,
          createdBy: role,
        }),
      });
      const noticeData = await noticeRes.json();
      if (!noticeRes.ok) {
        throw new Error(noticeData?.error ?? "체크리스트 저장에 실패했습니다.");
      }
      setNoticeId(noticeData.noticeId as string);
      setItems(noticeData.items as PersistedItem[]);
      await loadNoticeDetail(noticeData.noticeId as string);
      await scheduleReminders(noticeData.items as PersistedItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * PRD 7단계: 기한이 있는 항목은 전날 밤 21시에 "마감 임박" 알림을 예약한다.
   * 이미 지난 시각이면(오늘/과거 기한) 건너뛴다. Android 전용 네이티브 모듈이라
   * 실기기가 아닌 환경(개발 중 기기 미연결 등)에서는 실패해도 화면 흐름은 막지 않는다.
   */
  async function scheduleReminders(newItems: PersistedItem[]) {
    for (const item of newItems) {
      if (!item.due_date) continue;
      const due = new Date(`${item.due_date}T21:00:00`);
      due.setDate(due.getDate() - 1); // 기한 전날 21시
      if (due.getTime() <= Date.now()) continue;
      try {
        await scheduleReminder(
          item.id,
          due,
          "마감이 다가와요",
          `${item.title} — 내일(${item.due_date})까지예요.`,
        );
      } catch (err) {
        // 기기가 없거나(개발 중) 권한이 없는 경우 등 — 조용히 무시하고 계속 진행.
        console.warn("알림 예약 실패:", err);
      }
    }
  }

  async function toggleItem(item: PersistedItem) {
    const nextDone = !item.is_done;
    // 낙관적 업데이트: 서버 응답을 기다리지 않고 먼저 화면에 반영한다.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: nextDone } : i)));
    try {
      const res = await fetch(`${API_BASE_URL}/api/checklist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: nextDone, as: role }),
      });
      if (!res.ok) {
        throw new Error("체크 상태 저장에 실패했습니다.");
      }
    } catch (err) {
      // 실패하면 원상복구
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: item.is_done } : i)));
      setError(err instanceof Error ? err.message : "체크 상태 저장에 실패했습니다.");
    }
  }

  async function loadNoticeDetail(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/notices/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error ?? "동기화에 실패했습니다.");
    }
    setItems(data.items as PersistedItem[]);
    setActions(data.actions as ItemAction[]);
    const roleMap: Record<string, Role> = {};
    for (const u of data.users as { id: string; role: Role }[]) {
      roleMap[u.id] = u.role;
    }
    setUserRoleById(roleMap);
  }

  async function refreshFromServer() {
    if (!noticeId) return;
    setLoading(true);
    setError(null);
    try {
      await loadNoticeDetail(noticeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "동기화에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function sendNote(item: PersistedItem) {
    const note = (noteDrafts[item.id] ?? "").trim();
    if (!note) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/checklist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, as: role }),
      });
      if (!res.ok) {
        throw new Error("한마디 남기기에 실패했습니다.");
      }
      setNoteDrafts((prev) => ({ ...prev, [item.id]: "" }));
      await refreshFromServer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "한마디 남기기에 실패했습니다.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.roleSwitchRow}>
        <Text style={styles.roleLabel}>지금 보고 있는 사람</Text>
        <View style={styles.roleButtons}>
          {(["primary", "secondary"] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleButton, role === r && styles.roleButtonActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                {r === "primary" ? "보호자 1" : "보호자 2"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.title}>알림 붙여넣기</Text>
      {__DEV__ && (
        <TouchableOpacity
          onPress={() =>
            setRawText(
              "안녕하세요, 3학년 2반입니다. 다음주 화요일(10월 7일)까지 현장학습 동의서를 제출해주세요. 그리고 목요일 체육대회에는 체육복과 물통을 꼭 챙겨 보내주시기 바랍니다.",
            )
          }
          style={styles.devFillButton}
        >
          <Text style={styles.devFillButtonText}>[개발용] 테스트 문장 채우기</Text>
        </TouchableOpacity>
      )}
      <TextInput
        style={styles.input}
        placeholder="학교/복지관 알림 원문을 여기에 붙여넣으세요"
        placeholderTextColor="#7FA8F5"
        multiline
        value={rawText}
        onChangeText={setRawText}
      />

      <TouchableOpacity
        style={[styles.button, (!rawText.trim() || loading) && styles.buttonDisabled]}
        onPress={handleSummarize}
        disabled={!rawText.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>핵심만 정리하기</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {aiResult && (
        <View style={styles.resultBox}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {showOriginal ? "학교에서 온 그대로" : "핵심만 정리하면"}
            </Text>
            <TouchableOpacity onPress={() => setShowOriginal((v) => !v)}>
              <Text style={styles.toggleText}>
                {showOriginal ? "요약 보기" : "원문 보기"}
              </Text>
            </TouchableOpacity>
          </View>

          {showOriginal ? (
            <Text style={styles.originalText}>{rawText}</Text>
          ) : (
            <>
              <Text style={styles.summaryText}>{aiResult.summary}</Text>
              {items.map((item) => {
                const itemActions = actions.filter((a) => a.checklist_item_id === item.id);
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <TouchableOpacity
                      style={styles.itemRow}
                      onPress={() => toggleItem(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, item.is_done && styles.checkboxChecked]}>
                        {item.is_done && <Text style={styles.checkboxMark}>✓</Text>}
                      </View>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: CATEGORY_COLOR[item.category] },
                        ]}
                      >
                        <Text style={styles.categoryBadgeText}>{item.category}</Text>
                      </View>
                      <View style={styles.itemTextBox}>
                        <Text style={[styles.itemTitle, item.is_done && styles.itemTitleDone]}>
                          {item.title}
                        </Text>
                        {item.detail && <Text style={styles.itemDetail}>{item.detail}</Text>}
                        {item.due_date && <Text style={styles.itemDue}>기한: {item.due_date}</Text>}
                      </View>
                    </TouchableOpacity>

                    {itemActions
                      .filter((a) => a.note)
                      .map((a) => (
                        <Text key={a.id} style={styles.noteText}>
                          💬 {ROLE_LABEL[userRoleById[a.user_id] ?? "primary"]}: {a.note}
                        </Text>
                      ))}

                    <View style={styles.noteInputRow}>
                      <TextInput
                        style={styles.noteInput}
                        placeholder="한마디 남기기 (예: 다 챙겼어요)"
                        placeholderTextColor="#9DBEF7"
                        value={noteDrafts[item.id] ?? ""}
                        onChangeText={(text) =>
                          setNoteDrafts((prev) => ({ ...prev, [item.id]: text }))
                        }
                        onSubmitEditing={() => sendNote(item)}
                      />
                      <TouchableOpacity onPress={() => sendNote(item)}>
                        <Text style={styles.noteSendText}>남기기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity onPress={refreshFromServer} style={styles.refreshButton}>
                <Text style={styles.refreshButtonText}>
                  같이 확인하기 (상대방이 체크한 내용 새로고침)
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
  },
  roleSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 12,
    color: "#3D5A9C",
  },
  roleButtons: {
    flexDirection: "row",
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1B64F2",
    marginLeft: 8,
  },
  roleButtonActive: {
    backgroundColor: "#1B64F2",
  },
  roleButtonText: {
    fontSize: 12,
    color: "#1B64F2",
    fontWeight: "600",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B1F4D",
    marginBottom: 12,
  },
  devFillButton: {
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  devFillButtonText: {
    fontSize: 11,
    color: "#F2871B",
    fontWeight: "600",
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0B1F4D",
    textAlignVertical: "top",
    backgroundColor: "#F3F8FF",
  },
  button: {
    marginTop: 14,
    backgroundColor: "#1B64F2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#9DBEF7",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 12,
    color: "#F23B3B",
    fontSize: 14,
  },
  resultBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    padding: 16,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B1F4D",
  },
  toggleText: {
    color: "#1B64F2",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryText: {
    fontSize: 15,
    color: "#0B1F4D",
    marginBottom: 14,
    lineHeight: 22,
  },
  originalText: {
    fontSize: 14,
    color: "#0B1F4D",
    lineHeight: 21,
  },
  itemCard: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteText: {
    fontSize: 12,
    color: "#3D5A9C",
    marginTop: 4,
    marginLeft: 32,
  },
  noteInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 32,
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: "#0B1F4D",
  },
  noteSendText: {
    color: "#1B64F2",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#1B64F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#1B64F2",
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginRight: 10,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  itemTextBox: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0B1F4D",
  },
  itemTitleDone: {
    textDecorationLine: "line-through",
    color: "#7FA8F5",
  },
  itemDetail: {
    fontSize: 13,
    color: "#3D5A9C",
    marginTop: 2,
  },
  itemDue: {
    fontSize: 13,
    color: "#F23B3B",
    marginTop: 2,
  },
  refreshButton: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  refreshButtonText: {
    color: "#1B64F2",
    fontSize: 13,
    fontWeight: "600",
  },
});

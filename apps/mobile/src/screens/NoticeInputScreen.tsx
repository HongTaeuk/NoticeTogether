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
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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

  async function refreshFromServer() {
    if (!noticeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notices/${noticeId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "동기화에 실패했습니다.");
      }
      setItems(data.items as PersistedItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "동기화에 실패했습니다.");
    } finally {
      setLoading(false);
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
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
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
              ))}

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
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
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

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedCheckMark from "../components/AnimatedCheckMark";
import { authFetch } from "../lib/apiClient";
import type { Session } from "../lib/authStorage";
import {
  CATEGORY_COLOR,
  ROLE_LABEL,
  type ItemAction,
  type PersistedItem,
  type Role,
  type SummarizeResult,
} from "../types/notice";
import { scheduleReminder } from "../native/alarmScheduler";
import ChildConsentSection from "./ChildConsentSection";
import NoticeListScreen from "./NoticeListScreen";
import TodayScreen from "./TodayScreen";

export default function NoticeInputScreen({
  session,
  onLogout,
  onManageHousehold,
  onManageAccount,
}: {
  session: Session;
  onLogout: () => void;
  onManageHousehold: () => void;
  onManageAccount: () => void;
}) {
  const [tab, setTab] = useState<"today" | "compose" | "history" | "unread">("today");
  const [rawText, setRawText] = useState("");
  const [notice, setNotice] = useState<{ raw_text: string; ai_summary: string | null } | null>(null);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [items, setItems] = useState<PersistedItem[]>([]);
  const [actions, setActions] = useState<ItemAction[]>([]);
  const [userRoleById, setUserRoleById] = useState<Record<string, Role>>({});
  const [partnerNotViewed, setPartnerNotViewed] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteSaveStatus, setNoteSaveStatus] = useState<Record<string, "saving" | "saved">>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", detail: "", dueDate: "" });
  const [showOriginal, setShowOriginal] = useState(false);
  const [showSummaryText, setShowSummaryText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summarizeFailCount, setSummarizeFailCount] = useState(0);
  const role = session.role;

  const DRAFT_KEY = "noticetogether:draftRawText";

  // PRD 5-5: 네트워크가 끊기거나 앱이 종료돼도 입력하던 원문이 사라지면 안 된다.
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((saved) => {
      if (saved) setRawText(saved);
    });
  }, []);

  function updateRawText(text: string) {
    setRawText(text);
    AsyncStorage.setItem(DRAFT_KEY, text).catch(() => {});
  }

  function clearDraft() {
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }

  function resetToCompose() {
    setNoticeId(null);
    setNotice(null);
    setItems([]);
    setActions([]);
    setPartnerNotViewed(null);
    setRawText("");
    clearDraft();
    setShowOriginal(false);
    setShowSummaryText(false);
    setError(null);
    setSummarizeFailCount(0);
    setTab("compose");
  }

  async function openExistingNotice(id: string) {
    setTab("compose");
    setLoading(true);
    setError(null);
    setShowOriginal(false);
    setShowSummaryText(false);
    try {
      setNoticeId(id);
      await loadNoticeDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "동기화에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    if (!rawText.trim()) {
      return;
    }
    // PRD 5-1 분기1: AI 호출 전에 미리 걸러서 40 RPM 제한을 의미 없는 요청으로 소모하지 않는다.
    if (rawText.trim().length < 20) {
      setError("내용이 조금 짧은 것 같아요. 학교에서 온 안내문 전체를 붙여넣어 주세요");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    setNoticeId(null);
    setItems([]);
    try {
      const summarizeRes = await authFetch("/api/summarize", {
        method: "POST",
        body: JSON.stringify({ rawText }),
      });
      const summarizeData = await summarizeRes.json();
      if (!summarizeRes.ok) {
        setSummarizeFailCount((c) => c + 1);
        // PRD 5-1 분기2: 기술적 에러 문구를 그대로 보여주지 않고 정해둔 안내 문구를 쓴다.
        throw new Error("지금 조금 바빠서 정리가 늦어지고 있어요. 잠시 후 다시 시도해 주세요");
      }
      const summary = summarizeData as SummarizeResult;
      setSummarizeFailCount(0);
      setShowOriginal(false);

      const noticeRes = await authFetch("/api/notices", {
        method: "POST",
        body: JSON.stringify({
          rawText,
          summary: summary.summary,
          items: summary.items,
        }),
      });
      const noticeData = await noticeRes.json();
      if (!noticeRes.ok) {
        throw new Error(noticeData?.error ?? "체크리스트 저장에 실패했습니다.");
      }
      setNoticeId(noticeData.noticeId as string);
      setItems(noticeData.items as PersistedItem[]);
      clearDraft();
      await loadNoticeDetail(noticeData.noticeId as string);
      await scheduleReminders(noticeData.items as PersistedItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * PRD 5-6: "에러(3회 초과, 원문만 저장 제안)" 상태. AI 요약이 계속 실패해도
   * 사용자가 원문 자체를 못 챙기고 화면에 막혀 있으면 안 되므로, 체크리스트 없이
   * 원문만이라도 저장해서 다음에 이어갈 수 있게 한다.
   */
  async function saveRawTextOnly() {
    setLoading(true);
    setError(null);
    try {
      const noticeRes = await authFetch("/api/notices", {
        method: "POST",
        body: JSON.stringify({ rawText, summary: null, items: [] }),
      });
      const noticeData = await noticeRes.json();
      if (!noticeRes.ok) {
        throw new Error(noticeData?.error ?? "저장에 실패했습니다.");
      }
      setSummarizeFailCount(0);
      setNoticeId(noticeData.noticeId as string);
      setItems(noticeData.items as PersistedItem[]);
      clearDraft();
      await loadNoticeDetail(noticeData.noticeId as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * PRD 7~8단계: 기한이 있는 항목은 전날 밤에 "마감 임박" 알림을 예약한다.
   * 시각은 기본 21시이되, PRD 8단계(알림 타이밍 개인화)에 따라 그 보호자가
   * 실제로 앱을 열어본 시각 이력이 충분히 쌓였으면(`/api/reminder-time`) 그 시각으로 대체한다.
   * 이미 지난 시각이면(오늘/과거 기한) 건너뛴다. Android 전용 네이티브 모듈이라
   * 실기기가 아닌 환경(개발 중 기기 미연결 등)에서는 실패해도 화면 흐름은 막지 않는다.
   */
  async function scheduleReminders(newItems: PersistedItem[]) {
    let hour = 21;
    try {
      const res = await authFetch("/api/reminder-time");
      const data = await res.json();
      if (typeof data?.hour === "number") hour = data.hour;
    } catch {
      // 개인화 시각 조회 실패 시 기본값(21시) 사용.
    }

    for (const item of newItems) {
      if (!item.due_date) continue;
      const due = new Date(`${item.due_date}T${String(hour).padStart(2, "0")}:00:00`);
      due.setDate(due.getDate() - 1); // 기한 전날
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
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDone: nextDone }),
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
    const res = await authFetch(`/api/notices/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error ?? "동기화에 실패했습니다.");
    }
    setNotice(data.notice as { raw_text: string; ai_summary: string | null });
    setItems(data.items as PersistedItem[]);
    setActions(data.actions as ItemAction[]);
    const roleMap: Record<string, Role> = {};
    for (const u of data.users as { id: string; role: Role }[]) {
      roleMap[u.id] = u.role;
    }
    setUserRoleById(roleMap);

    // PRD 5-2 분기7: 배우자는 있지만 아직 이 알림을 한 번도 안 열어봤을 때를 구분해서 보여준다.
    const householdMembers = (data.householdMembers ?? []) as {
      id: string;
      role: Role;
      display_name: string | null;
    }[];
    const viewedUserIds = new Set((data.viewedUserIds ?? []) as string[]);
    const partner = householdMembers.find((m) => m.id !== session.userId);
    setPartnerNotViewed(
      partner && !viewedUserIds.has(partner.id) ? partner.display_name ?? ROLE_LABEL[partner.role] : null,
    );

    // PRD 5단계: 배너 미리보기가 아니라 실제로 화면에 펼쳐본 이 시점에만 열람을 기록한다.
    // (다른 보호자가 먼저 열었다면 서버가 자동으로 partner_view_confirmed로 기록한다.)
    try {
      await authFetch(`/api/notices/${id}/open`, {
        method: "POST",
      });
    } catch {
      // 열람 이벤트 기록 실패는 화면 표시 자체를 막을 이유가 없으므로 조용히 넘어간다.
    }
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
    // PRD 5-2 정상 경로: "저장중 → 저장됨(남겼어요)" 짧은 확인 표시.
    setNoteSaveStatus((prev) => ({ ...prev, [item.id]: "saving" }));
    try {
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        throw new Error("한마디 남기기에 실패했습니다.");
      }
      setNoteDrafts((prev) => ({ ...prev, [item.id]: "" }));
      setNoteSaveStatus((prev) => ({ ...prev, [item.id]: "saved" }));
      setTimeout(() => {
        setNoteSaveStatus((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }, 1500);
      await refreshFromServer();
    } catch (err) {
      setNoteSaveStatus((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setError(err instanceof Error ? err.message : "한마디 남기기에 실패했습니다.");
    }
  }

  /**
   * FR-1: 사용자가 원문과 실제로 대조했는지 서버가 알 수 있어야 한다(source_compared).
   * 요약 <-> 원문을 왔다갔다 할 때마다가 아니라, "원문을 보러 간" 시점에만 기록한다.
   */
  function toggleShowOriginal() {
    setShowOriginal((prev) => {
      const next = !prev;
      if (next && noticeId) {
        authFetch(`/api/notices/${noticeId}/source-compared`, {
          method: "POST",
        }).catch(() => {});
      }
      return next;
    });
  }

  function startEdit(item: PersistedItem) {
    setEditingItemId(item.id);
    setEditDraft({
      title: item.title,
      detail: item.detail ?? "",
      dueDate: item.due_date ?? "",
    });
  }

  /**
   * FR-1: AI가 잘못 추출한 항목(제목/상세/기한)을 사용자가 직접 고칠 수 있어야 한다.
   * 원문 대조 없이 AI 결과를 그대로 믿고 넘어가는 위험을 줄이기 위한 장치.
   */
  async function saveEdit(item: PersistedItem) {
    if (!editDraft.title.trim()) return;
    try {
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editDraft.title,
          detail: editDraft.detail.trim() || null,
          dueDate: editDraft.dueDate.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "수정에 실패했습니다.");
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...data.item } : i)));
      setEditingItemId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정에 실패했습니다.");
    }
  }

  if (tab === "today") {
    return (
      <TodayScreen
        onOpenNotice={openExistingNotice}
        onComposeNew={resetToCompose}
        onViewHistory={() => setTab("history")}
        onViewUnread={() => setTab("unread")}
        onLogout={onLogout}
        onManageHousehold={onManageHousehold}
      />
    );
  }

  if (tab === "unread") {
    return (
      <NoticeListScreen
        mode="unread"
        onSelectNotice={openExistingNotice}
        onComposeNew={resetToCompose}
        onLogout={onLogout}
        onManageHousehold={onManageHousehold}
        onViewToday={() => setTab("today")}
      />
    );
  }

  if (tab === "history") {
    return (
      <NoticeListScreen
        mode="all"
        onSelectNotice={openExistingNotice}
        onComposeNew={resetToCompose}
        onLogout={onLogout}
        onManageHousehold={onManageHousehold}
        onViewToday={() => setTab("today")}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.roleSwitchRow}>
        <Text style={styles.roleLabel}>{ROLE_LABEL[role]}(으)로 로그인됨</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <Text style={styles.title}>{noticeId ? "이거 뭐야?" : "알림 붙여넣기"}</Text>
        <View style={styles.tabLinkGroup}>
          <TouchableOpacity onPress={() => setTab("today")}>
            <Text style={styles.historyLinkText}>오늘 할 일</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("history")}>
            <Text style={styles.historyLinkText}>지난 기록</Text>
          </TouchableOpacity>
        </View>
      </View>

      {noticeId && (
        <TouchableOpacity onPress={resetToCompose} style={styles.newComposeButton}>
          <Text style={styles.newComposeButtonText}>+ 새 알림 작성하기</Text>
        </TouchableOpacity>
      )}

      {!noticeId && __DEV__ && (
        <TouchableOpacity
          onPress={() =>
            updateRawText(
              "안녕하세요, 3학년 2반입니다. 다음주 화요일(10월 7일)까지 현장학습 동의서를 제출해주세요. 그리고 목요일 체육대회에는 체육복과 물통을 꼭 챙겨 보내주시기 바랍니다.",
            )
          }
          style={styles.devFillButton}
        >
          <Text style={styles.devFillButtonText}>[개발용] 테스트 문장 채우기</Text>
        </TouchableOpacity>
      )}
      {!noticeId && (
        <>
          <TextInput
            style={styles.input}
            placeholder="학교/복지관 알림 원문을 여기에 붙여넣으세요"
            placeholderTextColor="#7FA8F5"
            multiline
            value={rawText}
            onChangeText={updateRawText}
          />

          <TouchableOpacity
            style={[styles.button, (!rawText.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSummarize}
            disabled={!rawText.trim() || loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.buttonText}>핵심만 골라내는 중이에요</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>핵심만 정리하기</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {summarizeFailCount >= 3 && !notice && (
        <View style={styles.fallbackBox}>
          <Text style={styles.fallbackText}>
            핵심 정리가 자꾸 실패하네요. 일단 원문만 저장해두고, 나중에 다시 정리해볼까요?
          </Text>
          <TouchableOpacity onPress={saveRawTextOnly} style={styles.fallbackButton}>
            <Text style={styles.fallbackButtonText}>원문만 저장하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {notice && (
        <View style={styles.resultBox}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {showOriginal ? "학교에서 온 그대로" : "핵심만 정리하면"}
            </Text>
            <TouchableOpacity onPress={toggleShowOriginal}>
              <Text style={styles.toggleText}>
                {showOriginal ? "핵심만 보기" : "학교에서 온 그대로 보기"}
              </Text>
            </TouchableOpacity>
          </View>

          {partnerNotViewed && (
            <Text style={styles.partnerNotViewedText}>
              {partnerNotViewed}님은 아직 이 알림을 못 본 것 같아요
            </Text>
          )}

          {showOriginal ? (
            <Text style={styles.originalText}>{notice.raw_text}</Text>
          ) : (
            <>
              {/*
                디자인 원칙 3(역할 기반 자동 전환): 정보를 도맡는 보호자(primary)에게는
                설명 문단을 바로 보여주고, 상대적으로 정보에서 소외된 보호자(secondary)에게는
                "무엇을, 언제까지"인 체크리스트가 먼저 눈에 들어오도록 설명 문단을 접어둔다
                (원칙 1을 지키기 위해 완전히 숨기지 않고 한 번의 탭으로 항상 펼칠 수 있게 함).
              */}
              {role === "primary" || showSummaryText ? (
                <Text style={styles.summaryText}>{notice.ai_summary}</Text>
              ) : (
                <TouchableOpacity onPress={() => setShowSummaryText(true)}>
                  <Text style={styles.summaryToggleText}>설명 더 보기</Text>
                </TouchableOpacity>
              )}
              {items.map((item) => {
                const itemActions = actions.filter((a) => a.checklist_item_id === item.id);
                const isEditing = editingItemId === item.id;
                return (
                  <View key={item.id} style={styles.itemCard}>
                    {isEditing ? (
                      <View style={styles.editBox}>
                        <TextInput
                          style={styles.editInput}
                          placeholder="제목"
                          placeholderTextColor="#9DBEF7"
                          value={editDraft.title}
                          onChangeText={(text) => setEditDraft((d) => ({ ...d, title: text }))}
                        />
                        <TextInput
                          style={styles.editInput}
                          placeholder="상세 내용 (선택)"
                          placeholderTextColor="#9DBEF7"
                          value={editDraft.detail}
                          onChangeText={(text) => setEditDraft((d) => ({ ...d, detail: text }))}
                        />
                        <TextInput
                          style={styles.editInput}
                          placeholder="기한 (YYYY-MM-DD, 선택)"
                          placeholderTextColor="#9DBEF7"
                          value={editDraft.dueDate}
                          onChangeText={(text) => setEditDraft((d) => ({ ...d, dueDate: text }))}
                        />
                        <View style={styles.editButtonRow}>
                          <TouchableOpacity onPress={() => setEditingItemId(null)}>
                            <Text style={styles.editCancelText}>취소</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => saveEdit(item)}>
                            <Text style={styles.editSaveText}>저장</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.itemRow}
                        onPress={() => toggleItem(item)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, item.is_done && styles.checkboxChecked]}>
                          {item.is_done && <AnimatedCheckMark style={styles.checkboxMark} />}
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
                          <View style={styles.itemFooterRow}>
                            {!item.is_edited_by_user && item.ai_confidence < 0.7 && (
                              // PRD 5-1 분기3: 확신도 낮은 항목의 표시를 누르면 원문으로 이동해서
                              // 직접 대조해볼 수 있어야 한다(신뢰 > 속도 원칙의 직접 구현).
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setShowOriginal(true);
                                }}
                              >
                                <Text style={[styles.confidenceText, styles.confidenceTextLow]}>
                                  ❓ AI 확신도 {Math.round(item.ai_confidence * 100)}% · 원문과 비교해보기
                                </Text>
                              </TouchableOpacity>
                            )}
                            {!item.is_edited_by_user && item.ai_confidence >= 0.7 && (
                              <Text style={styles.confidenceText}>
                                AI 확신도 {Math.round(item.ai_confidence * 100)}%
                              </Text>
                            )}
                            {item.is_edited_by_user && (
                              <Text style={styles.editedBadge}>내가 수정함</Text>
                            )}
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                startEdit(item);
                              }}
                            >
                              <Text style={styles.editLinkText}>이거 아닌 것 같으면 고치기</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}

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
                        <Text style={styles.noteSendText}>
                          {noteSaveStatus[item.id] === "saving"
                            ? "저장 중..."
                            : noteSaveStatus[item.id] === "saved"
                              ? "남겼어요"
                              : "남기기"}
                        </Text>
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

      {!noticeId && <ChildConsentSection />}
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
  logoutText: {
    fontSize: 12,
    color: "#F23B3B",
    fontWeight: "600",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tabLinkGroup: {
    flexDirection: "row",
  },
  historyLinkText: {
    fontSize: 13,
    color: "#1B64F2",
    fontWeight: "600",
    marginLeft: 14,
  },
  newComposeButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F8FF",
  },
  newComposeButtonText: {
    color: "#1B64F2",
    fontSize: 13,
    fontWeight: "700",
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    marginTop: 12,
    color: "#F23B3B",
    fontSize: 14,
  },
  fallbackBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF3E8",
  },
  fallbackText: {
    fontSize: 13,
    color: "#7A4A0E",
    marginBottom: 10,
    lineHeight: 19,
  },
  fallbackButton: {
    backgroundColor: "#F2871B",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  fallbackButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
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
  // PRD 6-1/6-3(패턴 D): "아직 안 됐다"는 사실은 경고색이 아니라 중립 톤으로만
  // 표시한다("다그치지 않는다"). 이 팔레트는 회색을 쓰지 않기로 했으므로,
  // 이미 보조 텍스트에 쓰던 muted blue를 회색 대용으로 쓴다.
  partnerNotViewedText: {
    fontSize: 12,
    color: "#3D5A9C",
    fontWeight: "500",
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 15,
    color: "#0B1F4D",
    marginBottom: 14,
    lineHeight: 22,
  },
  summaryToggleText: {
    color: "#1B64F2",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 14,
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
  itemFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
  },
  confidenceText: {
    fontSize: 11,
    color: "#1B64F2",
    marginRight: 12,
  },
  confidenceTextLow: {
    color: "#F2871B",
    fontWeight: "700",
  },
  editedBadge: {
    fontSize: 11,
    color: "#3D5A9C",
    fontWeight: "700",
    marginRight: 12,
  },
  editLinkText: {
    fontSize: 12,
    color: "#1B64F2",
    fontWeight: "600",
  },
  editBox: {
    marginLeft: 0,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0B1F4D",
    marginBottom: 6,
  },
  editButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  editCancelText: {
    fontSize: 13,
    color: "#3D5A9C",
    fontWeight: "600",
    marginRight: 16,
  },
  editSaveText: {
    fontSize: 13,
    color: "#1B64F2",
    fontWeight: "700",
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

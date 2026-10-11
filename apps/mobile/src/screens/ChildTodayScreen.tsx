import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { authFetch } from "../lib/apiClient";
import type { Session } from "../lib/authStorage";
import { parseYmd } from "../lib/dateFormat";
import { cancelReminderForItem, resyncAllReminders } from "../lib/reminderSync";
import { CATEGORY_EMOJI, type ChecklistCategory } from "../types/notice";
import { COLORS, FONT_DISPLAY } from "../theme";

type TodayItem = {
  id: string;
  notice_id: string;
  title: string;
  category: ChecklistCategory;
  due_date: string | null;
  is_done: boolean;
  childId?: string | null;
};

type ShareMessage = { id: string; authorName: string; body: string; kind: string };

function dueLabel(due: string | null): { text: string; urgent: boolean } | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((parseYmd(due).getTime() - today.getTime()) / 86400000);
  if (days < 0) return { text: "기한이 지났어요", urgent: true };
  if (days === 0) return { text: "오늘까지!", urgent: true };
  if (days === 1) return { text: "내일까지", urgent: true };
  return { text: `${days}일 남았어요`, urgent: false };
}

/**
 * 아이가 보는 "오늘": 챙길 것을 크게 보여주고, 직접 "챙겼어요"를 누르면 별을 받는다.
 * 양육자가 아이를 위해 한 일(가족 이야기의 공유 글)도 여기서 먼저 보여 준다.
 */
export default function ChildTodayScreen({
  session,
  onOpenTalk,
}: {
  session: Session;
  onOpenTalk: (noticeId: string, label: string) => void;
}) {
  const [items, setItems] = useState<TodayItem[]>([]);
  const [shares, setShares] = useState<ShareMessage[]>([]);
  const [stars, setStars] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/api/today");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "불러오지 못했어요.");
      const all = (data.allItems ?? []) as TodayItem[];
      // 자녀 정보와 연결된 아이면 내 것과 공통 알림만 보여 준다.
      const mine = session.childId ? all.filter((i) => !i.childId || i.childId === session.childId) : all;
      setItems(mine);
      resyncAllReminders(mine).catch(() => {});

      authFetch("/api/stars")
        .then((r) => r.json())
        .then((s) => typeof s?.stars === "number" && setStars(s.stars))
        .catch(() => {});
      authFetch("/api/messages")
        .then((r) => (r.ok ? r.json() : { messages: [] }))
        .then((m) => {
          const list = ((m.messages ?? []) as ShareMessage[]).filter((x) => x.kind === "share");
          setShares(list.slice(-3).reverse());
        })
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했어요.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.childId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setDone(item: TodayItem, done: boolean) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: done } : i)));
    try {
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDone: done }),
      });
      if (!res.ok) throw new Error("저장하지 못했어요. 다시 눌러 주세요.");
      if (done) {
        await cancelReminderForItem(item.id);
        setCelebrate(item.title);
        setTimeout(() => setCelebrate(null), 2500);
        authFetch("/api/stars")
          .then((r) => r.json())
          .then((s) => typeof s?.stars === "number" && setStars(s.stars))
          .catch(() => {});
      } else {
        resyncAllReminders([{ ...item, is_done: false }]).catch(() => {});
      }
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: item.is_done } : i)));
      setError(err instanceof Error ? err.message : "저장하지 못했어요.");
    }
  }

  const todo = items
    .filter((i) => !i.is_done)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const done = items.filter((i) => i.is_done);
  const name = session.displayName?.trim() || "친구";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.hello}>{name}, 안녕! 👋</Text>
          <View style={styles.starBadge}>
            <Text style={styles.starBadgeText}>⭐ {stars}</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          {loading ? "오늘 챙길 걸 찾고 있어요..." : todo.length > 0 ? `오늘 챙길 것 ${todo.length}개!` : "오늘 챙길 건 다 했어요 🎉"}
        </Text>
      </View>

      {celebrate && (
        <View style={styles.celebrate}>
          <Text style={styles.celebrateText}>🌟 잘했어요! "{celebrate}" 챙기기 완료 · 별 +1</Text>
        </View>
      )}

      {shares.map((s) => (
        <View key={s.id} style={styles.shareCard}>
          <Text style={styles.shareTitle}>💛 {s.authorName}(이)가 {name}을(를) 위해</Text>
          <Text style={styles.shareBody}>{s.body}</Text>
        </View>
      ))}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && todo.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏖️</Text>
          <Text style={styles.emptyText}>챙길 게 없어요. "내 방"을 꾸미러 가 볼까요?</Text>
        </View>
      )}

      {todo.map((item) => {
        const due = dueLabel(item.due_date);
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
              <View style={styles.cardTextBox}>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {due && <Text style={[styles.cardDue, due.urgent && styles.cardDueUrgent]}>{due.text}</Text>}
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.doneButton} onPress={() => setDone(item, true)}>
                <Text style={styles.doneButtonText}>✔ 챙겼어요!</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.talkButton} onPress={() => onOpenTalk(item.notice_id, item.title)}>
                <Text style={styles.talkButtonText}>💬 이야기</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {done.length > 0 && (
        <TouchableOpacity onPress={() => setShowDone((v) => !v)} style={styles.doneToggle}>
          <Text style={styles.doneToggleText}>
            {showDone ? "다 챙긴 것 접기" : `다 챙긴 것 ${done.length}개 보기 🎉`}
          </Text>
        </TouchableOpacity>
      )}
      {showDone &&
        done.map((item) => (
          <View key={item.id} style={styles.doneRow}>
            <Text style={styles.doneRowText}>
              ✅ {item.title}
            </Text>
            <TouchableOpacity onPress={() => setDone(item, false)}>
              <Text style={styles.undoText}>아직이에요</Text>
            </TouchableOpacity>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: { paddingBottom: 28 },
  header: {
    backgroundColor: COLORS.sun,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 14,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hello: { fontFamily: FONT_DISPLAY, fontSize: 26, color: COLORS.ink, flexShrink: 1 },
  starBadge: { backgroundColor: COLORS.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  starBadgeText: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.ink },
  headerSub: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.sunInk, marginTop: 6 },
  celebrate: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.sky,
    borderRadius: 16,
    padding: 12,
  },
  celebrateText: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.skyInk, textAlign: "center" },
  shareCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.sunSoft,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.sun,
    padding: 14,
  },
  shareTitle: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.sunInk },
  shareBody: { fontSize: 15, color: COLORS.ink, marginTop: 4 },
  errorText: { color: COLORS.red, fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  emptyCard: { alignItems: "center", marginHorizontal: 16, padding: 24, backgroundColor: COLORS.tint, borderRadius: 20 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.primary, marginTop: 6, textAlign: "center" },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.line,
    padding: 16,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  cardEmoji: { fontSize: 40, marginRight: 12 },
  cardTextBox: { flex: 1 },
  cardCategory: { fontSize: 12, fontWeight: "700", color: COLORS.muted },
  cardTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, color: COLORS.ink, marginTop: 2 },
  cardDue: { fontSize: 14, fontWeight: "700", color: COLORS.muted, marginTop: 4 },
  cardDueUrgent: { color: COLORS.red },
  cardActions: { flexDirection: "row", marginTop: 14, gap: 10 },
  doneButton: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 13, alignItems: "center" },
  doneButtonText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 18 },
  talkButton: {
    backgroundColor: COLORS.sunSoft,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  talkButtonText: { fontFamily: FONT_DISPLAY, color: COLORS.sunInk, fontSize: 16 },
  doneToggle: { alignItems: "center", paddingVertical: 12 },
  doneToggleText: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.primary },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.tint,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  doneRowText: { flex: 1, fontSize: 15, color: COLORS.ink },
  undoText: { fontSize: 13, fontWeight: "700", color: COLORS.muted },
});

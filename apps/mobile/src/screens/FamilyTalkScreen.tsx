import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authFetch } from "../lib/apiClient";
import type { Session } from "../lib/authStorage";
import { formatMessageTime } from "../lib/dateFormat";
import { josa } from "../lib/josa";
import { COLORS, FONT_DISPLAY } from "../theme";

type MessageKind = "message" | "share" | "sticker";

type FamilyMessage = {
  id: string;
  noticeId: string | null;
  noticeSummary: string | null;
  userId: string;
  authorName: string;
  authorRole: string | null;
  kind: MessageKind;
  body: string;
  createdAt: string;
};

const STICKERS = ["👍", "❤️", "🎉", "⭐", "😊", "💪"];
const CHILD_PHRASES = ["다 챙겼어요!", "고마워요", "재밌었어요", "도와주세요"];
const SHARE_TEMPLATES = ["준비물 샀어요", "신청서 냈어요", "선생님과 상담했어요", "같이 숙제했어요"];

/**
 * 가족 이야기: 아이와 양육자가 알림장·프로그램 결과를 두고 대화하고, 양육자가 아이를 위해
 * 한 일을 공유한다. 실시간이 아니라 열 때·당겨서 새로고침할 때 가져온다(Pull 방식).
 */
export default function FamilyTalkScreen({
  session,
  noticeId,
  noticeLabel,
  onClearNotice,
}: {
  session: Session;
  noticeId?: string | null;
  noticeLabel?: string | null;
  onClearNotice?: () => void;
}) {
  const isChild = session.role === "child";
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [shareMode, setShareMode] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const query = noticeId ? `?noticeId=${encodeURIComponent(noticeId)}` : "";
      const res = await authFetch(`/api/messages${query}`);
      const data = await res.json();
      if (res.status === 503 && data?.needsMigration) {
        setNeedsMigration(true);
        return;
      }
      if (!res.ok) throw new Error(data?.error ?? "이야기를 불러오지 못했어요.");
      setNeedsMigration(false);
      setMessages(data.messages ?? []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이야기를 불러오지 못했어요.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [noticeId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function send(body: string, kind: MessageKind) {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await authFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({ body: text, kind, noticeId: noticeId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "보내지 못했어요.");
      if (kind !== "sticker") setDraft("");
      setShareMode(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "보내지 못했어요.");
    } finally {
      setSending(false);
    }
  }

  const quickPhrases = isChild ? CHILD_PHRASES : shareMode ? SHARE_TEMPLATES : [];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "android" ? "height" : "padding"}>
      <View style={styles.header}>
        <Text style={styles.title}>우리 가족 이야기</Text>
        <Text style={styles.subtitle}>
          {isChild
            ? "학교에서 있었던 일, 고마운 마음을 가족에게 전해요"
            : "알림장 결과를 함께 이야기하고, 아이를 위해 한 일을 나눠요"}
        </Text>
        {noticeId && (
          <TouchableOpacity style={styles.noticePill} onPress={onClearNotice}>
            <Text style={styles.noticePillText} numberOfLines={1}>
              📄 {noticeLabel ? noticeLabel.slice(0, 24) : "이 알림"} 이야기만 보는 중 · 전체 보기
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {needsMigration ? (
        <View style={styles.centerBox}>
          <Text style={styles.bigEmoji}>🛠️</Text>
          <Text style={styles.emptyTitle}>가족 이야기를 준비하고 있어요</Text>
          <Text style={styles.emptyBody}>관리자가 DB 업데이트(0004)를 마치면 바로 쓸 수 있어요.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.list}
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
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : messages.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.bigEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>아직 이야기가 없어요</Text>
                <Text style={styles.emptyBody}>
                  {isChild ? "오늘 학교에서 있었던 일을 가족에게 알려 줄래요?" : "첫 마디나 칭찬 스티커를 보내 보세요."}
                </Text>
              </View>
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} mine={m.userId === session.userId} showNotice={!noticeId} />
              ))
            )}
          </ScrollView>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.composer}>
            <View style={styles.stickerRow}>
              {STICKERS.map((s) => (
                <TouchableOpacity key={s} style={styles.stickerButton} onPress={() => send(s, "sticker")}>
                  <Text style={styles.stickerText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!isChild && (
              <TouchableOpacity
                style={[styles.shareToggle, shareMode && styles.shareToggleOn]}
                onPress={() => setShareMode((v) => !v)}
              >
                <Text style={[styles.shareToggleText, shareMode && styles.shareToggleTextOn]}>
                  {shareMode ? "💛 아이를 위해 한 일로 공유 중" : "💛 아이를 위해 한 일 공유하기"}
                </Text>
              </TouchableOpacity>
            )}
            {quickPhrases.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phraseRow}>
                {quickPhrases.map((p) => (
                  <TouchableOpacity key={p} style={styles.phraseChip} onPress={() => setDraft(p)}>
                    <Text style={styles.phraseText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={shareMode ? "아이를 위해 한 일을 적어 주세요" : "이야기를 남겨요"}
                placeholderTextColor={COLORS.primaryFaint}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
                onPress={() => send(draft, shareMode ? "share" : "message")}
                disabled={!draft.trim() || sending}
              >
                <Text style={styles.sendText}>{sending ? "..." : "보내기"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, mine, showNotice }: { message: FamilyMessage; mine: boolean; showNotice: boolean }) {
  const roleEmoji = message.authorRole === "child" ? "🧒" : "🧑";
  const noticeLine =
    showNotice && message.noticeSummary ? (
      <Text style={styles.noticeRef} numberOfLines={1}>
        📄 {message.noticeSummary}
      </Text>
    ) : null;

  if (message.kind === "share") {
    return (
      <View style={styles.shareCard}>
        <Text style={styles.shareTitle}>💛 {josa(message.authorName, "이/가")} 아이를 위해 한 일</Text>
        <Text style={styles.shareBody}>{message.body}</Text>
        {noticeLine}
        <Text style={styles.time}>{formatMessageTime(message.createdAt)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther]}>
      {!mine && (
        <Text style={styles.author}>
          {roleEmoji} {message.authorName}
        </Text>
      )}
      {message.kind === "sticker" ? (
        <Text style={styles.stickerBig}>{message.body}</Text>
      ) : (
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.body}</Text>
        </View>
      )}
      {noticeLine}
      <Text style={styles.time}>{formatMessageTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    backgroundColor: COLORS.sun,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: { fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink },
  subtitle: { fontSize: 13, color: COLORS.sunInk, marginTop: 4, lineHeight: 19 },
  noticePill: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  noticePillText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  list: { padding: 16, paddingBottom: 8 },
  loader: { marginTop: 40 },
  centerBox: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  bigEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: FONT_DISPLAY, fontSize: 19, color: COLORS.ink, marginTop: 8 },
  emptyBody: { fontSize: 14, color: COLORS.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  bubbleRow: { marginBottom: 12, maxWidth: "82%" },
  rowMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  rowOther: { alignSelf: "flex-start", alignItems: "flex-start" },
  author: { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 3 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 6 },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontSize: 15, color: COLORS.ink, lineHeight: 21 },
  bubbleTextMine: { color: COLORS.white },
  stickerBig: { fontSize: 44 },
  noticeRef: { fontSize: 11, color: COLORS.muted, marginTop: 3, maxWidth: 260 },
  time: { fontSize: 11, color: COLORS.primaryFaint, marginTop: 3 },
  shareCard: {
    backgroundColor: COLORS.sunSoft,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.sun,
    padding: 14,
    marginBottom: 12,
  },
  shareTitle: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.sunInk },
  shareBody: { fontSize: 15, color: COLORS.ink, marginTop: 4, lineHeight: 21 },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center", paddingHorizontal: 16, paddingBottom: 4 },
  composer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 2,
    borderTopColor: COLORS.line,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  stickerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  stickerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerText: { fontSize: 22 },
  shareToggle: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.sun,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 6,
  },
  shareToggleOn: { backgroundColor: COLORS.sun },
  shareToggleText: { fontSize: 13, fontWeight: "700", color: COLORS.sunInk },
  shareToggleTextOn: { color: COLORS.ink },
  phraseRow: { marginBottom: 6, flexGrow: 0 },
  phraseChip: {
    backgroundColor: COLORS.tint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  phraseText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  inputRow: { flexDirection: "row", alignItems: "flex-end" },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.ink,
    marginRight: 8,
  },
  sendButton: { backgroundColor: COLORS.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11 },
  sendButtonDisabled: { backgroundColor: COLORS.primarySoft },
  sendText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 15 },
});

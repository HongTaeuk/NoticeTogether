import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authFetch } from "../lib/apiClient";
import { josa } from "../lib/josa";
import type { Session } from "../lib/authStorage";
import { COLORS, FONT_DISPLAY } from "../theme";

type RoomItem = {
  id: string;
  emoji: string;
  name: string;
  need: number;
  // 방 그림 안에서 놓이는 자리(%) — 벽(위)과 바닥(아래)에 나눠 둔다.
  left: `${number}%`;
  top: `${number}%`;
};

// 별이 쌓일수록 하나씩 열린다. 처음 하나(화분)는 바로 놓을 수 있게 0개로 둔다.
const ITEMS: RoomItem[] = [
  { id: "plant", emoji: "🪴", name: "화분", need: 0, left: "4%", top: "60%" },
  { id: "bear", emoji: "🧸", name: "곰인형", need: 1, left: "20%", top: "70%" },
  { id: "balloon", emoji: "🎈", name: "풍선", need: 2, left: "8%", top: "8%" },
  { id: "dog", emoji: "🐶", name: "강아지", need: 3, left: "40%", top: "72%" },
  { id: "art", emoji: "🖼️", name: "그림", need: 5, left: "36%", top: "12%" },
  { id: "books", emoji: "📚", name: "책", need: 7, left: "72%", top: "60%" },
  { id: "star", emoji: "🌟", name: "반짝별", need: 10, left: "22%", top: "30%" },
  { id: "rainbow", emoji: "🌈", name: "무지개", need: 13, left: "60%", top: "6%" },
  { id: "cat", emoji: "🐱", name: "고양이", need: 16, left: "58%", top: "74%" },
  { id: "rocket", emoji: "🚀", name: "로켓", need: 20, left: "82%", top: "22%" },
  { id: "unicorn", emoji: "🦄", name: "유니콘", need: 25, left: "84%", top: "72%" },
  { id: "trophy", emoji: "🏆", name: "트로피", need: 30, left: "50%", top: "32%" },
];

type Stars = { stars: number; checkedItems: number; stickersReceived: number };

/**
 * 아이가 앱을 스스로 열고 싶게 만드는 재미 요소. 준비물을 챙겨 체크하거나 가족에게 칭찬 스티커를
 * 받으면 별이 쌓이고, 별로 열린 물건·친구들로 방을 꾸민다. 별은 서버에서 세고(같은 항목은 한 번만),
 * 방 배치는 이 기기에만 저장한다.
 */
export default function MyRoomScreen({ session }: { session: Session }) {
  const storageKey = `noticetogether:room:${session.userId}`;
  const seenKey = `noticetogether:roomSeenStars:${session.userId}`;
  const [stars, setStars] = useState<Stars | null>(null);
  const [placed, setPlaced] = useState<string[]>(["plant"]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<RoomItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) setPlaced(JSON.parse(saved) as string[]);

      const res = await authFetch("/api/stars");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "별을 불러오지 못했어요.");
      setStars(data as Stars);

      const seen = Number((await AsyncStorage.getItem(seenKey)) ?? "0");
      const current = (data as Stars).stars;
      if (current > seen) {
        setNewlyUnlocked(ITEMS.filter((i) => i.need > seen && i.need <= current));
      }
      await AsyncStorage.setItem(seenKey, String(current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "별을 불러오지 못했어요.");
    } finally {
      setRefreshing(false);
    }
  }, [storageKey, seenKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePlace(item: RoomItem) {
    const total = stars?.stars ?? 0;
    if (item.need > total) return;
    const next = placed.includes(item.id) ? placed.filter((id) => id !== item.id) : [...placed, item.id];
    setPlaced(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
  }

  const total = stars?.stars ?? 0;
  const nextItem = ITEMS.find((i) => i.need > total);
  const name = session.displayName?.trim() || "나";

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
      <View style={styles.headerRow}>
        <Text style={styles.title}>{name}의 방</Text>
        <View style={styles.starBadge}>
          <Text style={styles.starBadgeText}>⭐ {total}</Text>
        </View>
      </View>

      {newlyUnlocked.length > 0 && (
        <TouchableOpacity style={styles.unlockBanner} onPress={() => setNewlyUnlocked([])}>
          <Text style={styles.unlockTitle}>🎁 새 친구가 생겼어요!</Text>
          <Text style={styles.unlockBody}>
            {newlyUnlocked.map((i) => `${i.emoji} ${i.name}`).join(", ")} — 아래에서 눌러 방에 놓아 보세요
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.room}>
        <View style={styles.wall} />
        <View style={styles.floor} />
        {ITEMS.filter((i) => placed.includes(i.id) && i.need <= total).map((i) => (
          <TouchableOpacity
            key={i.id}
            style={[styles.placed, { left: i.left, top: i.top }]}
            onPress={() => togglePlace(i)}
          >
            <Text style={styles.placedEmoji}>{i.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.goalCard}>
        {nextItem ? (
          <Text style={styles.goalText}>
            ⭐ {nextItem.need - total}개만 더 모으면 {nextItem.emoji} {josa(nextItem.name, "을/를")} 만날 수 있어요!
          </Text>
        ) : (
          <Text style={styles.goalText}>🏅 모든 친구를 다 모았어요! 정말 대단해요!</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>꾸미기 상자</Text>
      <View style={styles.grid}>
        {ITEMS.map((i) => {
          const unlocked = i.need <= total;
          const isPlaced = placed.includes(i.id);
          return (
            <TouchableOpacity
              key={i.id}
              style={[styles.cell, isPlaced && styles.cellPlaced, !unlocked && styles.cellLocked]}
              onPress={() => togglePlace(i)}
              disabled={!unlocked}
              accessibilityLabel={unlocked ? `${i.name} ${isPlaced ? "치우기" : "놓기"}` : `${i.name}, 별 ${i.need}개 필요`}
            >
              <Text style={[styles.cellEmoji, !unlocked && styles.cellEmojiLocked]}>{unlocked ? i.emoji : "🔒"}</Text>
              <Text style={styles.cellName}>{i.name}</Text>
              <Text style={styles.cellNeed}>{unlocked ? (isPlaced ? "놓았어요" : "눌러서 놓기") : `⭐ ${i.need}`}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.howCard}>
        <Text style={styles.howTitle}>별은 이렇게 모아요</Text>
        <Text style={styles.howLine}>🎒 준비물을 챙기고 "챙겼어요"를 누르면 ⭐ 1개</Text>
        <Text style={styles.howLine}>💌 가족이 칭찬 스티커를 보내 주면 ⭐ 1개</Text>
        {stars && (
          <Text style={styles.howCount}>
            지금까지 챙긴 것 {stars.checkedItems}개 · 받은 스티커 {stars.stickersReceived}개
          </Text>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: 18, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 26, color: COLORS.ink },
  starBadge: { backgroundColor: COLORS.sun, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  starBadgeText: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.ink },
  unlockBanner: {
    backgroundColor: COLORS.sky,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  unlockTitle: { fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.skyInk },
  unlockBody: { fontSize: 13, color: COLORS.ink, marginTop: 2 },
  room: {
    height: 260,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: COLORS.sun,
  },
  wall: { position: "absolute", left: 0, right: 0, top: 0, height: "58%", backgroundColor: COLORS.sunSoft },
  floor: { position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: COLORS.wood },
  placed: { position: "absolute" },
  placedEmoji: { fontSize: 42 },
  goalCard: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line, padding: 12, marginTop: 12 },
  goalText: { fontSize: 14, fontWeight: "700", color: COLORS.ink, textAlign: "center" },
  sectionTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, color: COLORS.ink, marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  cell: {
    width: "23.5%",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingVertical: 10,
  },
  cellPlaced: { borderColor: COLORS.primary, backgroundColor: COLORS.tint },
  cellLocked: { backgroundColor: COLORS.tint, borderColor: COLORS.tint },
  cellEmoji: { fontSize: 30 },
  cellEmojiLocked: { opacity: 0.5 },
  cellName: { fontSize: 12, fontWeight: "700", color: COLORS.ink, marginTop: 2 },
  cellNeed: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
  howCard: { backgroundColor: COLORS.tint, borderRadius: 16, padding: 14, marginTop: 20 },
  howTitle: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.primary, marginBottom: 6 },
  howLine: { fontSize: 13, color: COLORS.ink, marginTop: 2 },
  howCount: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
  errorText: { color: COLORS.red, fontSize: 13, marginTop: 12, textAlign: "center" },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import RoomScene from "../components/room/RoomScene";
import { CeremonyModal, CollectionSheet, DailyGiftModal, DecoSheet, ShopSheet } from "../components/RoomSheets";
import { authFetch } from "../lib/apiClient";
import type { Session } from "../lib/authStorage";
import { parseYmd, toYmd } from "../lib/dateFormat";
import { josa } from "../lib/josa";
import type { DailyGift, RoomData } from "../types/room";
import { COLORS, FONT_DISPLAY } from "../theme";

/** 방 물건을 누르면 나오는 한 줄 — 방을 "예쁜 그림"이 아니라 "알림을 준비해서 받은 선물"로 읽히게 한다. */
const BASE_INFO: Record<string, string> = {
  bed: "포근한 침대 — 내일 준비를 마치고 푹 자는 곳이에요",
  window: "햇살 창문 — 아침 햇살이 들어와 학교 갈 시간을 알려 줘요",
  rug: "해님 러그 — 가족이 둘러앉는 방 가운데예요",
  rug2: "새싹 러그 — 방 가운데를 산뜻하게 바꿔 줘요",
};

const DOW = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * 아이의 "내 방" — 초록 지붕 인형의 집. 알림 준비물을 챙긴 날이 쌓이면 선물이 도착해 방이 채워지고,
 * 별로 러그·벽지·바닥을 바꾼다. 선물·별 계산은 서버가 하고(같은 날은 같은 결과),
 * 이 화면은 보여 주고 고르기만 한다.
 */
export default function MyRoomScreen({ session }: { session: Session }) {
  const { width: screenWidth } = useWindowDimensions();
  const sceneWidth = Math.min(screenWidth - 24, 520);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [dexOpen, setDexOpen] = useState(false);
  const [pop, setPop] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<RoomData["ceremony"]>(null);
  const [dailyOpen, setDailyOpen] = useState(false);
  // 첫 방문 선물이 있으면 그걸 먼저 열고, 마일스톤 선물 도착 연출은 그다음에 보여 준다.
  const pendingCeremony = useRef<RoomData["ceremony"]>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/api/room");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "방을 불러오지 못했어요.");
      const r = data as RoomData;
      setRoom(r);
      if (r.dailyGift) {
        pendingCeremony.current = r.ceremony;
        setTimeout(() => setDailyOpen(true), 400);
      } else if (r.ceremony) setTimeout(() => setCeremony(r.ceremony), 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : "방을 불러오지 못했어요.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop(null), 2500);
    return () => clearTimeout(t);
  }, [pop]);

  async function mutate(path: string, method: "PATCH" | "POST", body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(path, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "바꾸지 못했어요.");
      setRoom(data as RoomData);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "바꾸지 못했어요.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(
    () =>
      new Set([
        ...(room?.collectibles ?? []).filter((c) => c.owned && !c.hidden).map((c) => c.code),
        ...(room?.decor ?? []).filter((d) => d.owned && !d.hidden).map((d) => d.code),
      ]),
    [room],
  );

  async function openDaily(): Promise<DailyGift | null> {
    const res = await authFetch("/api/room/daily", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      // 이미 받았으면(다른 기기 등) 조용히 닫는다.
      if (res.status === 409) setDailyOpen(false);
      return null;
    }
    setRoom(data as RoomData);
    return (data as { received: DailyGift }).received;
  }

  const week = useMemo(() => {
    if (!room) return [];
    const today = parseYmd(room.today);
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const kept = new Set(room.keptDays);
    return DOW.map((label, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toYmd(d);
      return { key, label: key === room.today ? "오늘" : label, kept: kept.has(key), future: d > today, isToday: key === room.today };
    });
  }, [room]);

  if (!room) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{error ?? "방을 정리하는 중이에요…"}</Text>
        {error && (
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>다시 불러오기</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const name = session.displayName?.trim() || "나";
  const ownedCount = room.collectibles.filter((c) => c.owned).length;
  const monthPrefix = room.today.slice(0, 7);
  const keptThisMonth = room.keptDays.filter((d) => d.startsWith(monthPrefix)).length;
  const info = (key: string) =>
    BASE_INFO[key] ??
    (() => {
      const c = room.collectibles.find((x) => x.code === key) ?? room.decor?.find((x) => x.code === key);
      const lv = room.levels?.[key];
      return c ? `${c.name}${lv && lv > 1 ? ` (${lv}단계)` : ""} — ${c.story}` : null;
    })();

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
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
        <View style={styles.scene}>
          <View style={styles.sceneTop}>
            <Text style={styles.title}>{name}의 방</Text>
            <View style={styles.starBadge}>
              <Text style={styles.starBadgeText}>⭐ {room.stars.balance}</Text>
            </View>
            <TouchableOpacity
              style={[styles.editButton, editing && styles.editButtonOn]}
              onPress={() => setEditing(true)}
              disabled={room.needsMigration}
              accessibilityLabel="꾸미기"
            >
              <Text style={[styles.editText, editing && styles.editTextOn]}>✏️ 꾸미기</Text>
            </TouchableOpacity>
          </View>
          <RoomScene
            width={sceneWidth}
            visible={visible}
            rug={room.selection.rug}
            wall={room.selection.wall}
            floor={room.selection.floor}
            editing={editing}
            onPick={(k) => setPop(info(k))}
            onRugSlot={() => setEditing(true)}
            levels={room.levels}
          />
          <Text style={styles.caption}>알림을 꾸준히 준비하면 이 방에 선물이 하나씩 놓여요</Text>
          {pop && (
            <View style={styles.pop}>
              <Text style={styles.popText}>{pop}</Text>
            </View>
          )}
        </View>

        {room.needsMigration && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>방 꾸미기를 준비하고 있어요. 관리자가 DB 업데이트(0005)를 마치면 쓸 수 있어요.</Text>
          </View>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.hero}>
          <View style={styles.streakRow}>
            <Text style={styles.streakText}>
              {room.streak > 0 ? `🔥 ${room.streak}일 연속 알림 준비 중` : "🌱 오늘 알림부터 함께 준비해요"}
            </Text>
            <Text style={styles.streakSub}>이번 달 {keptThisMonth}일</Text>
          </View>
          <View style={styles.weekRow}>
            {week.map((d) => (
              <View key={d.key} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayCell,
                    d.kept && styles.dayKept,
                    d.isToday && !d.kept && styles.dayToday,
                    d.future && styles.dayFuture,
                  ]}
                >
                  {d.kept && <Text style={styles.dayCheck}>✓</Text>}
                </View>
                <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>{d.label}</Text>
              </View>
            ))}
          </View>
          {room.daysToNextGift !== null ? (
            <View style={styles.giftBox}>
              <Text style={styles.giftText}>
                🎁 다음 선물까지 준비 <Text style={styles.giftCount}>{room.daysToNextGift}번</Text> 남았어요
              </Text>
              <Text style={styles.giftSub}>
                {room.keptToday ? "오늘 준비 완료! 내일 알림도 함께 챙겨요" : "오늘 알림 준비물을 챙기면 한 걸음 가까워져요"}
              </Text>
            </View>
          ) : (
            <Text style={styles.promise}>
              {room.keptToday ? "오늘 준비 완료! 선물을 다 모았어요" : "선물을 다 모았어요! 오늘 준비하면 보너스 별 +1"}
            </Text>
          )}
        </View>

        <View style={styles.assetRow}>
          <Asset value={`⭐ ${room.stars.balance}`} label="쓸 수 있는 별" />
          <Asset value={`${ownedCount}/${room.collectibles.length}`} label="받은 선물" />
          <Asset value={`${room.streak}일`} label="연속 준비" />
          <Asset value={`${room.keptDays.length}일`} label="준비한 날" />
        </View>

        <View style={styles.entryRow}>
          <TouchableOpacity style={styles.entry} onPress={() => setShopOpen(true)} disabled={room.needsMigration}>
            <Text style={styles.entryEmoji}>🛍️</Text>
            <View style={styles.entryText}>
              <Text style={styles.entryValue}>⭐ {room.stars.balance}</Text>
              <Text style={styles.entryLabel}>별 상점</Text>
            </View>
            <Text style={styles.entryArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.entry} onPress={() => setDexOpen(true)}>
            <Text style={styles.entryEmoji}>📖</Text>
            <View style={styles.entryText}>
              <Text style={styles.entryValue}>{ownedCount}개</Text>
              <Text style={styles.entryLabel}>선물 모음</Text>
            </View>
            <Text style={styles.entryArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.howCard}>
          <Text style={styles.howTitle}>별과 선물은 이렇게 받아요</Text>
          <Text style={styles.howLine}>🎒 알림장 준비물을 챙기고 "챙겼어요!"를 누르면 ⭐ 1개</Text>
          <Text style={styles.howLine}>🌞 매일 처음 내 방에 들어오면 오늘의 선물(별이나 장난감)</Text>
          <Text style={styles.howLine}>🛍️ 모은 별로 가구·장난감을 사고, 침대·창문·책상·책장을 업그레이드해요</Text>
          <Text style={styles.howLine}>🎁 알림을 준비한 날이 3·7·12일… 쌓일 때마다 선물이 와요</Text>
          <Text style={styles.howLine}>🔥 며칠 연속으로 준비하면 희귀·전설 선물이 잘 나와요</Text>
          <Text style={styles.howLine}>💌 가족이 칭찬 스티커를 보내 주면 ⭐ 1개</Text>
          <Text style={styles.howCount}>
            지금까지 챙긴 준비물 {room.checkedItems}개 · 받은 스티커 {room.stickersReceived}개
            {room.bonusStars > 0 ? ` · 보너스 ${room.bonusStars}개` : ""} · 쓴 별 {room.stars.spent}개
          </Text>
        </View>
      </ScrollView>

      <DecoSheet
        visible={editing}
        room={room}
        onClose={() => setEditing(false)}
        onToggle={(code) => {
          const hidden = new Set(room.collectibles.filter((c) => c.hidden).map((c) => c.code));
          if (hidden.has(code)) hidden.delete(code);
          else hidden.add(code);
          mutate("/api/room", "PATCH", { hidden: [...hidden] });
        }}
        onChoose={(field, code) => mutate("/api/room", "PATCH", { [field]: code })}
      />
      <ShopSheet
        visible={shopOpen}
        room={room}
        busy={busy}
        onClose={() => setShopOpen(false)}
        onBuy={async (code) => {
          const ok = await mutate("/api/room/buy", "POST", { code });
          if (ok) {
            const item = room.shop.find((s) => s.code === code);
            setShopOpen(false);
            setPop(
              item?.category === "upgrade"
                ? `${item.name.split(" — ")[0]}로 올렸어요! 방에서 확인해 보세요`
                : `${josa(item?.name ?? "새 선물", "을/를")} 데려와서 방에 바로 적용했어요!`,
            );
          }
        }}
      />
      <CollectionSheet visible={dexOpen} room={room} onClose={() => setDexOpen(false)} />
      <DailyGiftModal
        visible={dailyOpen}
        onOpen={openDaily}
        onClose={() => {
          setDailyOpen(false);
          const next = pendingCeremony.current;
          pendingCeremony.current = null;
          if (next) setTimeout(() => setCeremony(next), 350);
        }}
      />
      <CeremonyModal
        ceremony={ceremony}
        today={room.today}
        onClose={() => {
          const seen = ceremony?.date;
          setCeremony(null);
          if (seen) mutate("/api/room", "PATCH", { ceremonySeen: seen });
        }}
      />
    </View>
  );
}

function Asset({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.asset}>
      <Text style={styles.assetValue}>{value}</Text>
      <Text style={styles.assetLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.cream },
  content: { paddingBottom: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.cream, padding: 24 },
  loadingText: { fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.muted, textAlign: "center" },
  retry: { marginTop: 12, backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 15 },
  scene: {
    backgroundColor: COLORS.sunSoft,
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  sceneTop: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", paddingHorizontal: 16, gap: 8 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink, flex: 1 },
  starBadge: { backgroundColor: COLORS.sun, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  starBadgeText: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.ink },
  editButton: { backgroundColor: COLORS.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  editButtonOn: { backgroundColor: COLORS.primary },
  editText: { fontFamily: FONT_DISPLAY, fontSize: 14, color: COLORS.ink },
  editTextOn: { color: COLORS.white },
  caption: { fontSize: 12, color: COLORS.sunInk, marginTop: 2 },
  pop: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(58,46,31,0.88)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  popText: { color: COLORS.white, fontSize: 14, fontWeight: "700", textAlign: "center" },
  notice: { marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.orangeSoft, borderRadius: 14, padding: 12 },
  noticeText: { fontSize: 13, color: COLORS.orangeInk },
  errorText: { color: COLORS.red, fontSize: 13, marginHorizontal: 16, marginTop: 10, textAlign: "center" },
  hero: { marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 2, borderColor: COLORS.line },
  streakRow: { flexDirection: "row", alignItems: "center" },
  streakText: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.ink, flex: 1 },
  streakSub: { fontSize: 12, fontWeight: "700", color: COLORS.muted },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  dayCol: { alignItems: "center", flex: 1 },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  dayKept: { backgroundColor: COLORS.primary },
  dayToday: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.white },
  dayFuture: { opacity: 0.45 },
  dayCheck: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
  dayLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4, fontWeight: "700" },
  dayLabelToday: { color: COLORS.primary },
  promise: { fontSize: 13, color: COLORS.ink, marginTop: 12, textAlign: "center" },
  giftBox: { marginTop: 14, backgroundColor: COLORS.sunSoft, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  giftText: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.sunInk },
  giftCount: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.ink },
  giftSub: { fontSize: 12, color: COLORS.sunInk, marginTop: 3 },
  assetRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 },
  asset: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, paddingVertical: 12, alignItems: "center" },
  assetValue: { fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.ink },
  assetLabel: { fontSize: 11, color: COLORS.muted, fontWeight: "700", marginTop: 2 },
  entryRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 },
  entry: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.sunSoft,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  entryEmoji: { fontSize: 26 },
  entryText: { flex: 1 },
  entryValue: { fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.ink },
  entryLabel: { fontSize: 12, color: COLORS.sunInk, fontWeight: "700" },
  entryArrow: { fontSize: 20, color: COLORS.sunInk },
  howCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.tint, borderRadius: 18, padding: 14 },
  howTitle: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.primary, marginBottom: 6 },
  howLine: { fontSize: 13, color: COLORS.ink, marginTop: 3, lineHeight: 19 },
  howCount: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
});

import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatKoreanDate } from "../lib/dateFormat";
import { ArtThumb } from "./room/roomArt";
import type { DailyGift, RoomData, RoomShopItem } from "../types/room";
import FunLoading from "./FunLoading";
import { COLORS, FONT_DISPLAY } from "../theme";

const GRADE_LABEL: Record<string, string> = { COMMON: "일반", RARE: "희귀", EPIC: "전설" };
const GRADE_EMOJI: Record<string, string> = { COMMON: "🍀", RARE: "💎", EPIC: "👑" };
const GRADE_TINT: Record<string, string> = { COMMON: COLORS.tint, RARE: COLORS.sky, EPIC: COLORS.sunSoft };
const GRADE_INK: Record<string, string> = { COMMON: COLORS.primary, RARE: COLORS.skyInk, EPIC: COLORS.sunInk };

/**
 * 등급 뱃지. 이모지와 글자를 한 Text("🍀 일반")로 두면 태블릿에서 잠긴 일반 칸만 글자가 그려지지 않았다
 * (자리는 잡히는데 "일반"만 빈칸) — 이모지와 글자를 따로 그린다.
 */
function GradeBadge({ grade, label, bg, style }: { grade: string; label: string; bg: string; style?: object }) {
  return (
    <View style={[styles.gradeBadge, style, { backgroundColor: bg }]}>
      <Text style={styles.gradeEmoji}>{GRADE_EMOJI[grade]}</Text>
      <Text style={[styles.gradeText, { color: GRADE_INK[grade] }]}>{label}</Text>
    </View>
  );
}

/** 물건 그림 한 칸 — 선물·러그는 그 그림, 벽지·바닥은 견본, 아직 없으면 자물쇠. */
export function ItemThumb({ glyph, size, locked, level }: { glyph: string; size: number; locked?: boolean; level?: number }) {
  if (locked) {
    return (
      <View style={[styles.thumbBox, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.45 }}>🔒</Text>
      </View>
    );
  }
  return (
    <View style={[styles.thumbBox, { width: size, height: size }]}>
      <ArtThumb glyph={glyph} size={size * 0.9} level={level} />
    </View>
  );
}

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="닫기">
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}

type DecoTab = "furn" | "prop" | "toy" | "bg";
const DECO_TABS: { key: DecoTab; label: string }[] = [
  { key: "furn", label: "가구" },
  { key: "prop", label: "소품" },
  { key: "toy", label: "장난감" },
  { key: "bg", label: "배경" },
];
const FURN_CODES = ["shelf", "desk", "easel", "tent"];
const PROP_CODES = ["plant", "clock", "board", "bag", "garland"];

type DecoCell = { key: string; name: string; glyph: string; owned: boolean; on: boolean; onPress: () => void; hint?: string; level?: number };

/**
 * 꾸미기. 가구·소품은 **켜고 끄기**(여러 개를 함께 둔다), 러그·배경은 **하나 고르기**.
 * 잠긴 칸을 숨기지 않는다: 무엇이 남았는지 보여야 모을 마음이 생긴다.
 */
export function DecoSheet({
  visible,
  room,
  onClose,
  onToggle,
  onChoose,
}: {
  visible: boolean;
  room: RoomData;
  onClose: () => void;
  onToggle: (code: string) => void;
  onChoose: (field: "rug" | "wall" | "floor", code: string) => void;
}) {
  const [tab, setTab] = useState<DecoTab>("furn");
  const byCode = new Map(room.collectibles.map((c) => [c.code, c]));
  const collectibleCell = (code: string): DecoCell => {
    const c = byCode.get(code)!;
    return {
      key: code,
      name: c.name,
      glyph: c.glyph,
      owned: c.owned,
      on: c.owned && !c.hidden,
      onPress: () => onToggle(code),
      hint: c.owned ? undefined : "준비하면 와요",
      level: room.levels?.[code],
    };
  };
  const shopCell = (s: RoomShopItem, field: "rug" | "wall" | "floor"): DecoCell => ({
    key: s.code,
    name: s.name,
    glyph: s.glyph,
    owned: s.owned,
    on: room.selection[field] === s.code,
    onPress: () => onChoose(field, s.code),
    hint: s.owned ? undefined : `⭐ ${s.price}`,
  });

  let cells: DecoCell[] = [];
  if (tab === "furn") {
    cells = [
      ...room.shop.filter((s) => s.category === "rug").map((s) => shopCell(s, "rug")),
      { key: "bed", name: "포근한 침대", glyph: "bed", owned: true, on: true, onPress: () => {}, level: room.levels?.bed },
      ...FURN_CODES.map(collectibleCell),
    ];
  } else if (tab === "prop") {
    cells = PROP_CODES.map(collectibleCell);
  } else if (tab === "toy") {
    cells = (room.decor ?? []).map((d) => ({
      key: d.code,
      name: d.name,
      glyph: d.glyph,
      owned: d.owned,
      on: d.owned && !d.hidden,
      onPress: () => onToggle(d.code),
      hint: d.owned ? undefined : `⭐ ${d.price} · 매일 선물`,
    }));
  } else {
    cells = [
      ...room.shop.filter((s) => s.category === "wall").map((s) => shopCell(s, "wall")),
      ...room.shop.filter((s) => s.category === "floor").map((s) => shopCell(s, "floor")),
    ];
  }

  return (
    <Sheet visible={visible} title="꾸미기" onClose={onClose}>
      <View style={styles.tabRow}>
        {DECO_TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabChip, tab === t.key && styles.tabChipOn]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.sheetHint}>
        {tab === "bg"
          ? "하나를 골라요. 잠긴 건 별 상점에서 데려와요."
          : tab === "toy"
            ? "매일 처음 들어올 때 받는 선물이나 별 상점에서 데려와요. 눌러서 두거나 치워요."
            : "눌러서 방에 두거나 치워요. 아직 없는 건 준비한 날 선물로 오거나 별 상점에서 살 수 있어요."}
      </Text>
      <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
        {cells.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.cell, c.on && styles.cellOn, !c.owned && styles.cellLocked]}
            onPress={c.owned ? c.onPress : undefined}
            disabled={!c.owned}
            accessibilityLabel={c.owned ? c.name : `${c.name}, 아직 없어요`}
          >
            {c.on && c.owned && (
              <View style={styles.check}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            )}
            <ItemThumb glyph={c.glyph} size={52} locked={!c.owned} level={c.level} />
            <Text style={styles.cellName} numberOfLines={1}>
              {c.name}
            </Text>
            {c.hint && <Text style={styles.cellHint}>{c.hint}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const SHOP_SECTIONS: { category: RoomShopItem["category"]; label: string }[] = [
  { category: "upgrade", label: "업그레이드" },
  { category: "furniture", label: "가구·소품" },
  { category: "decor", label: "장난감" },
  { category: "rug", label: "러그" },
  { category: "wall", label: "벽지" },
  { category: "floor", label: "바닥" },
];

/** 별 상점 — 별은 방 꾸미기 전용이다. 산 것은 바로 방에 적용된다. */
export function ShopSheet({
  visible,
  room,
  busy,
  onClose,
  onBuy,
}: {
  visible: boolean;
  room: RoomData;
  busy: boolean;
  onClose: () => void;
  onBuy: (code: string) => void;
}) {
  const balance = room.stars.balance;
  return (
    <Sheet visible={visible} title={`별 상점 · ⭐ ${balance}`} onClose={onClose}>
      {busy && <FunLoading scene="stars" compact steps={["별을 세는 중이에요", "포장을 뜯는 중", "방으로 옮기는 중"]} />}
      <ScrollView style={styles.listScroll}>
        {SHOP_SECTIONS.map((sec) => (
          <View key={sec.category}>
            <Text style={styles.shopSection}>{sec.label}</Text>
            {room.shop
              .filter((s) => s.category === sec.category && s.price > 0)
              .map((s) => {
                const short = s.price - balance;
                return (
                  <View key={s.code} style={styles.shopRow}>
                    <ItemThumb glyph={s.glyph} size={52} level={s.level} />
                    <View style={styles.shopText}>
                      <Text style={styles.shopName}>{s.name}</Text>
                      <Text style={styles.shopPrice}>⭐ {s.price}</Text>
                    </View>
                    {s.owned ? (
                      <Text style={styles.ownedText}>갖고 있어요</Text>
                    ) : (
                      <TouchableOpacity
                        style={[styles.buyButton, (short > 0 || busy) && styles.buyButtonOff]}
                        onPress={() => onBuy(s.code)}
                        disabled={short > 0 || busy}
                      >
                        <Text style={styles.buyText}>{short > 0 ? `별 ${short}개 더` : "데려오기"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
          </View>
        ))}
        <Text style={styles.fine}>별은 알림장 준비물을 챙기고 "챙겼어요!"를 누르거나, 가족에게 칭찬 스티커를 받으면 모여요.</Text>
      </ScrollView>
    </Sheet>
  );
}

/** 선물 모음 — 알림을 준비한 날마다 받은 선물의 기록. 아직 못 받은 칸도 "???"로 남겨 둔다. */
export function CollectionSheet({ visible, room, onClose }: { visible: boolean; room: RoomData; onClose: () => void }) {
  const owned = room.collectibles.filter((c) => c.owned).length;
  return (
    <Sheet visible={visible} title={`선물 모음 · ${owned}/${room.collectibles.length}개`} onClose={onClose}>
      <ScrollView style={styles.listScroll}>
        {room.collectibles.map((c) => (
          <View key={c.code} style={[styles.dexRow, !c.owned && styles.dexRowLocked]}>
            <ItemThumb glyph={c.glyph} size={56} locked={!c.owned} />
            <View style={styles.shopText}>
              <View style={styles.dexTop}>
                <Text style={styles.shopName}>{c.owned ? c.name : "???"}</Text>
                <GradeBadge
                  grade={c.grade}
                  label={GRADE_LABEL[c.grade]}
                  bg={c.owned ? GRADE_TINT[c.grade] : COLORS.white}
                  style={styles.dexBadge}
                />
              </View>
              <Text style={styles.dexStory}>{c.owned ? c.story : "알림 준비물을 챙긴 날 받을 수 있어요."}</Text>
              {c.owned && c.date && <Text style={styles.dexDate}>{formatKoreanDate(c.date)}에 도착</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

/**
 * 도착 연출 — 방에 들어왔을 때 띄운다. 받은 그 물건을 크게 보여 줘야 "무엇이 왔는지"가 남는다.
 */
export function CeremonyModal({
  ceremony,
  today,
  onClose,
}: {
  ceremony: RoomData["ceremony"];
  today: string;
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!ceremony) return;
    scale.setValue(0.3);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
  }, [ceremony, scale]);
  if (!ceremony) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.ceremonyBackdrop}>
        <View style={styles.ceremonyCard}>
          <Text style={styles.ceremonyKicker}>{ceremony.date === today ? "오늘 준비물을 다 챙겼구나!" : "알림을 준비한 날 받은 선물이에요"}</Text>
          <Animated.View style={[styles.ceremonyHero, { transform: [{ scale }] }]}>
            <ItemThumb glyph={ceremony.glyph} size={120} />
          </Animated.View>
          <Text style={styles.ceremonyTitle}>알림 선물이 왔어요 🎁</Text>
          <GradeBadge
            grade={ceremony.grade}
            label={`${ceremony.name} · ${GRADE_LABEL[ceremony.grade]}`}
            bg={GRADE_TINT[ceremony.grade]}
            style={styles.ceremonyBadge}
          />
          <Text style={styles.ceremonyStory}>{ceremony.story}</Text>
          <TouchableOpacity style={styles.ceremonyButton} onPress={onClose}>
            <Text style={styles.ceremonyButtonText}>내 방에 두기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 매일 첫 접속 선물 — 흔들리는 선물 상자를 눌러 열면 별이나 장난감이 나온다.
 * 무엇이 나올지는 서버가 정한다(눌러서 여는 순간 POST /api/room/daily). 하루에 한 번.
 */
export function DailyGiftModal({
  visible,
  onOpen,
  onClose,
}: {
  visible: boolean;
  onOpen: () => Promise<DailyGift | null>;
  onClose: () => void;
}) {
  const [opened, setOpened] = useState<DailyGift | null>(null);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const wobble = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!visible) return;
    setOpened(null);
    setFailed(false);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(wobble, { toValue: -1, duration: 240, useNativeDriver: true }),
        Animated.timing(wobble, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.delay(700),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, wobble]);

  async function open() {
    if (opening || opened) return;
    setOpening(true);
    const gift = await onOpen().catch(() => null);
    setOpening(false);
    if (!gift) {
      setFailed(true);
      return;
    }
    pop.setValue(0.3);
    setOpened(gift);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start();
  }

  if (!visible) return null;
  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ["-10deg", "10deg"] });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.ceremonyBackdrop}>
        <View style={styles.ceremonyCard}>
          <Text style={styles.ceremonyKicker}>오늘도 와 줬구나!</Text>
          {!opened ? (
            <>
              <TouchableOpacity activeOpacity={0.8} onPress={open} accessibilityLabel="선물 상자 열기">
                <Animated.Text style={[styles.giftBox, { transform: [{ rotate }] }]}>🎁</Animated.Text>
              </TouchableOpacity>
              <Text style={styles.ceremonyTitle}>오늘의 첫 방문 선물</Text>
              {opening ? (
                <FunLoading scene="stars" compact steps={["리본을 푸는 중이에요", "상자 뚜껑을 여는 중", "두근두근…"]} />
              ) : (
                <Text style={styles.ceremonyStory}>
                  {failed ? "선물을 열지 못했어요. 인터넷을 확인하고 다시 눌러 주세요." : "상자를 눌러 열어 보세요"}
                </Text>
              )}
            </>
          ) : (
            <>
              <Animated.View style={[styles.ceremonyHero, { transform: [{ scale: pop }] }]}>
                {opened.kind === "stars" ? (
                  <Text style={styles.giftStars}>⭐ +{opened.amount}</Text>
                ) : (
                  <ItemThumb glyph={opened.glyph} size={120} />
                )}
              </Animated.View>
              <Text style={styles.ceremonyTitle}>{opened.kind === "stars" ? `별 ${opened.amount}개를 받았어요` : `${opened.name}이(가) 왔어요`}</Text>
              <Text style={styles.ceremonyStory}>
                {opened.kind === "stars" ? "별을 모아 별 상점에서 가구를 사거나 업그레이드해 보세요." : "내 방에 바로 놓아 뒀어요. 꾸미기에서 옮겨 둘 수 있어요."}
              </Text>
              <TouchableOpacity style={styles.ceremonyButton} onPress={onClose}>
                <Text style={styles.ceremonyButtonText}>고마워요!</Text>
              </TouchableOpacity>
            </>
          )}
          {!opened && (
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterText}>나중에 열기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  giftBox: { fontSize: 96, marginVertical: 14, textAlign: "center" },
  giftStars: { fontFamily: FONT_DISPLAY, fontSize: 40, color: COLORS.sunInk },
  laterButton: { marginTop: 12, padding: 6 },
  laterText: { fontSize: 13, fontWeight: "700", color: COLORS.muted },
  backdrop: { flex: 1, backgroundColor: "rgba(58,46,31,0.45)" },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "72%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 10 },
  sheetHead: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sheetTitle: { fontFamily: FONT_DISPLAY, fontSize: 21, color: COLORS.ink, flex: 1 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.tint, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 15, color: COLORS.ink },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tabChip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.tint },
  tabChipOn: { backgroundColor: COLORS.primary },
  tabChipText: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.primary },
  tabChipTextOn: { color: COLORS.white },
  sheetHint: { fontSize: 12, color: COLORS.muted, marginBottom: 10 },
  gridScroll: { flexGrow: 0 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, paddingBottom: 6 },
  cell: {
    width: "31.5%",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
  },
  cellOn: { borderColor: COLORS.primary, backgroundColor: COLORS.tint },
  cellLocked: { backgroundColor: COLORS.cream, borderColor: COLORS.cream },
  check: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },
  cellName: { fontSize: 12, fontWeight: "700", color: COLORS.ink, marginTop: 4, paddingHorizontal: 4 },
  cellHint: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  thumbBox: { alignItems: "center", justifyContent: "center" },
  listScroll: { flexGrow: 0 },
  shopSection: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.muted, marginTop: 10, marginBottom: 6 },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: COLORS.cream,
    padding: 10,
    marginBottom: 8,
  },
  shopText: { flex: 1, marginLeft: 10 },
  shopName: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.ink },
  shopPrice: { fontSize: 13, fontWeight: "700", color: COLORS.sunInk, marginTop: 2 },
  ownedText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  buyButton: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  buyButtonOff: { backgroundColor: COLORS.primarySoft },
  buyText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 14 },
  fine: { fontSize: 12, color: COLORS.muted, marginVertical: 12, textAlign: "center" },
  dexRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: COLORS.cream, padding: 10, marginBottom: 8 },
  dexRowLocked: { backgroundColor: COLORS.tint },
  dexTop: { flexDirection: "row", alignItems: "center" },
  // 줄바꿈 배치(flexWrap)에서 안드로이드가 뱃지 폭을 잘못 재 "일반" 글자가 잘렸다 — 줄바꿈 없이 고정 폭으로 둔다.
  dexBadge: { marginLeft: 8, flexShrink: 0 },
  dexStory: { fontSize: 13, color: COLORS.ink, marginTop: 3, lineHeight: 18 },
  dexDate: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  gradeBadge: { flexDirection: "row", alignItems: "center", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  gradeEmoji: { fontSize: 11, marginRight: 3 },
  gradeText: { fontSize: 11, fontWeight: "800" },
  ceremonyBackdrop: { flex: 1, backgroundColor: "rgba(58,46,31,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  ceremonyCard: { width: "100%", maxWidth: 420, backgroundColor: COLORS.white, borderRadius: 28, padding: 24, alignItems: "center" },
  ceremonyKicker: { fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.primary },
  ceremonyHero: {
    marginVertical: 14,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.sunSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  ceremonyTitle: { fontFamily: FONT_DISPLAY, fontSize: 25, color: COLORS.ink },
  ceremonyBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  ceremonyStory: { fontSize: 14, color: COLORS.muted, textAlign: "center", marginTop: 10, lineHeight: 20 },
  ceremonyButton: { marginTop: 18, alignSelf: "stretch", backgroundColor: COLORS.primary, borderRadius: 18, paddingVertical: 15, alignItems: "center" },
  ceremonyButtonText: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.white },
});

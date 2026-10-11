import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatKoreanDate } from "../lib/dateFormat";
import { GRADE_EMOJI, GRADE_LABEL, ROOM_IMAGES, swatchColors } from "../lib/roomAssets";
import type { RoomData, RoomShopItem } from "../types/room";
import { COLORS, FONT_DISPLAY } from "../theme";

const GRADE_TINT: Record<string, string> = { COMMON: COLORS.tint, RARE: COLORS.sky, EPIC: COLORS.sunSoft };
const GRADE_INK: Record<string, string> = { COMMON: COLORS.primary, RARE: COLORS.skyInk, EPIC: COLORS.sunInk };

/** 물건 그림 한 칸 — PNG가 있으면 그림, 벽지·바닥이면 색 견본, 아직 없으면 자물쇠. */
export function ItemThumb({ glyph, size, locked }: { glyph: string; size: number; locked?: boolean }) {
  if (locked) {
    return (
      <View style={[styles.thumbBox, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.45 }}>🔒</Text>
      </View>
    );
  }
  const swatch = swatchColors(glyph);
  if (swatch) {
    return (
      <View style={[styles.swatch, { width: size * 0.8, height: size * 0.8 }]}>
        <View style={[styles.swatchHalf, { backgroundColor: swatch[0] }]} />
        <View style={[styles.swatchHalf, { backgroundColor: swatch[1] }]} />
      </View>
    );
  }
  const src = ROOM_IMAGES[glyph];
  return (
    <View style={[styles.thumbBox, { width: size, height: size }]}>
      {src ? <Image source={src} style={{ width: size * 0.86, height: size * 0.86 }} resizeMode="contain" /> : null}
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

type DecoTab = "furn" | "prop" | "bg";
const DECO_TABS: { key: DecoTab; label: string }[] = [
  { key: "furn", label: "가구" },
  { key: "prop", label: "소품" },
  { key: "bg", label: "배경" },
];
const FURN_CODES = ["sofa", "table", "shelf"];
const PROP_CODES = ["lamp", "frame", "plant", "bowl", "yarn", "mood"];

type DecoCell = { key: string; name: string; glyph: string; owned: boolean; on: boolean; onPress: () => void; hint?: string };

/**
 * 꾸미기 — moa `DecoSheet`를 바탕으로 했다. 가구·소품은 **켜고 끄기**(여러 개를 함께 둔다), 러그·배경은 **하나 고르기**.
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
      hint: c.owned ? undefined : "준비한 날 와요",
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
      { key: "bed", name: "포근한 침대", glyph: "bed", owned: true, on: true, onPress: () => {} },
      ...FURN_CODES.map(collectibleCell),
    ];
  } else if (tab === "prop") {
    cells = PROP_CODES.map(collectibleCell);
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
        {tab === "furn" || tab === "prop" ? "눌러서 방에 두거나 치워요. 치워도 선물 모음에는 남아요." : "하나를 골라요. 잠긴 건 별 상점에서 데려와요."}
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
            <ItemThumb glyph={c.glyph} size={52} locked={!c.owned} />
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
                    <ItemThumb glyph={s.glyph} size={52} />
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
                <View style={[styles.gradeBadge, styles.dexBadge, { backgroundColor: c.owned ? GRADE_TINT[c.grade] : COLORS.white }]}>
                  <Text style={[styles.gradeText, { color: GRADE_INK[c.grade] }]}>
                    {GRADE_EMOJI[c.grade]} {GRADE_LABEL[c.grade]}
                  </Text>
                </View>
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
 * 도착 세리머니 — moa처럼 방에 들어왔을 때 띄운다. 받은 그 물건을 크게 보여 줘야 "무엇이 왔는지"가 남는다.
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
          <View style={[styles.gradeBadge, styles.ceremonyBadge, { backgroundColor: GRADE_TINT[ceremony.grade] }]}>
            <Text style={[styles.gradeText, { color: GRADE_INK[ceremony.grade] }]}>
              {GRADE_EMOJI[ceremony.grade]} {ceremony.name} · {GRADE_LABEL[ceremony.grade]}
            </Text>
          </View>
          <Text style={styles.ceremonyStory}>{ceremony.story}</Text>
          <TouchableOpacity style={styles.ceremonyButton} onPress={onClose}>
            <Text style={styles.ceremonyButtonText}>내 방에 두기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  swatch: { flexDirection: "row", borderRadius: 10, overflow: "hidden", margin: 5 },
  swatchHalf: { flex: 1 },
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
  gradeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
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

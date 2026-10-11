import React, { useEffect, useState } from "react";
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { COLORS, FONT_DISPLAY } from "../theme";

export type MainTab = "today" | "history" | "compose" | "talk" | "settings" | "room";

export const CAREGIVER_TABS: { key: MainTab; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "history", label: "지난 기록" },
  { key: "compose", label: "새 알림" },
  { key: "talk", label: "이야기" },
  { key: "settings", label: "설정" },
];

export const CHILD_TABS: { key: MainTab; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "talk", label: "이야기" },
  { key: "room", label: "내 방" },
];

function TabIcon({ tab, color }: { tab: MainTab; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2.2, fill: "none" } as const;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {tab === "today" && (
        <Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-9z" {...stroke} strokeLinejoin="round" />
      )}
      {tab === "history" && (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={3} {...stroke} />
          <Path d="M8 9h8M8 13h5" {...stroke} strokeLinecap="round" />
        </>
      )}
      {tab === "compose" && (
        <>
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M12 8v8M8 12h8" {...stroke} strokeLinecap="round" />
        </>
      )}
      {tab === "talk" && (
        <Path
          d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-4 3v-3H5a2 2 0 01-2-2V7a2 2 0 012-2z"
          {...stroke}
          strokeLinejoin="round"
        />
      )}
      {tab === "settings" && (
        <>
          <Circle cx={12} cy={12} r={3} {...stroke} />
          <Path
            d="M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6l1.4 1.4M6.3 17.7l1.4-1.4m8.6-8.6l1.4-1.4"
            {...stroke}
            strokeLinecap="round"
          />
        </>
      )}
      {tab === "room" && (
        <Path
          d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
          {...stroke}
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export default function BottomTabBar({
  tabs = CAREGIVER_TABS,
  active,
  onSelect,
}: {
  tabs?: { key: MainTab; label: string }[];
  active: MainTab;
  onSelect: (tab: MainTab) => void;
}) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // adjustResize라 키보드가 뜨면 탭바가 키보드 위로 올라와 입력창을 가린다.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View style={styles.bar}>
      {tabs.map(({ key, label }) => {
        const isActive = key === active;
        const color = isActive ? COLORS.primary : COLORS.primaryFaint;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <TabIcon tab={key} color={color} />
            </View>
            <Text style={[styles.label, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 66,
    backgroundColor: COLORS.white,
    borderTopWidth: 2,
    borderTopColor: COLORS.sunSoft,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 999,
  },
  iconWrapActive: {
    backgroundColor: COLORS.sunSoft,
  },
  label: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FONT_DISPLAY,
  },
});

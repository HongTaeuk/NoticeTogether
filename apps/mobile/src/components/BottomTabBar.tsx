import React, { useEffect, useState } from "react";
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type MainTab = "today" | "history" | "compose" | "settings";

const ACTIVE = "#1B64F2";
const INACTIVE = "#9DBEF7";

function TabIcon({ tab, color }: { tab: MainTab; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2, fill: "none" } as const;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {tab === "today" && (
        <Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-9z" {...stroke} strokeLinejoin="round" />
      )}
      {tab === "history" && (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={2} {...stroke} />
          <Path d="M8 9h8M8 13h5" {...stroke} strokeLinecap="round" />
        </>
      )}
      {tab === "compose" && (
        <>
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M12 8v8M8 12h8" {...stroke} strokeLinecap="round" />
        </>
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
    </Svg>
  );
}

const TABS: { key: MainTab; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "history", label: "지난 기록" },
  { key: "compose", label: "새 알림" },
  { key: "settings", label: "설정" },
];

export default function BottomTabBar({
  active,
  onSelect,
}: {
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
      {TABS.map(({ key, label }) => {
        const color = key === active ? ACTIVE : INACTIVE;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: key === active }}
            accessibilityLabel={label}
          >
            <TabIcon tab={key} color={color} />
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
    height: 60,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F8FF",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },
});

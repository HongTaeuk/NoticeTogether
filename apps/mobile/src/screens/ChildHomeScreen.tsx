import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import BottomTabBar, { CHILD_TABS, type MainTab } from "../components/BottomTabBar";
import type { Session } from "../lib/authStorage";
import { requestNotificationPermission } from "../lib/notificationPermission";
import { COLORS } from "../theme";
import ChildTodayScreen from "./ChildTodayScreen";
import FamilyTalkScreen from "./FamilyTalkScreen";
import MyRoomScreen from "./MyRoomScreen";

/**
 * 아이 계정의 홈. 양육자 화면(알림 등록·수정·설정)은 빼고, 아이가 직접 할 수 있는
 * "오늘 챙길 것 / 가족 이야기 / 내 방"만 둔다.
 */
export default function ChildHomeScreen({ session }: { session: Session }) {
  const [tab, setTab] = useState<MainTab>("today");
  const [talkNotice, setTalkNotice] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    // 아이 기기에도 "내일 체육복!" 같은 마감 알림이 가야 한다.
    requestNotificationPermission().catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {tab === "today" && (
          <ChildTodayScreen
            session={session}
            onOpenTalk={(id, label) => {
              setTalkNotice({ id, label });
              setTab("talk");
            }}
          />
        )}
        {tab === "talk" && (
          <FamilyTalkScreen
            session={session}
            noticeId={talkNotice?.id}
            noticeLabel={talkNotice?.label}
            onClearNotice={() => setTalkNotice(null)}
          />
        )}
        {tab === "room" && <MyRoomScreen session={session} />}
      </View>
      <BottomTabBar
        tabs={CHILD_TABS}
        active={tab}
        onSelect={(next) => {
          if (next === "talk") setTalkNotice(null);
          setTab(next);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { authFetch } from "../lib/apiClient";
import type { Session } from "../lib/authStorage";

type NoticeSummary = {
  id: string;
  summary: string | null;
  createdAt: string;
  totalItems: number;
  doneItems: number;
  nearestDueDate: string | null;
  hasOpened: boolean;
};

type Mode = "all" | "unread";

/**
 * PRD 정보구조(docs/06_prd.md Part 4)의 "지난 기록"/"새로 온 알림" 화면. 같은 목록을
 * 필터만 다르게 보여주는 것으로 구현한다(라벨링 원칙 4-3: "같은 기능을 다른 이름으로
 * 부르면 인지 부담이 생긴다" — 반대로 다른 화면이 같은 자료구조를 공유하는 것은 문제없다).
 * 백엔드 GET /api/notices는 이미 있었지만 지금까지 모바일에서 한 번도 쓰이지 않았다.
 */
export default function NoticeListScreen({
  session,
  mode,
  onSelectNotice,
  onComposeNew,
  onLogout,
  onManageHousehold,
  onViewToday,
}: {
  session: Session;
  mode: Mode;
  onSelectNotice: (id: string) => void;
  onComposeNew: () => void;
  onLogout: () => void;
  onManageHousehold: () => void;
  onViewToday: () => void;
}) {
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch(session.accessToken, "/api/notices");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "목록을 불러오지 못했습니다.");
      setNotices(data.notices as NoticeSummary[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleNotices = mode === "unread" ? notices.filter((n) => !n.hasOpened) : notices;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{mode === "unread" ? "새로 온 알림" : "지난 기록"}</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity onPress={onViewToday}>
          <Text style={styles.householdLinkText}>오늘 할 일로 돌아가기</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onManageHousehold}>
          <Text style={styles.householdLinkText}>배우자 초대 코드 관리</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.composeButton} onPress={onComposeNew}>
        <Text style={styles.composeButtonText}>+ 새 알림 작성하기</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={styles.loadingIndicator} color="#1B64F2" />
      ) : visibleNotices.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {mode === "unread" ? "새로 온 알림이 없어요." : "아직 등록된 알림이 없어요."}
          </Text>
          <Text style={styles.emptySubText}>
            {mode === "unread" ? "전부 확인했어요." : "위에서 첫 알림을 붙여넣어 보세요."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleNotices}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onSelectNotice(item.id)}>
              <View style={styles.cardTitleRow}>
                {!item.hasOpened && <View style={styles.unreadDot} />}
                <Text style={styles.cardSummary} numberOfLines={2}>
                  {item.summary ?? "(요약 없음)"}
                </Text>
              </View>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMeta}>
                  체크 {item.doneItems}/{item.totalItems}
                </Text>
                {item.nearestDueDate && (
                  <Text style={styles.cardDue}>가까운 기한 {item.nearestDueDate}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B1F4D",
  },
  logoutText: {
    fontSize: 12,
    color: "#F23B3B",
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  householdLinkText: {
    fontSize: 12,
    color: "#1B64F2",
    fontWeight: "600",
  },
  composeButton: {
    backgroundColor: "#1B64F2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  composeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: "#F23B3B",
    fontSize: 13,
    marginBottom: 10,
  },
  loadingIndicator: {
    marginTop: 40,
  },
  emptyBox: {
    marginTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0B1F4D",
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 13,
    color: "#3D5A9C",
  },
  card: {
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F23B3B",
    marginRight: 8,
    marginTop: 6,
  },
  cardSummary: {
    flex: 1,
    fontSize: 14,
    color: "#0B1F4D",
    lineHeight: 20,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMeta: {
    fontSize: 12,
    color: "#3D5A9C",
    fontWeight: "600",
  },
  cardDue: {
    fontSize: 12,
    color: "#F23B3B",
    fontWeight: "600",
  },
});

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

type NoticeSummary = {
  id: string;
  summary: string | null;
  createdAt: string;
  totalItems: number;
  doneItems: number;
  nearestDueDate: string | null;
  hasOpened: boolean;
  childId?: string | null;
  childName?: string | null;
};

type Child = { id: string; name: string };

type Mode = "all" | "unread";

/**
 * PRD 정보구조(docs/06_prd.md Part 4)의 "지난 기록"/"새로 온 알림" 화면. 같은 목록을
 * 필터만 다르게 보여주는 것으로 구현한다(라벨링 원칙 4-3: "같은 기능을 다른 이름으로
 * 부르면 인지 부담이 생긴다" — 반대로 다른 화면이 같은 자료구조를 공유하는 것은 문제없다).
 * 백엔드 GET /api/notices는 이미 있었지만 지금까지 모바일에서 한 번도 쓰이지 않았다.
 */
export default function NoticeListScreen({
  mode,
  onSelectNotice,
}: {
  mode: Mode;
  onSelectNotice: (id: string) => void;
}) {
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/api/notices");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "목록을 불러오지 못했습니다.");
      setNotices(data.notices as NoticeSummary[]);
      setChildren(data.children ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const modeFiltered = mode === "unread" ? notices.filter((n) => !n.hasOpened) : notices;
  const visibleNotices = selectedChildId
    ? modeFiltered.filter((n) => n.childId === selectedChildId)
    : modeFiltered;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === "unread" ? "새로 온 알림" : "지난 기록"}</Text>
      <Text style={styles.subtitle}>
        {mode === "unread" ? "아직 열어보지 않은 알림만 모았어요" : "지금까지 정리한 알림 전체 보기"}
      </Text>

      {children.length > 1 && (
        <View style={styles.childFilterRow}>
          <TouchableOpacity
            onPress={() => setSelectedChildId(null)}
            style={[styles.childChip, selectedChildId === null && styles.childChipSelected]}
          >
            <Text
              style={[styles.childChipText, selectedChildId === null && styles.childChipTextSelected]}
            >
              전체
            </Text>
          </TouchableOpacity>
          {children.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedChildId(c.id)}
              style={[styles.childChip, selectedChildId === c.id && styles.childChipSelected]}
            >
              <Text
                style={[
                  styles.childChipText,
                  selectedChildId === c.id && styles.childChipTextSelected,
                ]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1B64F2" />
          <Text style={styles.loadingText}>
            {mode === "unread" ? "새로 온 알림을 불러오는 중이에요" : "지난 알림을 불러오는 중이에요"}
          </Text>
        </View>
      ) : visibleNotices.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {mode === "unread" ? "새로 온 알림이 없어요." : "아직 등록된 알림이 없어요."}
          </Text>
          <Text style={styles.emptySubText}>
            {mode === "unread" ? "전부 확인했어요." : "아래 '새 알림'에서 첫 알림을 붙여넣어 보세요."}
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
                  {item.childName ? `[${item.childName}] ` : ""}
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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B1F4D",
  },
  subtitle: {
    fontSize: 13,
    color: "#3D5A9C",
    marginTop: 4,
    marginBottom: 16,
  },
  childFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  childChip: {
    borderWidth: 1,
    borderColor: "#1B64F2",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  childChipSelected: {
    backgroundColor: "#1B64F2",
  },
  childChipText: {
    color: "#1B64F2",
    fontSize: 12,
    fontWeight: "600",
  },
  childChipTextSelected: {
    color: "#FFFFFF",
  },
  errorText: {
    color: "#F23B3B",
    fontSize: 13,
    marginBottom: 10,
  },
  loadingBox: {
    marginTop: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#3D5A9C",
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
  // PRD 6-1: "미열람" 상태는 색상표에서 명시적으로 "경고색 금지, 중립 톤만" 대상이다.
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1B64F2",
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

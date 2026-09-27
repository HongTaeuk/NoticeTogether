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
};

/**
 * PRD 정보구조(docs/06_prd.md Part 4)의 "지난 기록" 화면. 백엔드 GET /api/notices는
 * 이미 있었지만 지금까지 모바일에서 한 번도 쓰이지 않았다 — 알림을 만든 그 화면에서만
 * 볼 수 있었고 지난 알림을 다시 찾아볼 방법이 없었다.
 */
export default function NoticeListScreen({
  session,
  onSelectNotice,
  onComposeNew,
  onLogout,
}: {
  session: Session;
  onSelectNotice: (id: string) => void;
  onComposeNew: () => void;
  onLogout: () => void;
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>지난 기록</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.composeButton} onPress={onComposeNew}>
        <Text style={styles.composeButtonText}>+ 새 알림 작성하기</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={styles.loadingIndicator} color="#1B64F2" />
      ) : notices.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>아직 등록된 알림이 없어요.</Text>
          <Text style={styles.emptySubText}>위에서 첫 알림을 붙여넣어 보세요.</Text>
        </View>
      ) : (
        <FlatList
          data={notices}
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
              <Text style={styles.cardSummary} numberOfLines={2}>
                {item.summary ?? "(요약 없음)"}
              </Text>
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
  cardSummary: {
    fontSize: 14,
    color: "#0B1F4D",
    marginBottom: 8,
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

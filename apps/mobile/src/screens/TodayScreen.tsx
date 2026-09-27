import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AnimatedCheckMark from "../components/AnimatedCheckMark";
import { authFetch } from "../lib/apiClient";
import { CATEGORY_COLOR, type ChecklistCategory } from "../types/notice";

type TodayItem = {
  id: string;
  notice_id: string;
  title: string;
  category: ChecklistCategory;
  due_date: string | null;
  is_done: boolean;
};

type PartnerActionType = "checked" | "unchecked" | "note" | "edited";

type PartnerAction = {
  displayName: string;
  action: PartnerActionType;
  note: string | null;
  itemTitle: string | null;
  createdAt: string;
};

type RecentPartnerAction = PartnerAction | null;

const ACTION_LABEL: Record<PartnerActionType, string> = {
  checked: "다 했다고 체크했어요",
  unchecked: "체크를 취소했어요",
  note: "한마디를 남겼어요",
  edited: "내용을 고쳤어요",
};

/**
 * PRD 4-2/4-5: "오늘 할 일"(홈). "지금 해야 할 것"(기한 임박, 체크 버튼 바로 옆) →
 * "누가 뭐 했는지"(배우자 최근 조치 한 줄) → "전체 목록 펼쳐보기"(접힘) 순서의 위계.
 * 지금까지는 이 화면 자체가 없어서 알림을 하나씩 열어야만 체크리스트를 볼 수 있었다.
 */
export default function TodayScreen({
  onOpenNotice,
  onComposeNew,
  onViewHistory,
  onViewUnread,
  onManageHousehold,
  accountLabel,
  onAccountPress,
}: {
  onOpenNotice: (noticeId: string) => void;
  onComposeNew: () => void;
  onViewHistory: () => void;
  onViewUnread: () => void;
  onManageHousehold: () => void;
  accountLabel: string;
  onAccountPress: () => void;
}) {
  const [urgentItems, setUrgentItems] = useState<TodayItem[]>([]);
  const [allItems, setAllItems] = useState<TodayItem[]>([]);
  const [recentPartnerAction, setRecentPartnerAction] = useState<RecentPartnerAction>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [doneItems, setDoneItems] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/api/today");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "불러오지 못했습니다.");
      setUrgentItems(data.urgentItems ?? []);
      setAllItems(data.allItems ?? []);
      setRecentPartnerAction(data.recentPartnerAction ?? null);
      setTotalItems(data.totalItems ?? 0);
      setDoneItems(data.doneItems ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDone(item: TodayItem) {
    const nextDone = !item.is_done;
    const apply = (list: TodayItem[]) =>
      list.map((i) => (i.id === item.id ? { ...i, is_done: nextDone } : i));
    setUrgentItems(apply);
    setAllItems(apply);
    setDoneItems((prev) => prev + (nextDone ? 1 : -1));
    try {
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDone: nextDone }),
      });
      if (!res.ok) throw new Error("체크 저장에 실패했습니다.");
    } catch (err) {
      const revert = (list: TodayItem[]) =>
        list.map((i) => (i.id === item.id ? { ...i, is_done: item.is_done } : i));
      setUrgentItems(revert);
      setAllItems(revert);
      setDoneItems((prev) => prev - (nextDone ? 1 : -1));
      setError(err instanceof Error ? err.message : "체크 저장에 실패했습니다.");
    }
  }

  const partnerLine = recentPartnerAction
    ? `${recentPartnerAction.displayName}님이 "${recentPartnerAction.itemTitle ?? ""}" ${ACTION_LABEL[recentPartnerAction.action]}`
    : null;

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
        <Text style={styles.title}>오늘 할 일</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity onPress={onViewUnread}>
          <Text style={styles.navLinkText}>새로 온 알림</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onViewHistory}>
          <Text style={styles.navLinkText}>지난 기록</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onManageHousehold}>
          <Text style={styles.navLinkText}>배우자 초대 코드</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.composeButton} onPress={onComposeNew}>
        <Text style={styles.composeButtonText}>+ 새 알림 작성하기</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1B64F2" />
          <Text style={styles.loadingText}>오늘 할 일을 정리하는 중이에요</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>지금 해야 할 것</Text>
          {urgentItems.length === 0 ? (
            <Text style={styles.emptyText}>기한이 임박한 항목이 없어요.</Text>
          ) : (
            urgentItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.urgentRow}
                onPress={() => onOpenNotice(item.notice_id)}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleDone(item);
                  }}
                  style={[styles.checkbox, item.is_done && styles.checkboxChecked]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {item.is_done && <AnimatedCheckMark style={styles.checkboxMark} />}
                </TouchableOpacity>
                <View
                  style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLOR[item.category] }]}
                >
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
                <View style={styles.urgentTextBox}>
                  <Text style={[styles.urgentTitle, item.is_done && styles.urgentTitleDone]}>
                    {item.title}
                  </Text>
                  {item.due_date && <Text style={styles.urgentDue}>{item.due_date}까지</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}

          {partnerLine && (
            <View style={styles.partnerBox}>
              <Text style={styles.sectionTitle}>누가 뭐 했는지</Text>
              <Text style={styles.partnerLineText}>{partnerLine}</Text>
            </View>
          )}

          <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.expandRow}>
            <Text style={styles.expandText}>
              {expanded ? "전체 목록 접기" : `전체 목록 펼쳐보기 (${doneItems}/${totalItems})`}
            </Text>
          </TouchableOpacity>

          {expanded && (
            <View>
              {allItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.urgentRow}
                  onPress={() => onOpenNotice(item.notice_id)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleDone(item);
                    }}
                    style={[styles.checkbox, item.is_done && styles.checkboxChecked]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {item.is_done && <AnimatedCheckMark style={styles.checkboxMark} />}
                  </TouchableOpacity>
                  <View
                    style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLOR[item.category] }]}
                  >
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  <View style={styles.urgentTextBox}>
                    <Text style={[styles.urgentTitle, item.is_done && styles.urgentTitleDone]}>
                      {item.title}
                    </Text>
                    {item.due_date && <Text style={styles.urgentDue}>{item.due_date}까지</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  navLinkText: {
    fontSize: 12,
    color: "#1B64F2",
    fontWeight: "600",
  },
  composeButton: {
    backgroundColor: "#1B64F2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20,
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
  loadingBox: {
    marginTop: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#3D5A9C",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B1F4D",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#3D5A9C",
    marginBottom: 16,
  },
  urgentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#1B64F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#1B64F2",
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  urgentTextBox: {
    flex: 1,
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B1F4D",
  },
  urgentTitleDone: {
    textDecorationLine: "line-through",
    color: "#7FA8F5",
  },
  urgentDue: {
    fontSize: 12,
    color: "#F23B3B",
    marginTop: 2,
  },
  partnerBox: {
    marginTop: 8,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F3F8FF",
  },
  partnerLineText: {
    fontSize: 13,
    color: "#0B1F4D",
  },
  expandRow: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 4,
  },
  expandText: {
    fontSize: 13,
    color: "#1B64F2",
    fontWeight: "600",
  },
});

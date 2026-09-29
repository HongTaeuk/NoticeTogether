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
import {
  cancelReminderForItem,
  getPersonalizedSchedule,
  resyncAllReminders,
  scheduleReminderForItem,
} from "../lib/reminderSync";
import { CATEGORY_COLOR, type ChecklistCategory } from "../types/notice";

type TodayItem = {
  id: string;
  notice_id: string;
  title: string;
  category: ChecklistCategory;
  due_date: string | null;
  is_done: boolean;
  childId?: string | null;
  childName?: string | null;
};

type Child = { id: string; name: string };

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
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

export default function TodayScreen({
  onOpenNotice,
  onComposeNew,
  onViewUnread,
  onManageHousehold,
}: {
  onOpenNotice: (noticeId: string) => void;
  onComposeNew: () => void;
  onViewUnread: () => void;
  onManageHousehold: () => void;
}) {
  const [urgentItems, setUrgentItems] = useState<TodayItem[]>([]);
  const [allItems, setAllItems] = useState<TodayItem[]>([]);
  const [recentPartnerAction, setRecentPartnerAction] = useState<RecentPartnerAction>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/api/today");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "불러오지 못했습니다.");
      setUrgentItems(data.urgentItems ?? []);
      setAllItems(data.allItems ?? []);
      setRecentPartnerAction(data.recentPartnerAction ?? null);
      setChildren(data.children ?? []);
      // 앱을 열 때마다 서버 기준으로 알림을 다시 맞춘다 — 배우자 기기, 재부팅,
      // 다른 기기에서의 체크/수정 전부 이 한 번의 재동기화로 반영된다.
      resyncAllReminders(data.allItems ?? []).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 해결검토 1번(다자녀 가정): 자녀가 2명 이상이면 그중 한 명 기준으로만 필터링해서 볼 수 있다.
  const filteredUrgentItems = selectedChildId
    ? urgentItems.filter((i) => i.childId === selectedChildId)
    : urgentItems;
  const filteredAllItems = selectedChildId
    ? allItems.filter((i) => i.childId === selectedChildId)
    : allItems;
  const totalItems = filteredAllItems.length;
  const doneItems = filteredAllItems.filter((i) => i.is_done).length;

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDone(item: TodayItem) {
    const nextDone = !item.is_done;
    const apply = (list: TodayItem[]) =>
      list.map((i) => (i.id === item.id ? { ...i, is_done: nextDone } : i));
    setUrgentItems(apply);
    setAllItems(apply);
    try {
      const res = await authFetch(`/api/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDone: nextDone }),
      });
      if (!res.ok) throw new Error("체크 저장에 실패했습니다.");
      if (nextDone) {
        await cancelReminderForItem(item.id);
      } else {
        const schedule = await getPersonalizedSchedule();
        await scheduleReminderForItem({ ...item, is_done: false }, schedule);
      }
    } catch (err) {
      const revert = (list: TodayItem[]) =>
        list.map((i) => (i.id === item.id ? { ...i, is_done: item.is_done } : i));
      setUrgentItems(revert);
      setAllItems(revert);
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
        <View>
          <Text style={styles.title}>오늘 할 일</Text>
          <Text style={styles.dateText}>{todayLabel()}</Text>
        </View>
        {!loading && totalItems > 0 && (
          <Text style={styles.progressText}>
            {doneItems}/{totalItems}
          </Text>
        )}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity onPress={onViewUnread}>
          <Text style={styles.navLinkText}>새로 온 알림</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onManageHousehold}>
          <Text style={styles.navLinkText}>배우자 초대</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.composeButton} onPress={onComposeNew}>
        <Text style={styles.composeButtonText}>+ 새 알림 작성하기</Text>
      </TouchableOpacity>

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
          <Text style={styles.loadingText}>오늘 할 일을 정리하는 중이에요</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>지금 해야 할 것</Text>
          {filteredUrgentItems.length === 0 ? (
            <Text style={styles.emptyText}>기한이 임박한 항목이 없어요.</Text>
          ) : (
            filteredUrgentItems.map((item) => (
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
              {filteredAllItems.map((item) => (
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
  dateText: {
    fontSize: 13,
    color: "#3D5A9C",
    marginTop: 2,
  },
  progressText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B64F2",
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

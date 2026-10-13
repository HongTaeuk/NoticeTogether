import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatMessageTime } from "../lib/dateFormat";
import { syncSchoolFeed } from "../lib/schoolFeed";
import { schoolSituation } from "../lib/schoolMessages";
import type { SchoolStatus } from "../types/school";
import { COLORS, FONT_DISPLAY } from "../theme";
import RunnerLoading from "./RunnerLoading";

/**
 * "오늘 할 일" 맨 위의 학교 소식 줄. 화면이 열릴 때(그리고 당겨서 새로고침할 때) 학교 게시판 새 글을 가져오고,
 * 새로 받은 게 있으면 부모 화면이 목록을 다시 읽게 한다. 무엇을 확인했는지·못 받는지를 숨기지 않는다(REPORT §8.3).
 * 처음처럼 오래 걸릴 때는 빙글빙글 대신 운동회 달리기(RunnerLoading)와 "N건 정리했어요" 진행 수를 보여 준다.
 */
export default function SchoolFeedCard({
  syncKey,
  onNewNotices,
  onManage,
}: {
  syncKey: number;
  onNewNotices: () => void;
  onManage: () => void;
}) {
  const [status, setStatus] = useState<SchoolStatus | null>(null);
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [progress, setProgress] = useState<{ delivered: number; pending: number } | null>(null);
  const [justDelivered, setJustDelivered] = useState(0);
  const onNewRef = useRef(onNewNotices);
  onNewRef.current = onNewNotices;

  useEffect(() => {
    let alive = true;
    setSyncing(true);
    setProgress(null);
    syncSchoolFeed((delivered, pending) => {
      if (!alive) return;
      setProgress({ delivered, pending });
      if (delivered > 0) onNewRef.current();
    })
      .then(({ status: s, offline: off }) => {
        if (!alive) return;
        setOffline(off);
        if (s) setStatus(s);
        const n = s?.delivered ?? 0;
        if (n > 0) setJustDelivered((prev) => prev + n);
      })
      .finally(() => alive && setSyncing(false));
    return () => {
      alive = false;
    };
  }, [syncKey]);

  // 처음 가져오는 동안(아직 아무 상태도 모를 때, 또는 정리할 글이 남아 있을 때)은 달리기 화면.
  const firstRun = syncing && (!status || (progress?.pending ?? 0) > 0);
  if (firstRun) {
    return (
      <View style={styles.card}>
        <RunnerLoading
          compact
          sub={progress && progress.delivered > 0 ? `벌써 ${progress.delivered}건 정리했어요` : "처음에는 1~2분 걸릴 수 있어요"}
        />
      </View>
    );
  }

  const situation = schoolSituation(status, { offline });
  if (offline && !status) {
    return (
      <View style={[styles.card, styles.cardInfo]}>
        <Text style={styles.title}>📶 {situation?.title}</Text>
        <Text style={[styles.body, styles.lineGap]}>{situation?.body}</Text>
      </View>
    );
  }
  if (!status || status.needsMigration) return null;

  if (!status.linked) {
    return (
      <TouchableOpacity style={[styles.card, styles.row]} onPress={onManage}>
        <Text style={styles.emoji}>🏫</Text>
        <Text style={styles.body}>학교를 연결하면 가정통신문을 알아서 가져와요</Text>
        <Text style={styles.link}>연결하기</Text>
      </TouchableOpacity>
    );
  }

  const name = status.school?.name ?? "우리 학교";
  let line: string;
  if (justDelivered > 0) line = `새 가정통신문 ${justDelivered}건을 정리했어요`;
  else if (syncing) line = "새 글을 확인하는 중이에요…";
  else line = `새 글 없음${status.lastCheckedAt ? ` · ${formatMessageTime(status.lastCheckedAt)} 확인` : ""}`;

  return (
    <TouchableOpacity
      style={[styles.card, justDelivered > 0 && styles.cardNew, situation?.tone === "warn" && styles.cardWarn]}
      onPress={onManage}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>🏫</Text>
        <Text style={styles.title} numberOfLines={1}>
          {name} 가정통신문
        </Text>
        {syncing && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>
      {situation ? (
        <>
          <Text style={[styles.situationTitle, styles.lineGap]}>{situation.title}</Text>
          <Text style={styles.muted}>{situation.body}</Text>
        </>
      ) : (
        <Text style={[styles.body, styles.lineGap]}>{line}</Text>
      )}
      {!situation && (status.pending ?? 0) > 0 && !syncing && (
        <Text style={styles.muted}>남은 {status.pending}건은 다음에 앱을 열 때 이어서 정리할게요.</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 오늘 할 일 화면의 본문 여백(20) 안에 들어가므로 좌우 여백은 따로 두지 않는다.
  card: {
    marginBottom: 14,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardNew: { borderColor: COLORS.sun, backgroundColor: COLORS.sunSoft },
  cardWarn: { borderColor: "#F7C89B", backgroundColor: COLORS.orangeSoft },
  cardInfo: { borderColor: COLORS.sky, backgroundColor: COLORS.sky },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  emoji: { fontSize: 20 },
  title: { flex: 1, fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.ink },
  situationTitle: { fontSize: 14, fontWeight: "800", color: COLORS.orangeInk },
  body: { flex: 1, fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  lineGap: { marginTop: 4 },
  link: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.primary },
  muted: { fontSize: 13, color: COLORS.muted, marginTop: 2, lineHeight: 19 },
});

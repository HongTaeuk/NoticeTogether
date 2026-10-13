import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT_DISPLAY } from "../theme";

/**
 * 기다리는 시간도 재미있게 — 서버를 기다리는 모든 곳에 빙글빙글 대신 상황에 맞는 작은 장면을 보여 준다.
 * 문구는 몇 초마다 바뀌어 "멈춘 게 아니라 하고 있다"를 알린다. (사용자 요청: 사소한 대기 시간까지 아이 친화적으로)
 *
 * 장면:
 * - run    🏃 운동회 달리기 — 학교 소식 가져오기·가족 연결처럼 오래 걸리는 일
 * - search 🔍 마을 지붕 위를 돋보기가 오가며 찾기 — 학교 찾기
 * - write  ✏️ 연필이 알림장에 한 줄씩 적기 — AI 정리
 * - blocks 🧱 블록 쌓기 — 내 방 꾸미기·불러오기
 * - mail   ✉️ 편지가 날아와 우체통에 쏙 — 알림·이야기 불러오기
 * - stars  ⭐ 별이 유리병에 톡톡 — 별 상점·선물
 */
export type Scene = "run" | "search" | "write" | "blocks" | "mail" | "stars";

const STEPS: Record<Scene, string[]> = {
  run: ["학교 게시판까지 달려가는 중!", "가정통신문을 한 장씩 읽는 중이에요", "핵심만 쏙쏙 골라 정리하는 중", "거의 다 왔어요, 조금만 기다려 주세요"],
  search: ["지도에서 학교를 찾고 있어요", "이름이 비슷한 학교를 살펴보는 중", "교육청 명단을 한 장씩 넘기는 중"],
  write: ["선생님 말씀을 꼼꼼히 읽는 중이에요", "준비물을 하나씩 골라 적는 중", "날짜와 기한을 확인하는 중", "체크리스트로 예쁘게 정리하는 중"],
  blocks: ["방을 정리하는 중이에요", "가구를 제자리에 놓는 중", "선물 상자를 확인하는 중"],
  mail: ["새 소식을 배달하는 중이에요", "우체통을 열어 보는 중", "편지를 차곡차곡 정리하는 중"],
  stars: ["별을 세는 중이에요", "반짝반짝 포장하는 중", "곧 도착해요!"],
};

function useLoop(duration: number, easing = Easing.inOut(Easing.quad)) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, duration, easing]);
  return v;
}

function Hop({ children, height = 6, period = 340 }: { children: React.ReactNode; height?: number; period?: number }) {
  const t = useLoop(period, Easing.linear);
  const translateY = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -height, 0] });
  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
}

const BUNTING = ["#F58F6B", "#FFD54A", "#5DBB7E", "#8FD0F5", "#F7A1B5"];

/**
 * 운동회 마당 — 위에는 만국기처럼 알록달록 깃발, 아래 점선 길을 따라 아이가 학교까지 달린다.
 * 반복해서 뛰지 않고 "진행 막대"처럼 움직인다: 기다리는 동안에는 학교에 가까워질수록 천천히(끝까지 닿지 않음),
 * 일이 끝나면(done) 남은 길을 단숨에 달려 학교에 도착한다 — 끝에서 제자리 뛰기만 오래 보이지 않게.
 */
function RunScene({ width, done, expectedMs, real }: { width: number; done: boolean; expectedMs: number; real?: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const now = useRef(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      now.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);
  useEffect(() => {
    if (done) {
      progress.stopAnimation();
      Animated.timing(progress, { toValue: 1, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: false }).start();
      return;
    }
    let run: Animated.CompositeAnimation;
    if (real === undefined) {
      // 진행률을 모를 때: 예상 시간 동안 85%까지 점점 느려지며 가고, 그 뒤로는 아주 천천히 95%까지.
      run = Animated.sequence([
        Animated.timing(progress, { toValue: 0.85, duration: expectedMs, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(progress, { toValue: 0.95, duration: expectedMs * 2, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]);
    } else {
      // 실제 진행률을 알 때(예: 12건 중 4건 정리): 그 지점까지 성큼 가고, 다음 소식까지는 조금씩 앞으로.
      const target = Math.max(now.current, Math.min(0.9, 0.08 + 0.82 * real));
      run = Animated.sequence([
        Animated.timing(progress, { toValue: target, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(progress, { toValue: Math.min(0.95, target + 0.1), duration: expectedMs, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]);
    }
    run.start();
    return () => run.stop();
  }, [done, expectedMs, real, progress]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, width - 88)] });
  const flags = Math.max(6, Math.floor(width / 26));
  return (
    <View style={[styles.stage, styles.field]}>
      <View style={styles.buntingLine} />
      <View style={styles.bunting}>
        {Array.from({ length: flags }, (_, i) => (
          <View key={i} style={[styles.flag, { borderTopColor: BUNTING[i % BUNTING.length] }]} />
        ))}
      </View>
      <View style={styles.path} />
      <Text style={styles.goal}>{done ? "🎉" : "🏫"}</Text>
      <Animated.View style={[styles.runnerSpot, { transform: [{ translateX }] }]}>
        <Hop height={done ? 10 : 7} period={done ? 200 : 360}>
          <Text style={[styles.big, styles.flip]}>🏃</Text>
        </Hop>
      </Animated.View>
    </View>
  );
}

function SearchScene({ width }: { width: number }) {
  const t = useLoop(2400);
  const translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.max(0, width - 60), 0] });
  return (
    <View style={[styles.stage, styles.town]}>
      <View style={styles.houses}>
        {["🏠", "🏫", "🏡", "🏠", "🏫", "🏡"].map((e, i) => (
          <Text key={i} style={styles.house}>
            {e}
          </Text>
        ))}
      </View>
      <Animated.View style={[styles.mover, styles.lensWrap, { transform: [{ translateX }] }]}>
        <Hop height={4} period={500}>
          <Text style={styles.big}>🔍</Text>
        </Hop>
      </Animated.View>
    </View>
  );
}

function WriteScene({ width }: { width: number }) {
  const t = useLoop(3000, Easing.linear);
  const lineW = Math.max(40, width - 90);
  // 세 줄이 차례로 적히고(0~0.33, 0.33~0.66, 0.66~1) 연필은 지금 적는 줄을 따라간다.
  const lines = [0, 1, 2].map((i) =>
    t.interpolate({ inputRange: [i / 3, (i + 1) / 3, 1], outputRange: [0, 1, 1], extrapolate: "clamp" }),
  );
  const pencilX = t.interpolate({ inputRange: [0, 1 / 3, 1 / 3 + 0.001, 2 / 3, 2 / 3 + 0.001, 1], outputRange: [0, lineW, 0, lineW, 0, lineW * 0.7] });
  const pencilY = t.interpolate({ inputRange: [0, 1 / 3, 1 / 3 + 0.001, 2 / 3, 2 / 3 + 0.001, 1], outputRange: [0, 0, 12, 12, 24, 24] });
  return (
    <View style={[styles.stage, styles.notebook]}>
      <View style={styles.binding} />
      <View style={styles.lines}>
        {lines.map((p, i) => (
          <View key={i} style={[styles.lineSlot, { width: lineW }]}>
            <Animated.View style={[styles.ink, { width: lineW, transform: [{ translateX: -lineW / 2 }, { scaleX: p }, { translateX: lineW / 2 }] }]} />
          </View>
        ))}
      </View>
      <Animated.View style={[styles.pencil, { transform: [{ translateX: pencilX }, { translateY: pencilY }] }]}>
        <Text style={styles.mid}>✏️</Text>
      </Animated.View>
    </View>
  );
}

function BlocksScene() {
  const t = useLoop(2400, Easing.out(Easing.quad));
  const drop = (i: number) =>
    t.interpolate({ inputRange: [i * 0.25, i * 0.25 + 0.2, 1], outputRange: [-46, 0, 0], extrapolate: "clamp" });
  const fade = (i: number) => t.interpolate({ inputRange: [0, i * 0.25, i * 0.25 + 0.01, 0.95, 1], outputRange: [0, 0, 1, 1, 0] });
  const colors = [COLORS.sun, "#8FD0F5", "#F58F6B"];
  return (
    <View style={[styles.stage, styles.blocksStage]}>
      <View style={styles.blockColumn}>
        {[2, 1, 0].map((i) => (
          <Animated.View
            key={i}
            style={[styles.block, { backgroundColor: colors[i], opacity: fade(i), transform: [{ translateY: drop(i) }] }]}
          />
        ))}
      </View>
      <Text style={styles.sideEmoji}>🏠</Text>
    </View>
  );
}

function MailScene({ width }: { width: number }) {
  const t = useLoop(2200);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, width - 96)] });
  const translateY = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, -10, 6] });
  const scale = t.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0.4] });
  return (
    <View style={[styles.stage, styles.sky]}>
      <Text style={styles.cloud}>☁️</Text>
      <Animated.View style={[styles.mover, { transform: [{ translateX }, { translateY }, { scale }] }]}>
        <Text style={styles.big}>✉️</Text>
      </Animated.View>
      <Text style={styles.endEmoji}>📮</Text>
    </View>
  );
}

function StarsScene() {
  const t = useLoop(1800, Easing.in(Easing.quad));
  const fall = (i: number) =>
    t.interpolate({ inputRange: [0, (i * 0.2), (i * 0.2) + 0.45, 1], outputRange: [-34, -34, 4, 4], extrapolate: "clamp" });
  const fade = (i: number) => t.interpolate({ inputRange: [0, i * 0.2, i * 0.2 + 0.4, i * 0.2 + 0.5, 1], outputRange: [0, 1, 1, 0, 0], extrapolate: "clamp" });
  return (
    <View style={[styles.stage, styles.starStage]}>
      {[0, 1, 2].map((i) => (
        <Animated.Text key={i} style={[styles.fallingStar, { left: `${40 + i * 8}%`, opacity: fade(i), transform: [{ translateY: fall(i) }] }]}>
          ⭐
        </Animated.Text>
      ))}
      <Text style={styles.jar}>🫙</Text>
    </View>
  );
}

export default function FunLoading({
  scene = "run",
  steps,
  sub,
  compact = false,
  done = false,
  expectedMs = 12000,
  progress,
}: {
  /** 실제 진행률(0~1)을 알면 달리기가 그만큼 간다(로딩 막대처럼). */
  progress?: number;
  scene?: Scene;
  steps?: string[];
  sub?: string | null;
  compact?: boolean;
  /** 일이 끝났음 — 달리기 장면은 남은 길을 단숨에 달려 도착한다(부모가 잠깐 더 보여 줄 때). */
  done?: boolean;
  /** 이 일이 보통 걸리는 시간 — 달리기 속도를 맞춘다. */
  expectedMs?: number;
}) {
  const lines = done ? ["도착했어요! 🎉"] : (steps ?? STEPS[scene]);
  const [width, setWidth] = useState(0);
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setStep((s) => (s + 1) % lines.length);
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(t);
  }, [lines.length, fade]);

  return (
    <View style={[styles.box, compact && styles.boxCompact]} accessibilityRole="progressbar" accessibilityLabel={lines[step]}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 &&
          (scene === "run" ? (
            <RunScene width={width} done={done} expectedMs={expectedMs} real={progress} />
          ) : scene === "search" ? (
            <SearchScene width={width} />
          ) : scene === "write" ? (
            <WriteScene width={width} />
          ) : scene === "blocks" ? (
            <BlocksScene />
          ) : scene === "mail" ? (
            <MailScene width={width} />
          ) : (
            <StarsScene />
          ))}
        {width === 0 && <View style={styles.stage} />}
      </View>
      <Animated.Text style={[styles.message, compact && styles.messageCompact, { opacity: fade }]}>{lines[step % lines.length]}</Animated.Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

/** 표 한 칸처럼 아주 작은 자리용 — 통통 튀는 점 세 개. */
export function BouncingDots({ color = COLORS.primary }: { color?: string }) {
  const t = useLoop(900, Easing.linear);
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => {
        const translateY = t.interpolate({
          inputRange: [0, (i * 0.2), (i * 0.2) + 0.15, (i * 0.2) + 0.3, 1],
          outputRange: [0, 0, -5, 0, 0],
          extrapolate: "clamp",
        });
        return <Animated.View key={i} style={[styles.dot, { backgroundColor: color, transform: [{ translateY }] }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "stretch", paddingVertical: 12 },
  boxCompact: { paddingVertical: 4 },
  stage: { height: 52, borderRadius: 14, overflow: "hidden", justifyContent: "center" },
  stageTall: { height: 60 },
  field: { height: 62, backgroundColor: COLORS.tint },
  buntingLine: { position: "absolute", left: 0, right: 0, top: 5, height: 1, backgroundColor: "#C9B48F" },
  bunting: { position: "absolute", left: 4, right: 4, top: 5, flexDirection: "row", justifyContent: "space-between" },
  flag: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent" },
  path: { position: "absolute", left: 10, right: 44, bottom: 9, borderBottomWidth: 2, borderStyle: "dashed", borderColor: "#B9DFC5" },
  goal: { position: "absolute", right: 8, bottom: 6, fontSize: 26 },
  runnerSpot: { position: "absolute", left: 8, bottom: 8 },
  town: { backgroundColor: COLORS.sky },
  houses: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", position: "absolute", left: 0, right: 0, bottom: 4 },
  house: { fontSize: 20 },
  lensWrap: { top: 2 },
  notebook: { backgroundColor: COLORS.cream, paddingLeft: 30, justifyContent: "center" },
  binding: { position: "absolute", left: 10, top: 6, bottom: 6, width: 4, borderRadius: 2, backgroundColor: "#F7A1B5" },
  lines: { gap: 9 },
  lineSlot: { height: 3, borderRadius: 2, backgroundColor: COLORS.tint, overflow: "hidden" },
  ink: { height: 3, borderRadius: 2, backgroundColor: COLORS.primary },
  pencil: { position: "absolute", left: 26, top: 2 },
  blocksStage: { backgroundColor: COLORS.sunSoft, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 18 },
  blockColumn: { alignItems: "center", justifyContent: "flex-end", height: 48, paddingBottom: 3 },
  block: { width: 22, height: 13, borderRadius: 3, borderWidth: 1.5, borderColor: "#6B4A2B", marginTop: 1 },
  sideEmoji: { fontSize: 26 },
  sky: { backgroundColor: "#E3F3FF" },
  cloud: { position: "absolute", left: "40%", top: 2, fontSize: 18, opacity: 0.7 },
  starStage: { backgroundColor: "#FFF4C7", alignItems: "center", justifyContent: "flex-end" },
  fallingStar: { position: "absolute", top: 10, fontSize: 16 },
  jar: { fontSize: 28, marginBottom: 2 },
  mover: { position: "absolute", left: 6 },
  endEmoji: { position: "absolute", right: 8, fontSize: 24 },
  row: { flexDirection: "row", alignItems: "flex-end" },
  big: { fontSize: 28 },
  mid: { fontSize: 20 },
  small: { fontSize: 14, marginRight: -4, opacity: 0.7 },
  flip: { transform: [{ scaleX: -1 }] },
  message: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.ink, textAlign: "center", marginTop: 10 },
  messageCompact: { fontSize: 15, marginTop: 8 },
  sub: { fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 4 },
  dots: { flexDirection: "row", gap: 4, alignItems: "center", height: 14, paddingTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

/**
 * 로딩이 끝난 뒤에도 잠깐(달리기 도착 연출 동안) 로딩 화면을 남겨 두는 도우미.
 * 사용: const show = useLingeringLoading(loading); {show && <FunLoading done={!loading} ... />}
 */
export function useLingeringLoading(loading: boolean, lingerMs = 700): boolean {
  const [show, setShow] = useState(loading);
  useEffect(() => {
    if (loading) {
      setShow(true);
      return;
    }
    const t = setTimeout(() => setShow(false), lingerMs);
    return () => clearTimeout(t);
  }, [loading, lingerMs]);
  return show;
}

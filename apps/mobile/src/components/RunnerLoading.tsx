import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT_DISPLAY } from "../theme";

/**
 * 운동회 달리기 로딩 — 학교 소식을 처음 가져올 때처럼 수십 초 걸리는 일을 빙글빙글 표시 대신
 * 운동장 트랙을 달리는 아이로 보여 준다. 문구도 몇 초마다 바뀌어 "멈춘 게 아니라 하고 있다"를 알린다.
 */
const DEFAULT_STEPS = ["학교 게시판까지 달려가는 중!", "가정통신문을 한 장씩 읽는 중이에요", "핵심만 쏙쏙 골라 정리하는 중", "거의 다 왔어요, 조금만 기다려 주세요"];

export default function RunnerLoading({
  steps = DEFAULT_STEPS,
  sub,
  compact = false,
}: {
  steps?: string[];
  sub?: string | null;
  compact?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [step, setStep] = useState(0);
  const run = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(run, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    bounce.start();
    return () => {
      loop.stop();
      bounce.stop();
    };
  }, [run, hop]);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % steps.length), 3200);
    return () => clearInterval(t);
  }, [steps.length]);

  const runner = 34;
  const translateX = run.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, width - runner - 28)] });
  const translateY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={[styles.box, compact && styles.boxCompact]}>
      <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.lane} />
        <View style={[styles.lane, styles.laneLow]} />
        <Text style={styles.flag}>🏁</Text>
        {width > 0 && (
          <Animated.View style={[styles.runnerWrap, { transform: [{ translateX }, { translateY }] }]}>
            <Text style={styles.dust}>💨</Text>
            {/* 🏃 이모지는 왼쪽을 보고 달려서 좌우를 뒤집어 결승선 쪽으로 달리게 한다. */}
            <Text style={[styles.runner, { transform: [{ scaleX: -1 }] }]}>🏃</Text>
          </Animated.View>
        )}
      </View>
      <Text style={[styles.message, compact && styles.messageCompact]}>{steps[step]}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "stretch", paddingVertical: 12 },
  boxCompact: { paddingVertical: 4 },
  track: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F7D7B0",
    borderWidth: 2,
    borderColor: "#E8B983",
    overflow: "hidden",
    justifyContent: "center",
  },
  lane: { position: "absolute", left: 0, right: 0, top: 14, height: 2, backgroundColor: COLORS.white, opacity: 0.8 },
  laneLow: { top: 30 },
  flag: { position: "absolute", right: 6, fontSize: 22 },
  runnerWrap: { position: "absolute", left: 4, flexDirection: "row", alignItems: "flex-end" },
  runner: { fontSize: 28 },
  dust: { fontSize: 14, marginRight: -4, opacity: 0.7 },
  message: { fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.ink, textAlign: "center", marginTop: 10 },
  messageCompact: { fontSize: 15, marginTop: 8 },
  sub: { fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 4 },
});

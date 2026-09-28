import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Slide = {
  emoji: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "🔔",
    title: "휴대폰 알림창에서\n미리보기만 봐도\n확인한 게 안 돼요",
    subtitle: "앱을 열어서 봐야 확인돼요.",
  },
  {
    emoji: "✨",
    title: "긴 알림문도\n핵심만 뽑아드려요",
    subtitle: "원문이 궁금하면 언제든 '학교에서 온 그대로 보기'로 대조해볼 수 있어요.",
  },
  {
    emoji: "🤝",
    title: "배우자와 함께\n확인하고 나눠 맡아요",
    subtitle: "누가 뭘 했는지 서로 볼 수 있어서, 같은 걸 두 번 챙기거나 놓치는 일이 줄어요.",
  },
];

/**
 * PRD 5-4(온보딩) — 카카오톡 습관("미리보기만 봐도 확인한 셈")과 다르다는 것을
 * 최초 1회 학습시키는 게 핵심(슬라이드 1). 여기에 이 앱의 나머지 핵심 가치(AI 요약+원문
 * 대조, 공동확인)를 짧게 더 보여줘서 첫 화면에서부터 무엇을 하는 앱인지 감을 잡게 한다.
 */
export default function OnboardingIntroScreen({ onNext }: { onNext: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  function handlePress() {
    if (isLast) {
      onNext();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{slide.emoji}</Text>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.subtitle}>{slide.subtitle}</Text>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>{isLast ? "알겠어요" : "다음"}</Text>
      </TouchableOpacity>

      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={onNext}>
          <Text style={styles.skipButtonText}>건너뛰기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B1F4D",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#3D5A9C",
    textAlign: "center",
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: "row",
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C7DBFB",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#1B64F2",
    width: 20,
  },
  button: {
    backgroundColor: "#1B64F2",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
  },
  skipButtonText: {
    color: "#3D5A9C",
    fontSize: 13,
    fontWeight: "600",
  },
});

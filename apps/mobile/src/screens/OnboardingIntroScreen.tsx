import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT_DISPLAY } from "../theme";

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
    emoji: "👨‍👩‍👧‍👦",
    title: "양육자와 아이가\n한 가족으로 함께 봐요",
    subtitle: "엄마·아빠·조부모 누구든, 아이까지 초대 코드 하나로 연결돼요. 가입은 필요 없어요.",
  },
  {
    emoji: "💬",
    title: "알림장 결과를 두고\n아이와 이야기 나눠요",
    subtitle: "아이가 챙기면 별을 받고 '내 방'을 꾸며요. 양육자는 아이를 위해 한 일을 나눌 수 있어요.",
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
    backgroundColor: COLORS.cream,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 27,
    fontFamily: FONT_DISPLAY,
    color: "#3A2E1F",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#7A5F33",
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
    backgroundColor: "#CFE8D6",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#13854A",
    width: 20,
  },
  button: {
    backgroundColor: "#13854A",
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 56,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontFamily: FONT_DISPLAY,
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
  },
  skipButtonText: {
    color: "#7A5F33",
    fontSize: 13,
    fontWeight: "600",
  },
});

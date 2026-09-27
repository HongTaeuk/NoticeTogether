import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * PRD 5-4(온보딩) 안내 화면 1. 카카오톡 습관("미리보기만 봐도 확인한 셈")과
 * 다르다는 것을 최초 1회 명시적으로 학습시킨다 — 5-3의 성공 정의(배너만으론
 * notice_opened가 발생하지 않음)를 사용자가 오해하지 않도록 하기 위함.
 */
export default function OnboardingIntroScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔔</Text>
      <Text style={styles.title}>휴대폰 알림창에서{"\n"}미리보기만 봐도{"\n"}확인한 게 안 돼요</Text>
      <Text style={styles.subtitle}>앱을 열어서 봐야 확인돼요.</Text>

      <TouchableOpacity style={styles.button} onPress={onNext}>
        <Text style={styles.buttonText}>알겠어요</Text>
      </TouchableOpacity>
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
    marginBottom: 36,
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
});

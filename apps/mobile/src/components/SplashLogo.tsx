import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

/**
 * 로딩 공백을 메우기 위한 스플래시. 흰 배경에서 로고가 서서히 페이드인된다.
 * 실제 로딩(세션 복원/익명 세션 생성)이 끝나면 App.tsx가 이 컴포넌트를 즉시
 * 내려버리므로, 로딩이 빠르면 페이드인이 끝나기도 전에 순식간에 사라지고
 * (거의 안 보임), 로딩이 느리면 다 페이드인된 로고가 그대로 대기 화면 역할을 한다 —
 * 별도의 "느리면 대기, 빠르면 생략" 분기 로직 없이 애니메이션 자체가 그 역할을 한다.
 */
export default function SplashLogo() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/logo.png")}
        style={[styles.logo, { opacity }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 120,
    height: 120,
  },
});

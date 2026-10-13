import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { COLORS } from "../theme";
import FunLoading from "./FunLoading";

/**
 * 앱을 켤 때의 첫 화면. 로고가 서서히 나타나며 통통 튄다. 로딩이 빠르면 App.tsx가 바로 내려서 거의 안 보이고,
 * 1초 넘게 걸리면(처음 실행 때 계정·가정 만들기 등) 아래에 기다리는 장면과 바뀌는 문구를 함께 보여 준다.
 */
export default function SplashLogo() {
  const opacity = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const t = setTimeout(() => setSlow(true), 1100);
    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [opacity, bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/logo.png")}
        style={[styles.logo, { opacity, transform: [{ translateY }] }]}
        resizeMode="contain"
      />
      {slow && (
        <View style={styles.wait}>
          <FunLoading scene="stars" compact steps={["함께알림을 준비하는 중이에요", "우리 가족 공간을 만드는 중", "거의 다 됐어요"]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cream,
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
  },
  wait: { alignSelf: "stretch", marginTop: 28 },
});

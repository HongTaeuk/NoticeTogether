import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * PRD 6-2 `ActionCheckItem`: "완료(체크 애니메이션)" 상태. 항목을 체크하면 체크
 * 표시가 톡 튀어나오듯 나타나야 한다는 요구를 만족시키기 위한 최소 단위 컴포넌트.
 * `is_done && <AnimatedCheckMark />` 형태로만 쓰여서 기존 체크박스 레이아웃/터치
 * 영역 코드는 전혀 건드리지 않는다 — 나타날 때마다(mount) 팝인 애니메이션만 재생.
 */
export default function AnimatedCheckMark({ style }: { style: object }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return <Animated.Text style={[style, { transform: [{ scale }] }]}>✓</Animated.Text>;
}

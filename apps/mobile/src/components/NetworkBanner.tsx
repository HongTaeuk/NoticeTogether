import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";

/**
 * PRD 5-5(네트워크 끊김, 모든 화면 공통 예외): "인터넷 연결을 확인해 주세요" 배너를
 * 화면 상단에 고정 표시한다. 서버(Supabase)가 단일 장애점이라, 끊긴 순간에도
 * 사용자가 지금 왜 반응이 없는지 바로 알 수 있어야 신뢰가 깨지지 않는다.
 */
export default function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <Text style={styles.banner}>인터넷 연결을 확인해 주세요</Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#F23B3B",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 6,
  },
});

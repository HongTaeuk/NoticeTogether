import React, { useState } from "react";
import { Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { authFetch } from "../lib/apiClient";
import type { Session } from "../lib/authStorage";

type Props = {
  session: Session;
  onJoined: (update: Partial<Session>) => void;
  onContinue: () => void;
};

/**
 * PRD 5-4(온보딩 안내 화면 2) + 5-2 분기 5(배우자가 아직 초대되지 않은 상태):
 * "배우자를 초대하면 서로 뭘 챙겼는지 볼 수 있어요" + 지금 초대하기 / 나중에 하기.
 * 코드가 유효하지 않으면(분기 6) 에러만 보여주고 입력창은 그대로 유지한다.
 */
export default function HouseholdSetupScreen({ session, onJoined, onContinue }: Props) {
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    try {
      await Share.share({
        message: `함께알림에서 같이 확인해요! 초대 코드: ${session.inviteCode}`,
      });
    } catch {
      // 공유 시트 취소 등은 무시한다.
    }
  }

  async function handleJoin() {
    const code = inviteCodeInput.trim();
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      const res = await authFetch("/api/auth/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "이 코드는 사용할 수 없어요. 코드를 다시 확인해 주세요.");
      }
      setInviteCodeInput("");
      onJoined({ householdId: data.household.id, inviteCode: data.household.inviteCode, role: data.role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "이 코드는 사용할 수 없어요. 코드를 다시 확인해 주세요.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>아직 함께 볼 사람이 없어요</Text>
      <Text style={styles.subtitle}>배우자를 초대하면 서로 뭘 챙겼는지 볼 수 있어요.</Text>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>내 초대 코드</Text>
        <Text style={styles.codeValue}>{session.inviteCode}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>초대 코드 공유하기</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.orText}>또는, 상대방이 보낸 코드를 입력하세요</Text>
      <TextInput
        style={styles.input}
        placeholder="초대 코드 입력"
        placeholderTextColor="#9DBEF7"
        autoCapitalize="characters"
        value={inviteCodeInput}
        onChangeText={setInviteCodeInput}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity
        style={[styles.button, (!inviteCodeInput.trim() || joining) && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={!inviteCodeInput.trim() || joining}
      >
        <Text style={styles.buttonText}>{joining ? "연결하는 중..." : "지금 초대하기"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.laterButton} onPress={onContinue}>
        <Text style={styles.laterButtonText}>나중에 하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B1F4D",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#3D5A9C",
    textAlign: "center",
    marginBottom: 28,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#F3F8FF",
  },
  codeLabel: {
    fontSize: 12,
    color: "#3D5A9C",
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1B64F2",
    letterSpacing: 4,
    marginBottom: 12,
  },
  shareButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1B64F2",
  },
  shareButtonText: {
    color: "#1B64F2",
    fontSize: 13,
    fontWeight: "700",
  },
  orText: {
    fontSize: 13,
    color: "#3D5A9C",
    textAlign: "center",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0B1F4D",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 2,
  },
  errorText: {
    color: "#F23B3B",
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#1B64F2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#9DBEF7",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  laterButton: {
    marginTop: 16,
    alignItems: "center",
  },
  laterButtonText: {
    color: "#3D5A9C",
    fontSize: 13,
    fontWeight: "600",
  },
});

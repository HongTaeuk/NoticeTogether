import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../config/api";
import type { Session } from "../lib/authStorage";

type Mode = "login" | "signup";

export default function AuthScreen({
  onAuthed,
}: {
  onAuthed: (session: Session, isNewSignup: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? { email: email.trim(), password, displayName: displayName.trim() || undefined }
            : { email: email.trim(), password },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "요청에 실패했습니다.");
      }
      onAuthed(
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          userId: data.user.id,
          role: data.user.role,
          displayName: data.user.displayName ?? null,
          householdId: data.household.id,
          inviteCode: data.household.inviteCode,
        },
        mode === "signup",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>NoticeTogether</Text>
      <Text style={styles.subtitle}>
        {mode === "signup" ? "가입하고 우리 가정을 만들어보세요" : "다시 로그인하기"}
      </Text>

      {mode === "signup" && (
        <TextInput
          style={styles.input}
          placeholder="이름 (선택)"
          placeholderTextColor="#9DBEF7"
          value={displayName}
          onChangeText={setDisplayName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor="#9DBEF7"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (8자 이상)"
        placeholderTextColor="#9DBEF7"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {mode === "signup" ? "가정을 만드는 중이에요" : "로그인하는 중이에요"}
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>{mode === "signup" ? "가입하기" : "로그인"}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchModeButton}
        onPress={() => {
          setMode((m) => (m === "signup" ? "login" : "signup"));
          setError(null);
        }}
      >
        <Text style={styles.switchModeText}>
          {mode === "signup" ? "이미 계정이 있어요 · 로그인" : "처음이에요 · 가입하기"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  logo: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1B64F2",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#3D5A9C",
    textAlign: "center",
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0B1F4D",
    marginBottom: 10,
    backgroundColor: "#F3F8FF",
  },
  errorText: {
    color: "#F23B3B",
    fontSize: 13,
    marginBottom: 10,
  },
  button: {
    marginTop: 6,
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
  switchModeButton: {
    marginTop: 18,
    alignItems: "center",
  },
  switchModeText: {
    color: "#1B64F2",
    fontSize: 13,
    fontWeight: "600",
  },
});

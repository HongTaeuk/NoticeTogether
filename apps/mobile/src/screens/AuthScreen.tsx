import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GOOGLE_WEB_CLIENT_ID } from "../config/api";
import { authFetch } from "../lib/apiClient";
import type { Session } from "../lib/authStorage";

type Mode = "login" | "signup";

/**
 * 가입은 더 이상 필수가 아니다(App.tsx가 앱을 처음 열면 자동으로 익명 계정을 만들어
 * 바로 쓸 수 있게 한다). 이 화면은 "계정 만들기"(익명 계정을 그 자리에서 정식 계정으로
 * 승격 — 데이터 유지) 또는 "로그인"(다른 기기에서 만든 기존 계정으로 전환)을 위해서만
 * 필요할 때 들어온다.
 */
export default function AuthScreen({
  isUpgrade,
  onAuthed,
  onBack,
}: {
  isUpgrade: boolean;
  onAuthed: (session: Session, isNewSignup: boolean) => void;
  onBack?: () => void;
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
      const body = JSON.stringify(
        mode === "signup"
          ? { email: email.trim(), password, displayName: displayName.trim() || undefined }
          : { email: email.trim(), password },
      );

      // 승격(익명 → 정식 계정)은 현재 세션 토큰이 필요하니 authFetch를,
      // 로그인은 아직 그 계정으로 인증되지 않았으니 토큰 없는 일반 fetch를 쓴다.
      const res =
        mode === "signup" && isUpgrade
          ? await authFetch("/api/auth/upgrade", { method: "POST", body })
          : await rawFetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", body);

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
          isAnonymous: false,
        },
        mode === "signup",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    if (!GOOGLE_WEB_CLIENT_ID) {
      setError("Google 로그인은 아직 설정 중이에요. 이메일로 가입해주세요.");
      return;
    }
    // 신뢰 원칙: Google 로그인은 지금 쓰던 익명 계정을 "승격"하는 게 아니라 완전히
    // 다른 계정으로 전환하는 것이라, 지금까지 쌓인 알림/체크리스트가 안 이어진다
    // (docs/process.md 2026-09-28 기록). 이 사실을 모른 채 데이터를 잃으면 신뢰가
    // 깨지므로, 실행 전에 반드시 알려주고 취소할 기회를 준다.
    if (isUpgrade) {
      Alert.alert(
        "지금까지 기록이 안 이어져요",
        "Google 로그인은 완전히 새 계정으로 시작하는 방식이라, 지금까지 쌓인 알림·체크리스트는 이 계정에 남지 않아요. 기존 기록을 이어가려면 '이메일로 계정 만들기'를 이용해주세요.",
        [
          { text: "취소", style: "cancel" },
          { text: "그래도 계속하기", onPress: performGoogleSignIn },
        ],
      );
      return;
    }
    performGoogleSignIn();
  }

  async function performGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      // 지연 로딩: 크리덴셜이 없는 환경(GOOGLE_WEB_CLIENT_ID 빈 값)에서는 이 모듈을
      // 아예 건드리지 않게 해서, 네이티브 설정 전에도 나머지 로그인 흐름이 깨지지 않게 한다.
      const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error("Google 로그인에서 토큰을 받지 못했습니다.");
      }
      const res = await rawFetch("/api/auth/google", JSON.stringify({ idToken }));
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Google 로그인에 실패했습니다.");
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
          isAnonymous: false,
        },
        true,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google 로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← 나중에 하기</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.logo}>함께알림</Text>
      <Text style={styles.subtitle}>
        {mode === "signup"
          ? isUpgrade
            ? "계정을 만들어두면 다른 기기에서도, 배우자와도 이어서 쓸 수 있어요"
            : "가입하고 우리 가정을 만들어보세요"
          : "다시 로그인하기"}
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
        style={[styles.googleButton, loading && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>Google로 계속하기</Text>
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

async function rawFetch(path: string, body: string) {
  const { API_BASE_URL } = await import("../config/api");
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    position: "absolute",
    top: 12,
    left: 8,
    padding: 8,
  },
  backButtonText: {
    color: "#3D5A9C",
    fontSize: 13,
    fontWeight: "600",
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  googleButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  googleButtonText: {
    color: "#0B1F4D",
    fontSize: 15,
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

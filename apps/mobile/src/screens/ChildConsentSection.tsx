import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_BASE_URL } from "../config/api";

type Role = "primary" | "secondary";

type Child = {
  id: string;
  name: string;
  birth_year: number | null;
  disability_type: string | null;
};

/**
 * PRD FR-5 / 9단계: 아동 정보는 동의 없이 저장할 수 없다(만 14세 미만 법정대리인 동의,
 * AI 처리 고지 — AI기본법 31조). 장애 유형은 더 민감한 정보라 별도 동의가 필요하다.
 * 체크박스가 없으면 "자녀 등록" 버튼 자체가 비활성화되어, 서버가 막기 전에 UI에서도 막는다.
 */
export default function ChildConsentSection({ role }: { role: Role }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [disabilityType, setDisabilityType] = useState("");
  const [agreeChildInfo, setAgreeChildInfo] = useState(false);
  const [agreeAiProcessing, setAgreeAiProcessing] = useState(false);
  const [agreeDisabilityInfo, setAgreeDisabilityInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/children`)
      .then((res) => res.json())
      .then((data) => setChildren(data.children ?? []))
      .catch(() => {});
  }, []);

  const needsDisabilityConsent = disabilityType.trim().length > 0;
  const canSubmit =
    name.trim().length > 0 &&
    agreeChildInfo &&
    agreeAiProcessing &&
    (!needsDisabilityConsent || agreeDisabilityInfo) &&
    !submitting;

  async function postConsent(consentType: string, granted: boolean) {
    await fetch(`${API_BASE_URL}/api/consents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ as: role, consentType, granted }),
    });
  }

  async function handleRegister() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await postConsent("child_info", true);
      await postConsent("ai_processing", true);
      if (needsDisabilityConsent) {
        await postConsent("disability_info", true);
      }

      const res = await fetch(`${API_BASE_URL}/api/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          as: role,
          name: name.trim(),
          birthYear: birthYear ? Number(birthYear) : undefined,
          disabilityType: needsDisabilityConsent ? disabilityType.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "자녀 등록에 실패했습니다.");
      }
      setChildren((prev) => [...prev, data.child as Child]);
      setName("");
      setBirthYear("");
      setDisabilityType("");
      setAgreeChildInfo(false);
      setAgreeAiProcessing(false);
      setAgreeDisabilityInfo(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "자녀 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>자녀 정보 등록 (선택)</Text>
      <Text style={styles.subtitle}>
        자녀 이름을 등록해두면 앞으로 이 자녀 기준으로 알림을 모아볼 수 있어요. 아동 정보 저장에는
        동의가 필요합니다.
      </Text>

      {children.map((c) => (
        <Text key={c.id} style={styles.childRow}>
          👤 {c.name}
          {c.birth_year ? ` (${c.birth_year}년생)` : ""}
        </Text>
      ))}

      <TextInput
        style={styles.input}
        placeholder="자녀 이름"
        placeholderTextColor="#9DBEF7"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="출생연도 (선택, 예: 2018)"
        placeholderTextColor="#9DBEF7"
        keyboardType="number-pad"
        value={birthYear}
        onChangeText={setBirthYear}
      />
      <TextInput
        style={styles.input}
        placeholder="장애 유형 (해당 시에만, 별도 동의 필요)"
        placeholderTextColor="#9DBEF7"
        value={disabilityType}
        onChangeText={setDisabilityType}
      />

      <CheckRow
        label="아동 정보 저장에 동의합니다 (필수)"
        checked={agreeChildInfo}
        onToggle={() => setAgreeChildInfo((v) => !v)}
      />
      <CheckRow
        label="AI가 알림 내용을 분석하는 것에 동의합니다 (필수)"
        checked={agreeAiProcessing}
        onToggle={() => setAgreeAiProcessing((v) => !v)}
      />
      {needsDisabilityConsent && (
        <CheckRow
          label="장애 유형 등 민감 정보 저장에 동의합니다 (필수)"
          checked={agreeDisabilityInfo}
          onToggle={() => setAgreeDisabilityInfo((v) => !v)}
        />
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleRegister}
        disabled={!canSubmit}
      >
        <Text style={styles.submitButtonText}>자녀 등록</Text>
      </TouchableOpacity>
    </View>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkboxMark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1F4D",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#3D5A9C",
    marginBottom: 12,
    lineHeight: 18,
  },
  childRow: {
    fontSize: 13,
    color: "#0B1F4D",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0B1F4D",
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#1B64F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#1B64F2",
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  checkLabel: {
    fontSize: 12,
    color: "#0B1F4D",
    flex: 1,
  },
  errorText: {
    color: "#F23B3B",
    fontSize: 12,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: "#1B64F2",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#9DBEF7",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../config/api";
import type { ChecklistCategory, SummarizeResult } from "../types/notice";

const CATEGORY_COLOR: Record<ChecklistCategory, string> = {
  준비물: "#1B64F2", // blue
  제출서류: "#F2871B", // orange
  기한: "#F23B3B", // red
};

export default function NoticeInputScreen() {
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<SummarizeResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    if (!rawText.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "요약에 실패했습니다.");
      }
      setResult(data as SummarizeResult);
      setShowOriginal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>알림 붙여넣기</Text>
      <TextInput
        style={styles.input}
        placeholder="학교/복지관 알림 원문을 여기에 붙여넣으세요"
        placeholderTextColor="#7FA8F5"
        multiline
        value={rawText}
        onChangeText={setRawText}
      />

      <TouchableOpacity
        style={[styles.button, (!rawText.trim() || loading) && styles.buttonDisabled]}
        onPress={handleSummarize}
        disabled={!rawText.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>핵심만 정리하기</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {result && (
        <View style={styles.resultBox}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {showOriginal ? "학교에서 온 그대로" : "핵심만 정리하면"}
            </Text>
            <TouchableOpacity onPress={() => setShowOriginal((v) => !v)}>
              <Text style={styles.toggleText}>
                {showOriginal ? "요약 보기" : "원문 보기"}
              </Text>
            </TouchableOpacity>
          </View>

          {showOriginal ? (
            <Text style={styles.originalText}>{rawText}</Text>
          ) : (
            <>
              <Text style={styles.summaryText}>{result.summary}</Text>
              {result.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: CATEGORY_COLOR[item.category] },
                    ]}
                  >
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  <View style={styles.itemTextBox}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.detail && <Text style={styles.itemDetail}>{item.detail}</Text>}
                    {item.dueDate && <Text style={styles.itemDue}>기한: {item.dueDate}</Text>}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B1F4D",
    marginBottom: 12,
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0B1F4D",
    textAlignVertical: "top",
    backgroundColor: "#F3F8FF",
  },
  button: {
    marginTop: 14,
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
  errorText: {
    marginTop: 12,
    color: "#F23B3B",
    fontSize: 14,
  },
  resultBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    borderRadius: 12,
    padding: 16,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B1F4D",
  },
  toggleText: {
    color: "#1B64F2",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryText: {
    fontSize: 15,
    color: "#0B1F4D",
    marginBottom: 14,
    lineHeight: 22,
  },
  originalText: {
    fontSize: 14,
    color: "#0B1F4D",
    lineHeight: 21,
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginRight: 10,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  itemTextBox: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0B1F4D",
  },
  itemDetail: {
    fontSize: 13,
    color: "#3D5A9C",
    marginTop: 2,
  },
  itemDue: {
    fontSize: 13,
    color: "#F23B3B",
    marginTop: 2,
  },
});

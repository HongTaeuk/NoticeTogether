import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authFetch } from "../lib/apiClient";
import { josa } from "../lib/josa";
import type { Role, Session } from "../lib/authStorage";
import { COLORS, FONT_DISPLAY } from "../theme";

type Props = {
  session: Session;
  onJoined: (update: Partial<Session>) => void;
  onContinue: () => void;
};

type MemberType = "caregiver" | "child";

// 부부만이 아니라 조부모·친척 등 다양한 양육자가 있다.
const CAREGIVER_TITLES = ["엄마", "아빠", "할머니", "할아버지", "이모", "고모", "삼촌"];

/**
 * 가입 없이 초대 코드만으로 가족(양육자 여러 명 + 아이)을 한 가정으로 묶는다.
 * 코드를 받은 사람은 "양육자예요 / 아이예요"를 고르고, 가족 안에서 불릴 호칭을 정한다.
 */
export default function HouseholdSetupScreen({ session, onJoined, onContinue }: Props) {
  const [code, setCode] = useState("");
  const [checkedCode, setCheckedCode] = useState<string | null>(null);
  const [childOptions, setChildOptions] = useState<{ id: string; name: string }[]>([]);
  const [memberType, setMemberType] = useState<MemberType | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [childId, setChildId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    try {
      await Share.share({
        message: `함께알림에서 우리 가족으로 연결해요!\n앱을 열고 "초대 코드를 받았어요"에 아래 코드를 넣어 주세요.\n초대 코드: ${session.inviteCode}`,
      });
    } catch {
      // 공유 시트를 닫은 경우는 무시한다.
    }
  }

  async function checkCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/api/auth/join?inviteCode=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "이 코드는 사용할 수 없어요. 코드를 다시 확인해 주세요.");
      setChildOptions(data.children ?? []);
      setCheckedCode(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이 코드는 사용할 수 없어요. 코드를 다시 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const chosenName =
    memberType === "child"
      ? customName.trim() || childOptions.find((c) => c.id === childId)?.name || ""
      : customName.trim() || title || "";
  const canJoin = !!checkedCode && !!memberType && chosenName.length > 0 && !busy;

  async function handleJoin() {
    if (!canJoin || !checkedCode || !memberType) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch("/api/auth/join", {
        method: "POST",
        body: JSON.stringify({
          inviteCode: checkedCode,
          memberType,
          displayName: chosenName,
          childId: memberType === "child" && !customName.trim() ? childId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
      onJoined({
        householdId: data.household.id,
        inviteCode: data.household.inviteCode,
        role: data.role as Role,
        displayName: data.displayName ?? chosenName,
        childId: data.childId ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "android" ? "height" : "padding"}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.title}>우리 가족 연결하기</Text>
          <Text style={styles.subtitle}>
            엄마·아빠·할머니·할아버지 같은 양육자와 아이가 한 가족으로 연결돼요. 가입은 필요 없어요.
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>우리 가족 초대 코드</Text>
          <Text style={styles.codeValue}>{session.inviteCode}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>가족에게 코드 보내기</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>초대 코드를 받았어요</Text>
        <View style={styles.codeRow}>
          <TextInput
            style={styles.codeInput}
            placeholder="초대 코드 6자리"
            placeholderTextColor={COLORS.primarySoft}
            autoCapitalize="characters"
            maxLength={6}
            value={code}
            onChangeText={(t) => {
              setCode(t);
              if (checkedCode) {
                setCheckedCode(null);
                setMemberType(null);
              }
            }}
          />
          <TouchableOpacity
            style={[styles.checkButton, (!code.trim() || busy) && styles.buttonDisabled]}
            onPress={checkCode}
            disabled={!code.trim() || busy}
          >
            <Text style={styles.checkButtonText}>{checkedCode ? "확인됨" : "확인"}</Text>
          </TouchableOpacity>
        </View>

        {checkedCode && (
          <>
            <Text style={styles.question}>누구로 참여할까요?</Text>
            <View style={styles.choiceRow}>
              <ChoiceCard
                emoji="👩‍👧"
                label="양육자예요"
                hint="엄마·아빠·조부모 등"
                selected={memberType === "caregiver"}
                onPress={() => {
                  setMemberType("caregiver");
                  setCustomName("");
                }}
              />
              <ChoiceCard
                emoji="🧒"
                label="아이예요"
                hint="알림장을 같이 봐요"
                selected={memberType === "child"}
                onPress={() => {
                  setMemberType("child");
                  setCustomName("");
                }}
              />
            </View>

            {memberType === "caregiver" && (
              <>
                <Text style={styles.question}>가족 안에서 뭐라고 부를까요?</Text>
                <View style={styles.chipRow}>
                  {CAREGIVER_TITLES.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      selected={title === t && !customName.trim()}
                      onPress={() => {
                        setTitle(t);
                        setCustomName("");
                      }}
                    />
                  ))}
                </View>
                <TextInput
                  style={styles.nameInput}
                  placeholder="직접 쓰기 (예: 큰아빠)"
                  placeholderTextColor={COLORS.primarySoft}
                  maxLength={20}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </>
            )}

            {memberType === "child" && (
              <>
                <Text style={styles.question}>이름이 뭐예요?</Text>
                {childOptions.length > 0 && (
                  <View style={styles.chipRow}>
                    {childOptions.map((c) => (
                      <Chip
                        key={c.id}
                        label={c.name}
                        selected={childId === c.id && !customName.trim()}
                        onPress={() => {
                          setChildId(c.id);
                          setCustomName("");
                        }}
                      />
                    ))}
                  </View>
                )}
                <TextInput
                  style={styles.nameInput}
                  placeholder={childOptions.length > 0 ? "목록에 없으면 이름 쓰기" : "내 이름 쓰기"}
                  placeholderTextColor={COLORS.primarySoft}
                  maxLength={20}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </>
            )}
          </>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {checkedCode && (
          <TouchableOpacity
            style={[styles.joinButton, !canJoin && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={!canJoin}
          >
            <Text style={styles.joinButtonText}>
              {busy ? "연결하는 중..." : chosenName ? `${josa(chosenName, "으로/로")} 가족 연결하기` : "가족 연결하기"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.laterButton} onPress={onContinue}>
          <Text style={styles.laterButtonText}>나중에 하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ChoiceCard({
  emoji,
  label,
  hint,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.choiceCard, selected && styles.choiceCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.choiceEmoji}>{emoji}</Text>
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
      <Text style={styles.choiceHint}>{hint}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: 22, paddingBottom: 40 },
  hero: { alignItems: "center", marginTop: 12, marginBottom: 18 },
  heroEmoji: { fontSize: 52 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 26, color: COLORS.ink, marginTop: 6 },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: "center", lineHeight: 21, marginTop: 6 },
  codeCard: {
    backgroundColor: COLORS.sunSoft,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.sun,
  },
  codeLabel: { fontSize: 13, color: COLORS.sunInk, fontWeight: "700" },
  codeValue: { fontFamily: FONT_DISPLAY, fontSize: 34, color: COLORS.ink, letterSpacing: 6, marginVertical: 8 },
  shareButton: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  shareButtonText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 15 },
  sectionTitle: { fontFamily: FONT_DISPLAY, fontSize: 19, color: COLORS.ink, marginTop: 26, marginBottom: 10 },
  codeRow: { flexDirection: "row", alignItems: "center" },
  codeInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.ink,
    letterSpacing: 3,
    marginRight: 10,
  },
  checkButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 },
  checkButtonText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 16 },
  question: { fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.ink, marginTop: 20, marginBottom: 10 },
  choiceRow: { flexDirection: "row", gap: 10 },
  choiceCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingVertical: 16,
  },
  choiceCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.tint },
  choiceEmoji: { fontSize: 36 },
  choiceLabel: { fontFamily: FONT_DISPLAY, fontSize: 17, color: COLORS.ink, marginTop: 4 },
  choiceLabelSelected: { color: COLORS.primary },
  choiceHint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  chipText: { fontSize: 15, color: COLORS.ink, fontWeight: "700" },
  chipTextSelected: { color: COLORS.white },
  nameInput: {
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.ink,
    marginTop: 4,
  },
  errorText: { color: COLORS.red, fontSize: 13, marginTop: 12, textAlign: "center" },
  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 22,
  },
  joinButtonText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 18 },
  buttonDisabled: { backgroundColor: COLORS.primarySoft },
  laterButton: { marginTop: 18, alignItems: "center", paddingVertical: 6 },
  laterButtonText: { color: COLORS.muted, fontSize: 14, fontWeight: "700" },
});

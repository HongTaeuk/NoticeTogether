import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authFetch } from "../lib/apiClient";
import { formatMessageTime } from "../lib/dateFormat";
import { josa } from "../lib/josa";
import { loadSchoolStatus } from "../lib/schoolFeed";
import { schoolSituation } from "../lib/schoolMessages";
import RunnerLoading from "../components/RunnerLoading";
import FunLoading, { BouncingDots, useLingeringLoading } from "../components/FunLoading";
import { OFFICES, type SchoolHit, type SchoolStatus } from "../types/school";
import { COLORS, FONT_DISPLAY } from "../theme";

type Step = "ask" | "loading" | "current" | "pick" | "grade" | "result";

/** 중학교는 1~3학년, 초등학교는 1~6학년. */
function isMiddle(s: SchoolHit): boolean {
  return s.kind === "중학교" || /중학교$/.test(s.name);
}

const KIND_LABEL: Record<string, string> = { notice: "가정통신문", office_notice: "교육청 가정통신문", weekly: "주간학습안내" };

/**
 * 학교 연결(research/REPORT.md). 교육청 → 학교 이름으로 찾기 → (선택) 학년 → 연결.
 * 연결하면 서버가 그 학교 홈페이지의 가정통신문 게시판을 찾아, 앱을 열 때마다 새 글을 알림으로 정리해 둔다.
 * - onboarding: 첫 실행 때 "학교를 연결할까요?"부터 묻는다(건너뛸 수 있다).
 * - settings: 지금 연결된 학교를 보여 주고 바꾸거나 끊는다.
 */
export default function SchoolSetupScreen({ mode, onDone }: { mode: "onboarding" | "settings"; onDone: () => void }) {
  const [step, setStep] = useState<Step>(mode === "onboarding" ? "ask" : "loading");
  const [status, setStatus] = useState<SchoolStatus | null>(null);
  const [office, setOffice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SchoolHit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [picked, setPicked] = useState<SchoolHit | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const linkingShown = useLingeringLoading(busy && step === "grade");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "settings") return;
    loadSchoolStatus().then((s) => {
      setStatus(s);
      setStep(s?.linked || s?.needsMigration ? "current" : "pick");
    });
  }, [mode]);

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setError("학교 이름을 두 글자 이상 써 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (office) params.set("atpt", office);
      const res = await authFetch(`/api/schools/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "학교를 찾지 못했어요.");
      setHits(data.schools as SchoolHit[]);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "학교를 찾지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function link() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch("/api/school", {
        method: "PUT",
        body: JSON.stringify({ atptCode: picked.atptCode, schoolCode: picked.schoolCode, grade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "연결하지 못했어요.");
      setStatus(data as SchoolStatus);
      // 달리던 아이가 학교에 도착하는 모습을 잠깐 보여 준 뒤 결과로 넘어간다.
      setTimeout(() => setStep("result"), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "연결하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    const res = await authFetch("/api/school", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setStatus(null);
      setStep("pick");
    } else {
      setError("연결을 끊지 못했어요. 잠시 뒤 다시 해 주세요.");
    }
  }

  const laterLabel = mode === "onboarding" ? "나중에 할게요" : "닫기";

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "android" ? "height" : "padding"}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === "ask" && (
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>🏫</Text>
            <Text style={styles.title}>{"아이 학교를\n연결할까요?"}</Text>
            <Text style={styles.subtitle}>
              학교 홈페이지에 올라오는 가정통신문을 알아서 가져와 핵심만 정리해 드려요. 붙여넣지 않아도 돼요.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("pick")}>
              <Text style={styles.primaryButtonText}>학교 고르기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={onDone}>
              <Text style={styles.linkButtonText}>{laterLabel}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "loading" && (
          <View style={styles.center}>
            <FunLoading scene="search" steps={["우리 학교 정보를 불러오는 중이에요", "게시판 상태를 확인하는 중"]} />
          </View>
        )}

        {step === "current" && status && (
          <>
            <Text style={styles.heading}>우리 학교</Text>
            {status.needsMigration ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>학교 연결은 준비 중이에요. 관리자가 DB 업데이트(0006)를 마치면 쓸 수 있어요.</Text>
              </View>
            ) : (
              <StatusCard status={status} />
            )}
            {!status.needsMigration && (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("pick")}>
                  <Text style={styles.primaryButtonText}>학교 바꾸기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkButton} onPress={unlink} disabled={busy}>
                  <Text style={[styles.linkButtonText, styles.dangerText]}>연결 끊기</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.linkButton} onPress={onDone}>
              <Text style={styles.linkButtonText}>닫기</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "pick" && (
          <>
            <Text style={styles.heading}>어느 학교인가요?</Text>
            <Text style={styles.label}>교육청</Text>
            <View style={styles.chipWrap}>
              {OFFICES.map((o) => (
                <TouchableOpacity
                  key={o.code}
                  style={[styles.chip, office === o.code && styles.chipOn]}
                  onPress={() => {
                    setOffice(office === o.code ? null : o.code);
                    setHits(null);
                  }}
                >
                  <Text style={[styles.chipText, office === o.code && styles.chipTextOn]}>{o.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>학교 이름</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                placeholder="예: 안양남초, 서이초"
                placeholderTextColor={COLORS.primarySoft}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={search}
                returnKeyType="search"
                maxLength={30}
              />
              <TouchableOpacity style={styles.searchButton} onPress={search} disabled={busy}>
                {busy ? <BouncingDots color={COLORS.white} /> : <Text style={styles.searchButtonText}>찾기</Text>}
              </TouchableOpacity>
            </View>
            {busy && <FunLoading scene="search" />}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {!busy && hits && hits.length === 0 && (
              <Text style={styles.hint}>찾는 학교가 없어요. 교육청과 학교 이름을 확인해 주세요.</Text>
            )}
            {hits?.map((s) => (
              <TouchableOpacity
                key={s.schoolCode}
                style={styles.hitCard}
                onPress={() => {
                  setPicked(s);
                  if (grade && isMiddle(s) && grade > 3) setGrade(null);
                  setStep("grade");
                }}
              >
                <Text style={styles.hitName}>{s.name}</Text>
                <Text style={styles.hitAddress}>{s.address || s.atptName}</Text>
                {!s.homepage && <Text style={styles.hitWarn}>교육청 정보에 홈페이지가 없어 자동으로 가져오기 어려워요</Text>}
              </TouchableOpacity>
            ))}
            {hits && total > hits.length && (
              <Text style={styles.hint}>
                비슷한 이름이 {total}곳 있어요. 목록에 없으면 이름을 조금 더 자세히 써 주세요(예: "안양" → "안양남초").
              </Text>
            )}
            <TouchableOpacity style={styles.linkButton} onPress={status?.linked ? () => setStep("current") : onDone}>
              <Text style={styles.linkButtonText}>{status?.linked ? "돌아가기" : laterLabel}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "grade" && picked && (
          <>
            <Text style={styles.heading}>{picked.name}</Text>
            <Text style={styles.subtitleLeft}>
              아이가 몇 학년인가요? 제목에 학년이 적힌 안내(예: {isMiddle(picked) ? "\"3학년 진로 체험\"" : "\"6학년 졸업앨범\""})는 우리 아이 학년 것만 가져와요.
            </Text>
            <View style={styles.chipWrap}>
              {(isMiddle(picked) ? [1, 2, 3] : [1, 2, 3, 4, 5, 6]).map((g) => (
                <TouchableOpacity key={g} style={[styles.chip, styles.gradeChip, grade === g && styles.chipOn]} onPress={() => setGrade(g)}>
                  <Text style={[styles.chipText, grade === g && styles.chipTextOn]}>{g}학년</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.chip, grade === null && styles.chipOn]} onPress={() => setGrade(null)}>
                <Text style={[styles.chipText, grade === null && styles.chipTextOn]}>고르지 않을래요</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity style={styles.primaryButton} onPress={link} disabled={busy}>
              {busy ? (
                <BouncingDots color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{josa(picked.name, "와/과")} 연결하기</Text>
              )}
            </TouchableOpacity>
            {linkingShown && (
              <RunnerLoading
                compact
                done={!busy}
                expectedMs={10000}
                steps={["학교 홈페이지로 달려가는 중!", "가정통신문 게시판을 찾는 중이에요", "거의 다 찾았어요"]}
              />
            )}
            <TouchableOpacity style={styles.linkButton} onPress={() => setStep("pick")} disabled={busy}>
              <Text style={styles.linkButtonText}>다른 학교 고르기</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "result" && status && (
          <>
            <Text style={styles.bigEmoji}>{status.supported ? "🎉" : "🏫"}</Text>
            <Text style={styles.heading}>
              {status.supported ? `${status.school?.name} 연결됐어요` : `${status.school?.name} 연결은 했어요`}
            </Text>
            <StatusCard status={status} />
            <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
              <Text style={styles.primaryButtonText}>{mode === "onboarding" ? "시작하기" : "확인"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** 연결된 학교 + 찾은 게시판 + 우리가 못 받는 것(담임 알림장)을 숨기지 않고 보여 준다(REPORT §8.3). */
export function StatusCard({ status }: { status: SchoolStatus }) {
  const school = status.school;
  const situation = schoolSituation(status);
  return (
    <View style={styles.statusCard}>
      {school && (
        <Text style={styles.statusSchool}>
          🏫 {school.name}
          {school.grade ? ` · ${school.grade}학년` : ""}
        </Text>
      )}
      {status.supported ? (
        <>
          {status.boards
            .filter((b) => b.supported)
            .map((b) => (
              <Text key={b.label + b.kind} style={styles.boardLine}>
                ✅ {KIND_LABEL[b.kind] ?? b.label}
                {b.error ? " — 잠시 읽지 못했어요" : ""}
              </Text>
            ))}
          <Text style={styles.statusBody}>
            앱을 열 때마다 새 글을 확인해서 "오늘 할 일"에 정리해 둘게요.
            {status.lastCheckedAt ? ` (마지막 확인 ${formatMessageTime(status.lastCheckedAt)})` : ""}
          </Text>
        </>
      ) : (
        situation && (
          <>
            <Text style={styles.situationTitle}>⚠️ {situation.title}</Text>
            <Text style={styles.statusBody}>{situation.body}</Text>
          </>
        )
      )}
      {status.supported && situation && <Text style={styles.statusBody}>ℹ️ {situation.title} — {situation.body}</Text>}
      <Text style={styles.statusNote}>
        ⚠️ 담임 선생님 알림장은 학교 홈페이지에 올라오지 않아요. 받으면 "새 알림"에 붙여넣어 주세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  bigEmoji: { fontSize: 60, textAlign: "center", marginBottom: 14 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 27, lineHeight: 38, color: COLORS.ink, textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: "center", marginBottom: 26, paddingHorizontal: 8 },
  subtitleLeft: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 14 },
  heading: { fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink, marginBottom: 14, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.muted, marginTop: 6, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { borderRadius: 999, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 8 },
  gradeChip: { minWidth: 70, alignItems: "center" },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.primary },
  chipTextOn: { color: COLORS.white },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.ink,
  },
  searchButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, justifyContent: "center", minWidth: 72, alignItems: "center" },
  searchButtonText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 17 },
  hitCard: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line, padding: 14, marginTop: 10 },
  hitName: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.ink },
  hitAddress: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  hitWarn: { fontSize: 12, color: COLORS.orangeInk, marginTop: 4, fontWeight: "700" },
  situationTitle: { fontSize: 15, fontWeight: "800", color: COLORS.orangeInk },
  hint: { fontSize: 13, lineHeight: 19, color: COLORS.muted, marginTop: 12, textAlign: "center" },
  errorText: { color: COLORS.red, fontSize: 13, marginTop: 10, textAlign: "center" },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 18,
    alignSelf: "stretch",
  },
  primaryButtonText: { fontFamily: FONT_DISPLAY, color: COLORS.white, fontSize: 19 },
  linkButton: { alignSelf: "center", padding: 10, marginTop: 8 },
  linkButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.muted },
  dangerText: { color: COLORS.red },
  noticeCard: { backgroundColor: COLORS.orangeSoft, borderRadius: 14, padding: 14 },
  noticeText: { fontSize: 14, color: COLORS.orangeInk, lineHeight: 20 },
  statusCard: { backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 2, borderColor: COLORS.line, padding: 16, gap: 6 },
  statusSchool: { fontFamily: FONT_DISPLAY, fontSize: 19, color: COLORS.ink, marginBottom: 4 },
  boardLine: { fontSize: 15, color: COLORS.ink, fontWeight: "700" },
  statusBody: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 4 },
  statusNote: { fontSize: 13, lineHeight: 19, color: COLORS.orangeInk, backgroundColor: COLORS.orangeSoft, borderRadius: 12, padding: 10, marginTop: 6 },
});

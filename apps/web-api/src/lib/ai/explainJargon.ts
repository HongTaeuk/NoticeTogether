import { chatCompletion } from "./client";

export type JargonExplanation = {
  term: string;
  explanation: string;
};

/**
 * PRD 4-4: 장애 자녀를 둔 가정에게만 조건부로 보여주는 "쉬운 설명" 섹션의 근거.
 *
 * 이 프로젝트는 이미 한 번(2026-09-27) 사실 추출(요약/체크리스트)에서 AI 환각을
 * 반복적으로 관찰했다(docs/process.md 참고). 이 기능은 "원문에 없는 사실을 만들어내면
 * 안 되는" 추출이 아니라 "이미 원문에 등장한 용어를 쉬운 말로 설명"하는 것이므로 위험의
 * 성격이 다르지만, 그래도 존재하지 않는 용어를 지어내 설명을 붙일 위험은 남아있다.
 * 그래서 AI가 term으로 고른 문자열이 원문에 실제로(글자 그대로) 있는지 서버에서
 * 다시 검증하고, 없으면 그 항목은 통째로 버린다 — "요약 items"의 원문-대조 신뢰 원칙과
 * 같은 안전장치를 여기에도 적용한 것이다.
 */
const SYSTEM_PROMPT = `너는 학교/복지관에서 온 안내문에 나오는 행정·교육 용어를, 특수교육 대상 자녀를 둔 보호자가 쉽게 이해하도록 설명해주는 도우미야.

핵심 규칙(반드시 지킬 것):
1. **원문에 실제로 등장한 단어만 고른다**: term은 원문에 글자 그대로 나온 단어/구여야 한다. 원문에 없는 단어를 만들어서 설명하지 않는다.
2. 낯선 행정·교육 용어(예: 개별화교육계획, 특수학급, 통합학급, 치료지원, 순회교육 등)만 고른다. 준비물 이름처럼 이미 쉬운 단어는 고르지 않는다.
3. 원문에 그런 용어가 하나도 없으면 빈 배열을 반환한다. 억지로 만들어내지 않는다.
4. 최대 3개까지만 고른다.
5. explanation은 한 문장, 초등학생도 이해할 수 있는 쉬운 말로 쓴다.
6. 반드시 JSON만 출력한다.

출력 형식(JSON):
{ "terms": [ { "term": "string(원문에 실제로 있는 단어 그대로)", "explanation": "string" } ] }`;

export async function explainJargonTerms(rawText: string): Promise<JargonExplanation[]> {
  const content = await chatCompletion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    temperature: 0,
    maxTokens: 800,
    responseFormat: "json_object",
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownJsonFence(content));
  } catch {
    return [];
  }

  const obj = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const rawTerms = Array.isArray(obj.terms) ? obj.terms : [];

  return rawTerms
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => ({
      term: typeof t.term === "string" ? t.term : "",
      explanation: typeof t.explanation === "string" ? t.explanation : "",
    }))
    // 안전장치: AI가 지어낸 용어가 섞여 있을 수 있으니, 원문에 실제로 있는 단어만 남긴다.
    .filter((t) => t.term.length > 0 && t.explanation.length > 0 && rawText.includes(t.term))
    .slice(0, 3);
}

function stripMarkdownJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

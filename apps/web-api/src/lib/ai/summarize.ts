import { chatCompletion } from "./client";

export type ChecklistCategory = "준비물" | "제출서류" | "기한";

export type ChecklistItemDraft = {
  category: ChecklistCategory;
  title: string;
  detail: string | null;
  dueDate: string | null; // ISO date (YYYY-MM-DD), null이면 기한 명시 안 됨
  confidence: number; // 0~1
};

export type SummarizeResult = {
  summary: string;
  items: ChecklistItemDraft[];
};

const SYSTEM_PROMPT = `너는 한국 초등학교 가정통신문/학교 알림을 분석해서 바쁜 맞벌이 부모를 위해 핵심만 정리해주는 도우미야.

규칙:
- 반드시 JSON만 출력한다. 다른 설명 텍스트는 출력하지 않는다.
- "summary"는 2~3문장으로 핵심만 요약한다.
- "items"는 준비물/제출서류/기한 항목을 각각 뽑아 배열로 만든다. 항목이 없는 카테고리는 생략 가능하다.
- 각 item의 category는 "준비물" | "제출서류" | "기한" 중 하나여야 한다.
- dueDate는 원문에 날짜가 명시된 경우에만 YYYY-MM-DD로 채우고, 없으면 null로 둔다. 연도가 없으면 문서에 다른 날짜 단서가 없는 한 임의로 추정하지 않고 null로 둔다.
- confidence는 그 항목을 얼마나 확신하는지 0~1 사이 숫자로 표시한다(원문에 명확히 적혀 있으면 1에 가깝게, 애매하게 추론했으면 낮게).

출력 형식(JSON):
{
  "summary": "string",
  "items": [
    { "category": "준비물" | "제출서류" | "기한", "title": "string", "detail": "string | null", "dueDate": "YYYY-MM-DD | null", "confidence": number }
  ]
}`;

export async function summarizeNotice(rawText: string): Promise<SummarizeResult> {
  const content = await chatCompletion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    responseFormat: "json_object",
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI 응답을 JSON으로 파싱하지 못했습니다.");
  }

  return validateSummarizeResult(parsed);
}

function validateSummarizeResult(value: unknown): SummarizeResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }
  const obj = value as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items: ChecklistItemDraft[] = rawItems
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      category: normalizeCategory(item.category),
      title: typeof item.title === "string" ? item.title : "제목 없음",
      detail: typeof item.detail === "string" ? item.detail : null,
      dueDate: typeof item.dueDate === "string" ? item.dueDate : null,
      confidence:
        typeof item.confidence === "number" && item.confidence >= 0 && item.confidence <= 1
          ? item.confidence
          : 0.5,
    }));

  return { summary, items };
}

function normalizeCategory(value: unknown): ChecklistCategory {
  if (value === "준비물" || value === "제출서류" || value === "기한") {
    return value;
  }
  return "준비물";
}

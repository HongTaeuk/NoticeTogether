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

가장 중요한 규칙(위반 절대 금지):
- **원문에 실제로 적힌 내용만 사용한다. 원문에 없는 단어·활동·날짜·항목을 절대로 지어내지 않는다.**
- 각 item은 원문의 특정 문장/구절에서 직접 뽑아낸 것이어야 한다. 원문에 없는 내용을 추측해서 채우지 마라.
- 원문에 명시적으로 등장하지 않는 사물/행사명은 절대 쓰지 마라(예: 원문에 "체육복"이 있으면 "체육복"이라고 쓰고, 없는 "체력검사" 같은 걸 만들어내지 마라).
- 애매하거나 확신이 없으면 confidence를 낮게 주되, 항목 자체를 지어내지는 마라.

그 외 규칙:
- 반드시 JSON만 출력한다. 다른 설명 텍스트는 출력하지 않는다.
- "summary"는 2~3문장으로 핵심만 요약한다.
- "items"는 준비물/제출서류/기한 항목을 각각 뽑아 배열로 만든다. 원문에 해당 카테고리 내용이 없으면 그 카테고리는 생략한다.
- 각 item의 category는 "준비물" | "제출서류" | "기한" 중 하나여야 한다.
- dueDate는 원문에 날짜가 명시된 경우에만 YYYY-MM-DD로 채우고, 없으면 null로 둔다. 연도가 없으면 문서에 다른 날짜 단서가 없는 한 임의로 추정하지 않고 null로 둔다.
- confidence는 그 항목을 얼마나 확신하는지 0~1 사이 숫자로 표시한다(원문에 명확히 적혀 있으면 1에 가깝게, 애매하게 추론했으면 낮게).
- 한 문장에 준비물/서류가 여러 개 나열되어 있으면(예: "체육복과 물통을 챙겨주세요") **각각을 별도의 item으로 분리해서 만든다** (하나로 합치지 말고, 예: {"title":"체육복"}과 {"title":"물통"}을 각각 따로). 나열된 것 중 일부만 뽑고 나머지를 누락하는 것은 절대 금지.

예시)
원문: "안녕하세요 1학년 1반입니다. 이번주 금요일(9월 5일)까지 우유급식 신청서를 제출해주세요. 그리고 다음주 수요일 미술 시간에 크레파스와 스케치북을 가져와야 합니다."
출력:
{"summary":"1학년 1반 학부모님께: 9월 5일 금요일까지 우유급식 신청서 제출, 다음주 수요일 미술 시간에 크레파스와 스케치북 준비가 필요합니다.","items":[{"category":"제출서류","title":"우유급식 신청서 제출","detail":"9월 5일 금요일까지 제출","dueDate":"2026-09-05","confidence":0.95},{"category":"준비물","title":"크레파스, 스케치북","detail":"다음주 수요일 미술 시간에 필요","dueDate":null,"confidence":0.9}]}

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
    temperature: 0,
    responseFormat: "json_object",
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownJsonFence(content));
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

/**
 * OpenAI-호환 AI 클라이언트 추상화.
 *
 * docs/05_tech_review.md 결정에 따라 기본 프로바이더는 NVIDIA NIM(무료 API)이다.
 * NIM의 무료 티어는 분당 40 요청 제한이 있고 프로덕션 트래픽 용도가 아니므로,
 * 필요 시 Gemini/Groq 등 다른 OpenAI 호환 엔드포인트로 교체할 수 있도록
 * 엔드포인트/모델을 환경변수로만 결정한다. 호출부는 이 모듈만 알면 된다.
 */

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionParams = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
};

const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL ?? "meta/llama-3.1-70b-instruct";

export async function chatCompletion({
  messages,
  temperature = 0.2,
  maxTokens = 1024,
  responseFormat = "json_object",
}: ChatCompletionParams): Promise<string> {
  if (!AI_API_KEY) {
    throw new Error(
      "AI_API_KEY가 설정되지 않았습니다. .env.local에 NVIDIA NIM(또는 대체 프로바이더) API 키를 설정하세요.",
    );
  }

  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI 호출 실패 (${res.status}): ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI 응답 형식이 예상과 다릅니다.");
  }
  return content;
}

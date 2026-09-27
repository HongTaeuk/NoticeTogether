/**
 * OpenAI-호환 AI 클라이언트 추상화.
 *
 * docs/05_tech_review.md 결정에 따라 기본 프로바이더는 NVIDIA NIM(무료 API)이다.
 * NIM 무료 티어는 분당 40 요청 제한이 있고 프로덕션 트래픽 용도가 아니므로,
 * 참고 프로젝트(Wolharang/moa, TempClassifierService)에서 검증된 패턴을 따라
 * "모델 체인 + 연속 실패 시 일시 중단(cool-down)" 구조를 둔다.
 * 엔드포인트/모델은 환경변수로만 결정하므로 호출부는 이 모듈만 알면 된다.
 *
 * 주의: Vercel 서버리스 환경에서는 인스턴스가 재사용되는 동안에만 아래 상태가
 * 유지된다(콜드 스타트 시 초기화됨). moa처럼 상시 구동 서버는 아니지만,
 * 같은 웜 인스턴스 안에서 버스트 요청이 몰릴 때는 동일하게 효과가 있다.
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

// AI_MODELS="model-a,model-b,model-c" 형태의 콤마 구분 체인. 없으면 AI_MODEL 하나만 사용.
const MODEL_CHAIN = (process.env.AI_MODELS ?? process.env.AI_MODEL ?? "meta/llama-3.1-70b-instruct")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// 모델별 연속 실패 횟수. 이 값을 넘으면 다음 모델로 넘어가고, 해당 모델은
// 잠시(쿨다운) 동안 건너뛴다. moa의 failureCutoff/그레이스 기간과 동일한 목적.
const FAILURE_CUTOFF = 3;
const COOLDOWN_MS = 30_000;

type ModelState = { failures: number; cooldownUntil: number };
const modelStates = new Map<string, ModelState>(MODEL_CHAIN.map((m) => [m, { failures: 0, cooldownUntil: 0 }]));

function pickUsableModel(): string {
  const now = Date.now();
  const usable = MODEL_CHAIN.find((m) => (modelStates.get(m)?.cooldownUntil ?? 0) <= now);
  return usable ?? MODEL_CHAIN[0];
}

function recordSuccess(model: string) {
  modelStates.set(model, { failures: 0, cooldownUntil: 0 });
}

function recordFailure(model: string) {
  const state = modelStates.get(model) ?? { failures: 0, cooldownUntil: 0 };
  const failures = state.failures + 1;
  modelStates.set(model, {
    failures,
    cooldownUntil: failures >= FAILURE_CUTOFF ? Date.now() + COOLDOWN_MS : 0,
  });
}

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

  let lastError: unknown;
  // 체인에 있는 모델 수만큼만 시도(무한 루프 방지).
  for (let attempt = 0; attempt < MODEL_CHAIN.length; attempt++) {
    const model = pickUsableModel();
    try {
      const content = await callModel(model, { messages, temperature, maxTokens, responseFormat });
      recordSuccess(model);
      return content;
    } catch (err) {
      recordFailure(model);
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 호출이 모두 실패했습니다.");
}

async function callModel(
  model: string,
  { messages, temperature, maxTokens, responseFormat }: Required<Omit<ChatCompletionParams, "responseFormat">> & {
    responseFormat: NonNullable<ChatCompletionParams["responseFormat"]>;
  },
): Promise<string> {
  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
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
    throw new Error(`AI 호출 실패 (model=${model}, ${res.status}): ${body}`);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  // 일부 NVIDIA NIM 모델(추론형)은 response_format=json_object일 때
  // content를 null로 두고 reasoning_content에 실제 답을 담아 보낸다.
  const content = typeof message?.content === "string" ? message.content : message?.reasoning_content;
  if (typeof content !== "string") {
    throw new Error(`AI 응답 형식이 예상과 다릅니다 (model=${model}).`);
  }
  return content;
}

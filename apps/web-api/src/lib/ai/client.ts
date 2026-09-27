/**
 * OpenAI-호환 AI 클라이언트 추상화. 여러 프로바이더(Gemini, NVIDIA NIM 등)를
 * OpenAI 호환 엔드포인트로 순서대로 시도한다.
 *
 * 실측 비교 결과(2026-09-27, docs/process.md 참고) Gemini(gemini-3.5-flash-lite)가
 * 환각 없이 가장 정확했고, NVIDIA NIM 무료 계정에서 접근 가능한 모델들은
 * 정확하더라도 추론(reasoning) 토큰을 과도하게 써서 느리거나 잘리는 경우가 많았다.
 * 그래서 Gemini를 1순위로 쓰고, NVIDIA를 폴백으로 둔다.
 *
 * 프로바이더/모델 체인 내에서 연속 실패 시 일시 중단(cool-down)하는 구조는
 * 참고 프로젝트 Wolharang/moa(TempClassifierService)의 패턴을 따른 것이다.
 *
 * 주의: Vercel 서버리스 환경에서는 인스턴스가 재사용되는 동안에만 아래 상태가
 * 유지된다(콜드 스타트 시 초기화됨).
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

type Provider = {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
};

function parseModelList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

const PROVIDERS: Provider[] = [
  {
    name: "gemini",
    baseUrl: process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: process.env.GEMINI_API_KEY ?? "",
    models: parseModelList(process.env.GEMINI_MODELS ?? "gemini-3.5-flash-lite"),
  },
  {
    name: "nvidia",
    baseUrl: process.env.AI_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.AI_API_KEY ?? "",
    models: parseModelList(
      process.env.AI_MODELS ?? "nvidia/nemotron-3-ultra-550b-a55b,nvidia/nemotron-3-super-120b-a12b",
    ),
  },
].filter((p) => p.apiKey && p.models.length > 0);

// (provider, model) 조합별 연속 실패 횟수. 넘으면 잠시 건너뛴다.
const FAILURE_CUTOFF = 3;
const COOLDOWN_MS = 30_000;

type CallTarget = { provider: Provider; model: string };
type TargetState = { failures: number; cooldownUntil: number };

const targets: CallTarget[] = PROVIDERS.flatMap((provider) =>
  provider.models.map((model) => ({ provider, model })),
);
const targetStates = new Map<string, TargetState>(
  targets.map((t) => [targetKey(t), { failures: 0, cooldownUntil: 0 }]),
);

function targetKey(t: CallTarget): string {
  return `${t.provider.name}:${t.model}`;
}

function pickUsableTarget(): CallTarget | undefined {
  const now = Date.now();
  return (
    targets.find((t) => (targetStates.get(targetKey(t))?.cooldownUntil ?? 0) <= now) ?? targets[0]
  );
}

function recordSuccess(t: CallTarget) {
  targetStates.set(targetKey(t), { failures: 0, cooldownUntil: 0 });
}

function recordFailure(t: CallTarget) {
  const key = targetKey(t);
  const state = targetStates.get(key) ?? { failures: 0, cooldownUntil: 0 };
  const failures = state.failures + 1;
  targetStates.set(key, {
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
  if (targets.length === 0) {
    throw new Error(
      "AI 프로바이더가 설정되지 않았습니다. .env.local에 GEMINI_API_KEY 또는 AI_API_KEY 중 하나 이상을 설정하세요.",
    );
  }

  let lastError: unknown;
  // 체인에 있는 (프로바이더,모델) 조합 수만큼만 시도(무한 루프 방지).
  for (let attempt = 0; attempt < targets.length; attempt++) {
    const target = pickUsableTarget();
    if (!target) break;
    try {
      const content = await callModel(target, { messages, temperature, maxTokens, responseFormat });
      recordSuccess(target);
      return content;
    } catch (err) {
      recordFailure(target);
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 호출이 모두 실패했습니다.");
}

async function callModel(
  { provider, model }: CallTarget,
  { messages, temperature, maxTokens, responseFormat }: Required<Omit<ChatCompletionParams, "responseFormat">> & {
    responseFormat: NonNullable<ChatCompletionParams["responseFormat"]>;
  },
): Promise<string> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
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
    throw new Error(`AI 호출 실패 (provider=${provider.name}, model=${model}, ${res.status}): ${body}`);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  // 일부 NVIDIA NIM 모델(추론형)은 response_format=json_object일 때
  // content를 null로 두고 reasoning_content에 실제 답을 담아 보낸다.
  const content = typeof message?.content === "string" ? message.content : message?.reasoning_content;
  if (typeof content !== "string") {
    throw new Error(`AI 응답 형식이 예상과 다릅니다 (provider=${provider.name}, model=${model}).`);
  }
  return content;
}

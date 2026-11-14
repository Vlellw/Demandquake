// Structured-output helper over the Lovable AI Gateway. Server-only.
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";

export class AIError extends Error {
  userMessage: string;
  constructor(message: string, userMessage: string) {
    super(message);
    this.name = "AIError";
    this.userMessage = userMessage;
  }
}

function friendly(err: unknown): string {
  if (err instanceof GatewayError) {
    const name = err.constructor?.name ?? "";
    if (name === "PaymentRequiredError") return "AI credits are exhausted for this workspace.";
    if (name === "RateLimitError") return "The AI analysis is rate limited right now. Retry in a minute.";
    if (name === "TimeoutError" || name === "NetworkError") return "The AI analysis timed out. Retry this step.";
  }
  return "The AI analysis step failed. Retry this step.";
}

type JSONSchema = Record<string, unknown>;

export async function generateJSON<T>(opts: {
  name: string;
  instructions: string;
  input: string;
  schema: JSONSchema;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  let response: Awaited<ReturnType<typeof generateResponse<"openai/gpt-6-astra">>>;
  try {
    response = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: opts.instructions,
      input: [{ role: "user", content: `${opts.input}\n\nReturn JSON that matches the schema.` }],
      reasoning: { effort: opts.effort ?? "low" },
      text: {
        format: {
          type: "json_schema",
          name: opts.name,
          strict: true,
          schema: opts.schema,
        },
      },
    });
  } catch (err) {
    console.error(`[ai] ${opts.name} failed`, err);
    throw new AIError(`AI call ${opts.name} failed`, friendly(err));
  }

  const output = (response as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }> }).output ?? [];
  let text = "";
  for (const item of output) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "refusal") {
        throw new AIError(`AI refused ${opts.name}`, "The AI declined to analyze this topic.");
      }
      if (part.type === "output_text" && part.text) text += part.text;
    }
  }
  if (!text) throw new AIError(`AI returned no text for ${opts.name}`, "The AI analysis returned no result. Retry this step.");
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error(`[ai] ${opts.name} invalid JSON`, text.slice(0, 500));
    throw new AIError(`AI returned invalid JSON for ${opts.name}`, "The AI analysis returned an unreadable result. Retry this step.");
  }
}

// --- JSON schema builders (strict mode: every property required, no extras) ---
export const s = {
  str: (description?: string) => ({ type: "string", ...(description ? { description } : {}) }),
  nstr: (description?: string) => ({ type: ["string", "null"], ...(description ? { description } : {}) }),
  int: (description?: string) => ({ type: "integer", ...(description ? { description } : {}) }),
  bool: () => ({ type: "boolean" }),
  enm: (values: readonly string[], description?: string) => ({
    type: "string",
    enum: [...values],
    ...(description ? { description } : {}),
  }),
  arr: (items: JSONSchema, description?: string) => ({
    type: "array",
    items,
    ...(description ? { description } : {}),
  }),
  obj: (properties: Record<string, JSONSchema>, description?: string) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
    ...(description ? { description } : {}),
  }),
};

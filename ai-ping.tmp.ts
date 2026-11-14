import { generateJSON } from "@/lib/ai.server";
const t = Date.now();
try {
  const out = await generateJSON<{ ok: string }>({ name: "ping", instructions: "Reply.", input: "Say ok", schema: { type: "object", properties: { ok: { type: "string" } }, required: ["ok"], additionalProperties: false } as never, effort: "low" });
  console.log("AI OK", out, (Date.now() - t) / 1000);
} catch (e) { console.log("AI FAIL", String((e as Error).message), (e as { userMessage?: string }).userMessage); }

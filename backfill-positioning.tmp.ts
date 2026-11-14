import { generateJSON } from "@/lib/ai.server";
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
const { data } = await db.from("startups").select("id, name, tagline, solution, customers, competitors, business_model");
await Promise.all((data ?? []).map(async (st) => {
  const bm = (st.business_model ?? {}) as Record<string, unknown>;
  if (bm["target_scope"]) return;
  const out = await generateJSON<{ target_scope: string; target_segment: string }>({
    name: "positioning",
    effort: "low",
    instructions: "Place this proposed startup on the same axes used for its competitors: scope (point | suite | platform) and segment (smb | mid_market | enterprise). Prefer visible whitespace that its target customers imply.",
    input: JSON.stringify({ name: st.name, tagline: st.tagline, solution: st.solution, customers: st.customers, competitors: ((st.competitors ?? []) as Array<Record<string, unknown>>).map((c) => ({ name: c["name"], scope: c["scope"], segment: c["segment"] })) }),
    schema: { type: "object", properties: { target_scope: { type: "string", enum: ["point", "suite", "platform"] }, target_segment: { type: "string", enum: ["smb", "mid_market", "enterprise"] } }, required: ["target_scope", "target_segment"], additionalProperties: false } as never,
  });
  await db.from("startups").update({ business_model: { ...bm, ...out } }).eq("id", st.id);
  console.log(st.name, out);
}));

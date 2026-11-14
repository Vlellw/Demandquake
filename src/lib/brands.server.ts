// Competitor brand enrichment via Context.dev brand lookups, cached per domain. Server-only.
// Competitors with a sourced website are looked up by domain; competitors named without one are
// looked up by name and only kept when the name and industry plausibly match.
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { brandRetrieve, brandSearch, ContextDevError, type BrandInfo } from "./contextdev.server";
import type { BrandProfileDTO, CompetitorBrandsDTO } from "./dto";
import { generateJSON, s as schema } from "./ai.server";
import { brandMatchesCompetitor, brandNameKey, sameNameCandidates } from "./research-utils";
import type { Competitor } from "./types";

const ERROR_RETRY_MS = 6 * 60 * 60 * 1000;
const MAX_LOOKUPS_PER_REQUEST = 6; // competitors per request; a name lookup costs 1 search + ≤3 brand reads

type ProfileInsert = Database["public"]["Tables"]["brand_profiles"]["Insert"];

function toDTO(r: Record<string, unknown>): BrandProfileDTO {
  return {
    domain: String(r["domain"]),
    status: (r["status"] as BrandProfileDTO["status"]) ?? "found",
    title: (r["title"] as string | null) ?? null,
    description: (r["description"] as string | null) ?? null,
    slogan: (r["slogan"] as string | null) ?? null,
    logo_url: (r["logo_url"] as string | null) ?? null,
    icon_url: (r["icon_url"] as string | null) ?? null,
    colors: Array.isArray(r["colors"]) ? (r["colors"] as BrandProfileDTO["colors"]) : [],
    employees: (r["employees"] as string | null) ?? null,
    hq_country: (r["hq_country"] as string | null) ?? null,
    industries: Array.isArray(r["industries"]) ? (r["industries"] as string[]) : [],
    retrieved_at: String(r["retrieved_at"]),
  };
}

function cleanDomain(d: string | null | undefined): string | null {
  if (!d) return null;
  const v = d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) ? v : null;
}

function profileRow(brand: BrandInfo): ProfileInsert {
  return {
    domain: brand.domain,
    status: "found",
    title: brand.title,
    description: brand.description,
    slogan: brand.slogan,
    logo_url: brand.logoUrl,
    icon_url: brand.iconUrl,
    colors: brand.colors,
    employees: brand.employees,
    hq_country: brand.hqCountry,
    industries: brand.industries,
    error: null,
    retrieved_at: new Date().toISOString(),
  };
}

function emptyRow(domain: string, status: "not_found" | "error", error: string | null): ProfileInsert {
  return {
    domain,
    status,
    title: null,
    description: null,
    slogan: null,
    logo_url: null,
    icon_url: null,
    colors: [],
    employees: null,
    hq_country: null,
    industries: [],
    error,
    retrieved_at: new Date().toISOString(),
  };
}

interface Targets {
  industry: string | null;
  domains: string[];
  /** competitors without a domain, looked up by name */
  names: NameTarget[];
}

interface NameTarget {
  name: string;
  key: string;
  description: string;
}

async function targetsFor(slug: string): Promise<Targets> {
  const { data, error } = await db.from("startups").select("competitors, industry").eq("slug", slug).maybeSingle();
  if (error) throw error;
  const comps = (data?.competitors as unknown as Competitor[] | null) ?? [];
  const industry = data?.industry ?? null;
  const domains = new Set<string>();
  const names = new Map<string, NameTarget>();
  for (const c of comps) {
    const d = cleanDomain(c.domain);
    if (d) domains.add(d);
    else if (c.name?.trim()) names.set(c.name, { name: c.name, key: brandNameKey(c.name, industry), description: c.description ?? "" });
  }
  return { industry, domains: [...domains], names: [...names.values()] };
}

function stale(status: string, retrievedAt: string): boolean {
  return status === "error" && Date.now() - new Date(retrievedAt).getTime() > ERROR_RETRY_MS;
}

async function readState(t: Targets): Promise<CompetitorBrandsDTO & { missingDomains: string[]; missingNames: NameTarget[] }> {
  const byName: Record<string, string> = {};
  const missingNames: NameTarget[] = [];
  if (t.names.length) {
    const { data, error } = await db.from("brand_name_lookups").select("*").in("lookup_key", t.names.map((n) => n.key));
    if (error) throw error;
    const rows = new Map((data ?? []).map((r) => [r.lookup_key, r]));
    for (const n of t.names) {
      const r = rows.get(n.key);
      if (!r || stale(r.status, r.retrieved_at)) missingNames.push(n);
      else if (r.status === "found" && r.domain) byName[n.name] = r.domain;
    }
  }
  const allDomains = [...new Set([...t.domains, ...Object.values(byName)])];
  const profiles: Record<string, BrandProfileDTO> = {};
  if (allDomains.length) {
    const { data, error } = await db.from("brand_profiles").select("*").in("domain", allDomains);
    if (error) throw error;
    for (const r of data ?? []) profiles[r.domain] = toDTO(r as unknown as Record<string, unknown>);
  }
  const missingDomains = t.domains.filter((d) => {
    const p = profiles[d];
    return !p || stale(p.status, p.retrieved_at);
  });
  return {
    profiles,
    byName,
    missing: [...missingDomains, ...missingNames.map((n) => n.name)],
    missingDomains,
    missingNames,
  };
}

function publicState(s: Awaited<ReturnType<typeof readState>>): CompetitorBrandsDTO {
  return { profiles: s.profiles, byName: s.byName, missing: s.missing };
}

async function pickCandidate(
  n: NameTarget,
  industry: string | null,
  candidates: { domain: string; name: string; description: string | null }[],
): Promise<number> {
  try {
    const out = await generateJSON<{ choice: number }>({
      name: "brand_disambiguation",
      effort: "low",
      instructions:
        "Decide which directory entry is the same company a research source mentions. Choose only when the entry's description clearly fits what the source says and the market; companies that merely share the name are not matches. Answer 0 when unsure.",
      input: [
        `Company named in the source: ${n.name}`,
        `What the source says about it: ${n.description.slice(0, 500) || "(no description)"}`,
        `Market of the startup being analysed: ${industry ?? "unknown"}`,
        "Directory entries:",
        ...candidates.map((c, i) => `${i + 1}. ${c.name} — ${c.domain} — ${(c.description ?? "no description").slice(0, 320)}`),
      ].join("\n"),
      schema: schema.obj({ choice: schema.int("1-based number of the matching entry, or 0 if none clearly matches") }),
    });
    const k = Math.round(Number(out.choice));
    return k >= 1 && k <= candidates.length ? k : 0;
  } catch (err) {
    console.error("[brands] disambiguation failed", n.name, err);
    return 0;
  }
}

export async function startupCompetitorBrands(slug: string): Promise<CompetitorBrandsDTO> {
  return publicState(await readState(await targetsFor(slug)));
}

/** Looks up brands for this startup's competitors that have not been fetched yet (bounded per call). */
export async function enrichStartupCompetitorBrands(slug: string): Promise<CompetitorBrandsDTO> {
  const t = await targetsFor(slug);
  const state = await readState(t);
  let budget = MAX_LOOKUPS_PER_REQUEST;

  const stopFor = (err: unknown) => err instanceof ContextDevError && [402, 429].includes(err.status);
  const messageOf = (err: unknown) => (err instanceof ContextDevError ? err.userMessage : "Brand lookup failed");

  for (const domain of state.missingDomains) {
    if (budget-- <= 0) break;
    try {
      const { brand } = await brandRetrieve({ domain });
      await db.from("brand_profiles").upsert(brand ? { ...profileRow(brand), domain } : emptyRow(domain, "not_found", null));
    } catch (err) {
      console.error("[brands] domain lookup failed", domain, err);
      await db.from("brand_profiles").upsert(emptyRow(domain, "error", messageOf(err)));
      if (stopFor(err)) return startupCompetitorBrands(slug);
    }
  }

  for (const n of state.missingNames) {
    if (budget-- <= 0) break;
    const base = { lookup_key: n.key, name: n.name, industry: t.industry, retrieved_at: new Date().toISOString() };
    try {
      // Directory search → AI picks the candidate whose description matches what the source says
      // about the company (or none) → full brand read for that one domain.
      const candidates = sameNameCandidates(n.name, await brandSearch(n.name));
      let accepted: BrandInfo | null = null;
      let rejected: string | null = null;
      const choice = candidates.length ? await pickCandidate(n, t.industry, candidates) : 0;
      const chosen = choice > 0 ? candidates[choice - 1] : undefined;
      if (chosen) {
        const { brand } = await brandRetrieve({ domain: chosen.domain });
        if (brand && brandMatchesCompetitor(n.name, brand.domain, brand.title)) accepted = brand;
        else rejected = chosen.domain;
      } else if (candidates[0]) {
        rejected = candidates[0].domain;
      }
      if (accepted) {
        await db.from("brand_profiles").upsert(profileRow(accepted));
        await db.from("brand_name_lookups").upsert({ ...base, status: "found", domain: accepted.domain, error: null });
      } else {
        await db
          .from("brand_name_lookups")
          .upsert({ ...base, status: rejected ? "rejected" : "not_found", domain: rejected, error: null });
      }
    } catch (err) {
      console.error("[brands] name lookup failed", n.name, err);
      await db.from("brand_name_lookups").upsert({ ...base, status: "error", domain: null, error: messageOf(err) });
      if (stopFor(err)) break;
    }
  }
  return startupCompetitorBrands(slug);
}

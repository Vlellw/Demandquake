// Pure helpers shared by the research pipeline and tests (client-safe).
import { SIGNAL_META } from "./taxonomy";
import type { EvidenceStrength, SignalType } from "./types";

export function normalizeQueryKey(query: string, industry?: string | null, geography?: string | null): string {
  const q = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [q, (industry ?? "").toLowerCase(), (geography ?? "").toLowerCase()].join("|");
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "ref" || key === "fbclid" || key === "gclid") u.searchParams.delete(key);
    }
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Evidence strength is derived from counts, not model opinion:
 * strong   = 5+ distinct sources spanning 2+ signal types
 * moderate = 3+ distinct sources
 * emerging = fewer
 */
export function computeEvidenceStrength(distinctSources: number, distinctTypes: number): {
  level: EvidenceStrength;
  reason: (types: string[]) => string;
} {
  const level: EvidenceStrength =
    distinctSources >= 5 && distinctTypes >= 2 ? "strong" : distinctSources >= 3 ? "moderate" : "emerging";
  return {
    level,
    reason: (types) => {
      const labels = types.map((t) => SIGNAL_META[t as SignalType]?.short.toLowerCase() ?? t).join(", ");
      return `${distinctSources} independent source${distinctSources === 1 ? "" : "s"} across ${distinctTypes} signal type${distinctTypes === 1 ? "" : "s"}${labels ? ` (${labels})` : ""}.`;
    },
  };
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "startup"
  );
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/** Freshness bucket for a timestamp, used by filters and badges. */
export function freshnessOf(iso: string | null | undefined, now = Date.now()): "24h" | "7d" | "30d" | "older" {
  if (!iso) return "older";
  const age = now - new Date(iso).getTime();
  if (age <= 24 * 3600_000) return "24h";
  if (age <= 7 * 24 * 3600_000) return "7d";
  if (age <= 30 * 24 * 3600_000) return "30d";
  return "older";
}

export function matchesFreshness(iso: string | null | undefined, filter: string, now = Date.now()): boolean {
  if (filter === "all") return true;
  const bucket = freshnessOf(iso, now);
  const order = ["24h", "7d", "30d", "older"];
  return order.indexOf(bucket) <= order.indexOf(filter);
}

const REF_GROUP = /\s*[\(\[](?:\s*(?:[SCN]\d{1,2})\s*(?:[,;&/]|and)?\s*)+[\)\]]/g;

/** Removes stray citation labels like "(S1, S3)" from AI prose; citations live in structured refs. */
export function stripRefLabels(text: string): string {
  return text.replace(REF_GROUP, "").replace(/\s{2,}/g, " ").trim();
}

/** Deep-clean every string in an AI output except ref/refs fields. */
export function cleanRefLabels<T>(value: T, key?: string): T {
  if (key === "ref" || key === "refs") return value;
  if (typeof value === "string") return stripRefLabels(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => cleanRefLabels(v, key)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = cleanRefLabels(v, k);
    return out as T;
  }
  return value;
}

function escapeRegExp(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replaces whole-word mentions of a brand name inside any string or JSON value (case-insensitive). */
export function replaceBrandName<T>(value: T, oldName: string, nextName: string): T {
  if (!oldName.trim()) return value;
  const pattern = new RegExp(`\\b${escapeRegExp(oldName)}\\b`, "gi");
  if (typeof value === "string") return value.replace(pattern, () => nextName) as T;
  if (value == null || typeof value !== "object") return value;
  const safeNext = JSON.stringify(nextName).slice(1, -1);
  return JSON.parse(JSON.stringify(value).replace(pattern, () => safeNext)) as T;
}

function brandTokens(v: string): string[] {
  return v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/[\s.-]+/)
    .filter((t) => t.length >= 3 && !["inc", "the", "com", "corp", "llc", "ltd", "health", "software", "app", "www"].includes(t));
}

/**
 * A domain's brand only belongs to a competitor when the names plausibly refer to the same
 * company — guards against a source page's domain (e.g. a review site) lending its logo.
 */
export function brandMatchesCompetitor(competitorName: string, domain: string, brandTitle: string | null): boolean {
  const name = competitorName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!name) return false;
  const label = (domain.toLowerCase().replace(/^www\./, "").split(".")[0] ?? "").replace(/[^a-z0-9]/g, "");
  const title = (brandTitle ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (label.length >= 3 && (name.includes(label) || label.includes(name))) return true;
  if (title.length >= 3 && (name.includes(title) || title.includes(name))) return true;
  const a = new Set(brandTokens(competitorName));
  return [...brandTokens(brandTitle ?? ""), ...brandTokens(label)].some((t) => a.has(t));
}

/** Directory candidates that plausibly carry the competitor's name, exact matches first. */
export function sameNameCandidates<C extends { domain: string; name: string }>(competitorName: string, candidates: C[], max = 5): C[] {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(competitorName);
  const plausible = candidates.filter((c) => brandMatchesCompetitor(competitorName, c.domain, c.name));
  return [...plausible.filter((c) => norm(c.name) === target), ...plausible.filter((c) => norm(c.name) !== target)].slice(0, max);
}

export function brandNameKey(name: string, industry: string | null): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}|${(industry ?? "").toLowerCase()}`;
}

/**
 * Home-page market-shift feed: scans that changed an assessment come first (newest first),
 * then "no material change" scans fill remaining slots so the feed never looks empty.
 */
export function pickQuakeFeed<T extends { verdict: string | null; changes: unknown[]; completed_at: string | null; created_at: string }>(
  scans: T[],
  limit: number,
): T[] {
  const at = (s: T) => new Date(s.completed_at ?? s.created_at).getTime();
  const material = (s: T) => s.verdict !== "unchanged" && s.verdict !== null && s.changes.length > 0;
  const sorted = [...scans].sort((a, b) => at(b) - at(a));
  return [...sorted.filter(material), ...sorted.filter((s) => !material(s))].slice(0, limit);
}

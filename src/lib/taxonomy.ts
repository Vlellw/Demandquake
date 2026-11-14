import type {
  DimensionKey,
  Implication,
  Level,
  SignalType,
  TimelineCategory,
  Glyph,
} from "./types";

export const INDUSTRIES = [
  "Manufacturing",
  "Healthcare",
  "Education",
  "Finance & Insurance",
  "Climate & Energy",
  "Logistics & Mobility",
  "Retail & Commerce",
  "Software & AI",
  "Public Sector & Legal",
  "Real Estate & Construction",
  "Food & Agriculture",
  "Work & HR",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const GEOGRAPHIES = [
  "Global",
  "Europe",
  "North America",
  "Asia-Pacific",
  "Latin America",
  "Middle East & Africa",
] as const;

export const BUSINESS_MODELS = [
  "B2B SaaS",
  "Marketplace",
  "Usage-based API",
  "Software + services",
  "Hardware + software",
  "Transactional",
  "Consumer subscription",
] as const;

export const FRESHNESS_FILTERS = [
  { value: "all", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

/** Category color token (CSS variable) for an industry. */
export function industryColor(industry: string | null | undefined): string {
  const idx = INDUSTRIES.indexOf((industry ?? "") as Industry);
  if (idx < 0) return "var(--faint)";
  return `var(--cat-${idx + 1})`;
}

export const LEVEL_META: Record<Level, { label: string; rank: number; tone: string }> = {
  strong: { label: "Strong", rank: 3, tone: "positive" },
  moderate: { label: "Moderate", rank: 2, tone: "moderate" },
  weak: { label: "Weak", rank: 1, tone: "negative" },
  unknown: { label: "Unvalidated", rank: 0, tone: "uncertain" },
};

export const DIMENSION_META: Record<DimensionKey, { label: string; question: string }> = {
  problem_evidence: {
    label: "Problem evidence",
    question: "How well do independent sources document the problem?",
  },
  market_timing: {
    label: "Market timing",
    question: "Is something changing now that makes this problem urgent?",
  },
  customer_clarity: {
    label: "Customer clarity",
    question: "Is it clear who has the problem and who would pay?",
  },
  differentiation: {
    label: "Competitive differentiation",
    question: "Is there a credible gap versus existing solutions?",
  },
  monetization: {
    label: "Monetization hypothesis",
    question: "Is there a plausible way to charge for the solution?",
  },
  validation_status: {
    label: "Customer validation",
    question: "Has demand been confirmed with real customers yet?",
  },
};

export const SIGNAL_META: Record<SignalType, { label: string; short: string }> = {
  complaint: { label: "Customer complaint", short: "Complaint" },
  regulation: { label: "Regulatory change", short: "Regulation" },
  news: { label: "Industry news", short: "News" },
  company: { label: "Company announcement", short: "Company" },
  technology: { label: "Technology shift", short: "Technology" },
  discussion: { label: "Public discussion", short: "Discussion" },
  request: { label: "Request for a solution", short: "Request" },
  research: { label: "Research / data", short: "Research" },
};

export function signalLabel(t: string | null | undefined): string {
  if (!t) return "Source";
  return SIGNAL_META[t as SignalType]?.short ?? "Source";
}

export const TIMELINE_META: Record<TimelineCategory, { label: string; short: string }> = {
  demand_signal: { label: "Emerging demand signal", short: "Demand" },
  market_development: { label: "New market development", short: "Market" },
  competitor_activity: { label: "Competitor activity", short: "Competitors" },
  regulatory_change: { label: "Regulatory change", short: "Regulation" },
  tech_breakthrough: { label: "Technological breakthrough", short: "Technology" },
  potential_threat: { label: "Potential threat", short: "Threat" },
};

export const IMPLICATION_META: Record<Implication, { label: string; color: string }> = {
  positive: { label: "Strengthens", color: "var(--positive)" },
  negative: { label: "Weakens", color: "var(--negative)" },
  uncertain: { label: "Uncertain", color: "var(--uncertain)" },
};

export const GLYPH_LIST: Glyph[] = ["orbit", "stack", "wave", "prism", "knot", "spark", "grid", "arc"];

export const EXAMPLE_QUERIES = [
  "Find startup opportunities in European manufacturing",
  "Discover unmet needs created by recent AI developments",
  "Find problems healthcare providers are discussing",
  "Identify business opportunities caused by new regulations",
  "Find underserved customers in the education market",
];

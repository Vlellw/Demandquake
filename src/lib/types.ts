// Client-safe shapes for research data stored as JSON in the database.

export type Level = "strong" | "moderate" | "weak" | "unknown";
export type Implication = "positive" | "negative" | "uncertain";
export type EvidenceStrength = "strong" | "moderate" | "emerging";

export const SIGNAL_TYPES = [
  "complaint",
  "regulation",
  "news",
  "company",
  "technology",
  "discussion",
  "request",
  "research",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const TIMELINE_CATEGORIES = [
  "demand_signal",
  "market_development",
  "competitor_activity",
  "regulatory_change",
  "tech_breakthrough",
  "potential_threat",
] as const;
export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];

export const DIMENSION_KEYS = [
  "problem_evidence",
  "market_timing",
  "customer_clarity",
  "differentiation",
  "monetization",
  "validation_status",
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const GLYPHS = ["orbit", "stack", "wave", "prism", "knot", "spark", "grid", "arc"] as const;
export type Glyph = (typeof GLYPHS)[number];

export interface SourceRecord {
  id: string;
  url: string;
  domain: string;
  title: string;
  snippet: string | null;
  highlights: string[];
  publisher: string | null;
  published_at: string | null;
  retrieved_at: string;
  origin: "web" | "news" | "competitor" | "scan" | string;
  article_type: string | null;
  search_intent: string | null;
  search_query: string | null;
  relevance: string | null;
  signal_type: SignalType | string | null;
  scan_id: string | null;
}

export interface Signal {
  claim: string;
  source_id: string;
  signal_type: SignalType;
  affected: string | null;
}

export interface Brand {
  hue: number;
  glyph: Glyph;
  motto: string;
}

export interface Fact {
  claim: string;
  source_ids: string[];
}

export interface StartupProblem {
  statement: string;
  who_is_affected: string;
  why_now: string;
  facts: Fact[];
}

export interface Feature {
  title: string;
  description: string;
  addresses: string;
}

export interface StartupSolution {
  summary: string;
  features: Feature[];
}

export interface CustomerSegment {
  segment: string;
  description: string;
  pain: string;
  buyer: string;
}

export interface BusinessModel {
  type: string;
  pricing_hypothesis: string;
  revenue_streams: string[];
  unit_of_value: string;
  /** AI-proposed position on the competitor landscape axes (absent on older profiles). */
  target_scope?: "point" | "suite" | "platform";
  target_segment?: "smb" | "mid_market" | "enterprise";
}

export type Coverage = "yes" | "partial" | "no" | "unknown";

export interface Competitor {
  name: string;
  domain: string | null;
  url: string | null;
  source_id: string | null;
  description: string;
  kind: "direct" | "adjacent" | "incumbent" | "workaround";
  strengths: string;
  gap: string;
  scope: "point" | "suite" | "platform";
  segment: "smb" | "mid_market" | "enterprise";
  feature_coverage: { feature: string; coverage: Coverage }[];
  detected_in_scan?: string | null;
}

export interface Differentiator {
  point: string;
  rationale: string;
}

export interface AssessmentDimension {
  key: DimensionKey;
  level: Level;
  reasoning: string;
  source_ids: string[];
}

export interface Assessment {
  summary: string;
  dimensions: AssessmentDimension[];
  updated_at: string;
}

export interface ValidationStep {
  title: string;
  description: string;
  method: string;
  success_signal: string;
}

export interface TimelineEvent {
  id: string;
  source_id: string | null;
  date: string | null;
  discovered_at: string;
  category: TimelineCategory;
  implication: Implication;
  title: string;
  note: string;
  scan_id?: string | null;
}

export type PitchKind = "problem" | "evidence" | "solution" | "customer" | "opportunity";

export interface PitchSlide {
  kind: PitchKind;
  headline: string;
  body: string;
}

export interface BusinessPlan {
  roadmap: { phase: string; horizon: string; goals: string[] }[];
  go_to_market: string[];
  key_risks: { risk: string; mitigation: string }[];
}

export interface Hypothesis {
  statement: string;
  type: "market" | "customer" | "pricing" | "product" | "competition";
  how_to_test: string;
}

export interface ScanChange {
  source_id: string;
  category: TimelineCategory;
  implication: Implication;
  title: string;
  explanation: string;
  affected_dimensions: DimensionKey[];
}

export type ScanVerdict = "strengthened" | "weakened" | "mixed" | "unchanged";

export type RunStatus =
  | "queued"
  | "planning"
  | "planned"
  | "searching"
  | "searched"
  | "analyzing"
  | "analyzed"
  | "investigating"
  | "generating"
  | "complete"
  | "failed";

export interface ResearchPlan {
  interpretation?: string;
  industry?: string;
  geography?: string;
  searches?: { intent: string; query: string }[];
  news_query?: string;
}

export interface RunStats {
  sources?: number;
  domains?: number;
  news?: number;
  by_intent?: Record<string, number>;
  clusters?: number;
  competitors?: number;
  startups?: number;
  credits_used?: number;
  failed_stage?: string;
  cached_hits?: number;
  rate_wait_until?: string | null;
}

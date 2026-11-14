// Client-safe DTO shapes returned by server functions.
import type {
  Assessment,
  Brand,
  BusinessModel,
  BusinessPlan,
  Competitor,
  CustomerSegment,
  Differentiator,
  Hypothesis,
  PitchSlide,
  ResearchPlan,
  RunStats,
  ScanChange,
  Signal,
  SourceRecord,
  StartupProblem,
  StartupSolution,
  TimelineEvent,
  ValidationStep,
} from "./types";

export interface StartupCardDTO {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  industry: string | null;
  geography: string | null;
  business_model_type: string | null;
  brand: Brand;
  research_at: string;
  last_scanned_at: string | null;
  claim_count: number;
  evidence_count: number;
  competitor_count: number;
  assessment: Assessment | null;
  evidence_strength: string | null;
  problem_title: string | null;
  run_query: string | null;
}

export interface ClusterDTO {
  id: string;
  run_id: string;
  rank: number;
  title: string;
  summary: string;
  affected_users: string | null;
  why_now: string | null;
  industry: string | null;
  geography: string | null;
  category: string | null;
  evidence_strength: string;
  strength_reason: string | null;
  source_ids: string[];
  competitor_source_ids: string[];
  signals: Signal[];
  generation_status: string;
  generation_error: string | null;
  startup_id: string | null;
  created_at: string;
}

export interface RadarNodeDTO {
  id: string;
  title: string;
  summary: string;
  industry: string | null;
  geography: string | null;
  category: string | null;
  evidence_strength: string;
  strength_reason: string | null;
  signal_count: number;
  signal_types: string[];
  run_id: string;
  run_query: string | null;
  created_at: string;
  startup: { slug: string; name: string; tagline: string; brand: Brand } | null;
}

export interface RunDTO {
  id: string;
  query: string;
  industry: string | null;
  geography: string | null;
  status: string;
  plan: ResearchPlan;
  stats: RunStats;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  stage_started_at: string | null;
}

export interface RunDetailDTO {
  run: RunDTO;
  sources: SourceRecord[];
  clusters: ClusterDTO[];
  startups: StartupCardDTO[];
}

export interface ScanSummaryDTO {
  id: string;
  status: string;
  verdict: string | null;
  headline: string | null;
  summary: string | null;
  candidates_count: number;
  changes: ScanChange[];
  created_at: string;
  completed_at: string | null;
}

export interface StartupDetailDTO {
  startup: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    industry: string | null;
    geography: string | null;
    business_model_type: string | null;
    brand: Brand;
    problem: StartupProblem;
    solution: StartupSolution;
    customers: CustomerSegment[];
    business_model: BusinessModel;
    competitors: Competitor[];
    differentiation: Differentiator[];
    assessment: Assessment;
    validation_steps: ValidationStep[];
    timeline: TimelineEvent[];
    pitch: { slides: PitchSlide[] };
    business_plan: BusinessPlan;
    hypotheses: Hypothesis[];
    monitor_queries: string[];
    evidence_source_ids: string[];
    claim_count: number;
    research_at: string;
    last_scanned_at: string | null;
    created_at: string;
  };
  cluster: ClusterDTO | null;
  run: { id: string; query: string; created_at: string; plan: ResearchPlan } | null;
  sources: SourceRecord[];
  scans: ScanSummaryDTO[];
}

export interface ScanDetailDTO {
  scan: ScanSummaryDTO & {
    startup_id: string;
    window_days: number;
    queries: string[];
    new_source_ids: string[];
    assessment_before: Assessment | null;
    assessment_after: Assessment | null;
    error: string | null;
  };
  sources: SourceRecord[];
}

export interface ProjectDTO {
  id: string;
  startup_id: string | null;
  name: string;
  tagline: string | null;
  concept: string | null;
  brand: Brand;
  assumptions: ProjectAssumption[];
  checklist: ProjectCheck[];
  roadmap: ProjectPhase[];
  updates: ProjectUpdate[];
  pitch: { slides: PitchSlide[] };
  research: ProjectResearch;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssumption {
  id: string;
  text: string;
  type: string;
  how_to_test: string;
  status: "untested" | "validated" | "invalidated";
}

export interface ProjectCheck {
  id: string;
  title: string;
  description: string;
  method: string;
  success_signal: string;
  done: boolean;
}

export interface ProjectPhase {
  id: string;
  phase: string;
  horizon: string;
  items: { id: string; text: string; done: boolean }[];
}

export interface ProjectUpdate {
  id: string;
  at: string;
  kind: "claimed" | "note" | "scan";
  title: string;
  text: string;
  url?: string | null;
}

export interface ProjectResearch {
  startup_slug?: string;
  research_at?: string;
  industry?: string | null;
  geography?: string | null;
  problem?: StartupProblem;
  customers?: CustomerSegment[];
  business_model?: BusinessModel;
  competitors?: { name: string; url: string | null; gap: string }[];
  sources?: { id: string; title: string; url: string; domain: string; published_at: string | null; signal_type: string | null }[];
  assessment?: Assessment;
}

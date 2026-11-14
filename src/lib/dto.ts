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
  /** AI synthesis of who the sources say is affected. */
  who_is_affected: string | null;
  /** AI synthesis of what changed recently, per the sources. */
  why_now: string | null;
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

export interface QuakeFeedItemDTO extends ScanSummaryDTO {
  startup: { slug: string; name: string; industry: string | null; geography: string | null; brand: Brand };
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
  /** True when the signed-in user claimed this project; false for invited co-founders. */
  is_owner: boolean;
  owner_name: string | null;
  member_count: number;
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
  kind: "claimed" | "note" | "scan" | "member";
  title: string;
  text: string;
  url?: string | null;
  /** Display name of the co-founder who wrote a note or joined. */
  author?: string | null;
}

export interface ProjectMemberDTO {
  user_id: string;
  display_name: string;
  joined_at: string;
}

export interface ProjectInviteDTO {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export interface ProjectTeamDTO {
  is_owner: boolean;
  owner_name: string | null;
  members: ProjectMemberDTO[];
  /** Active invite links — only returned to the owner. */
  invites: ProjectInviteDTO[];
}

export interface InvitePreviewDTO {
  status: "valid" | "owner" | "member" | "revoked" | "expired" | "not_found";
  project_id: string | null;
  project_name: string | null;
  tagline: string | null;
  brand: Brand | null;
  owner_name: string | null;
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

/** Context.dev brand profile cached per domain. `status` distinguishes "no brand found" from errors. */
export interface BrandProfileDTO {
  domain: string;
  status: "found" | "not_found" | "error";
  title: string | null;
  description: string | null;
  slogan: string | null;
  logo_url: string | null;
  icon_url: string | null;
  colors: { hex: string; name: string | null }[];
  employees: string | null;
  hq_country: string | null;
  industries: string[];
  retrieved_at: string;
}

export interface CompetitorBrandsDTO {
  profiles: Record<string, BrandProfileDTO>;
  /** Competitor name → brand domain, for competitors without a sourced domain matched by name. */
  byName: Record<string, string>;
  /** Lookups (domains or competitor names) not fetched yet, or a stale failed attempt. */
  missing: string[];
}

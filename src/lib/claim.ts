// Pure transformation from an unclaimed startup to a founder workspace (client-safe, tested).
import type { ProjectAssumption, ProjectCheck, ProjectPhase, ProjectResearch, ProjectUpdate } from "./dto";
import type {
  Assessment,
  Brand,
  BusinessModel,
  BusinessPlan,
  Competitor,
  CustomerSegment,
  Hypothesis,
  PitchSlide,
  StartupProblem,
  StartupSolution,
  ValidationStep,
} from "./types";

export interface StartupForClaim {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  industry: string | null;
  geography: string | null;
  brand: Brand;
  problem: StartupProblem;
  solution: StartupSolution;
  customers: CustomerSegment[];
  business_model: BusinessModel;
  competitors: Competitor[];
  assessment: Assessment;
  validation_steps: ValidationStep[];
  pitch: { slides: PitchSlide[] };
  business_plan: BusinessPlan;
  hypotheses: Hypothesis[];
  research_at: string;
}

let counter = 0;
const id = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function buildProjectFromStartup(
  st: StartupForClaim,
  sources: { id: string; title: string; url: string; domain: string; published_at: string | null; signal_type: string | null }[],
  nowIso: string,
) {
  const assumptions: ProjectAssumption[] = (st.hypotheses ?? []).map((h) => ({
    id: id("a"),
    text: h.statement,
    type: h.type,
    how_to_test: h.how_to_test,
    status: "untested",
  }));
  const checklist: ProjectCheck[] = (st.validation_steps ?? []).map((v) => ({
    id: id("c"),
    title: v.title,
    description: v.description,
    method: v.method,
    success_signal: v.success_signal,
    done: false,
  }));
  const roadmap: ProjectPhase[] = (st.business_plan?.roadmap ?? []).map((p) => ({
    id: id("p"),
    phase: p.phase,
    horizon: p.horizon,
    items: (p.goals ?? []).map((g) => ({ id: id("i"), text: g, done: false })),
  }));
  const research: ProjectResearch = {
    startup_slug: st.slug,
    research_at: st.research_at,
    industry: st.industry,
    geography: st.geography,
    problem: st.problem,
    customers: st.customers,
    business_model: st.business_model,
    competitors: (st.competitors ?? []).map((c) => ({ name: c.name, url: c.url, gap: c.gap })),
    sources: sources.map((s) => ({ ...s })),
    assessment: st.assessment,
  };
  const updates: ProjectUpdate[] = [
    {
      id: id("u"),
      at: nowIso,
      kind: "claimed",
      title: `Claimed ${st.name}`,
      text: `Workspace created from the Demandquake opportunity with ${sources.length} supporting sources. Every claim and assumption below is a starting point to validate.`,
      url: null,
    },
  ];
  const concept = [st.solution?.summary, "", "Problem: " + (st.problem?.statement ?? "")].join("\n").trim();
  return {
    startup_id: st.id,
    name: st.name,
    tagline: st.tagline,
    concept,
    brand: st.brand,
    assumptions,
    checklist,
    roadmap,
    updates,
    pitch: st.pitch ?? { slides: [] },
    research,
  };
}

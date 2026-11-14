import { useState } from "react";
import type { BrandProfileDTO } from "@/lib/dto";
import { brandMatchesCompetitor } from "@/lib/research-utils";
import { useCompetitorBrands } from "@/hooks/use-competitor-brands";
import { motion } from "motion/react";
import { Building2, Check, CircleDashed, ExternalLink, Globe2, Loader2, MapPin, Minus, Sparkles, Users, X } from "lucide-react";
import type { Brand, BusinessModel, Competitor, Coverage, Differentiator, Feature } from "@/lib/types";
import { StartupMark } from "@/components/brand/StartupMark";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { InferredTag, ObservedTag } from "@/components/common/Provenance";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Cite } from "./SourceDrawer";
import { cn } from "@/lib/utils";

const SCOPES = ["point", "suite", "platform"] as const;
const SEGMENTS = ["enterprise", "mid_market", "smb"] as const;
const SCOPE_LABEL = { point: "Point solution", suite: "Suite", platform: "Platform" };
const SEGMENT_LABEL = { smb: "SMB", mid_market: "Mid-market", enterprise: "Enterprise" };
const KIND_LABEL: Record<Competitor["kind"], string> = {
  direct: "Direct",
  adjacent: "Adjacent",
  incumbent: "Incumbent",
  workaround: "Workaround",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function normalDomain(d: string | null): string | null {
  if (!d) return null;
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") || null;
}

type MatchedBrand = BrandProfileDTO & { via: "domain" | "name" };

/** The competitor's verified brand profile, or null when the lookup is missing or names don't match. */
function brandFor(c: Competitor, profiles: Record<string, BrandProfileDTO>, byName: Record<string, string>): MatchedBrand | null {
  const d = normalDomain(c.domain);
  if (d) {
    const p = profiles[d];
    if (!p || p.status !== "found") return null;
    return brandMatchesCompetitor(c.name, p.domain, p.title) ? { ...p, via: "domain" } : null;
  }
  const resolved = byName[c.name];
  const p = resolved ? profiles[resolved] : undefined;
  return p && p.status === "found" ? { ...p, via: "name" } : null;
}

function CompetitorMark({ c, brand, className, iconClassName }: { c: Competitor; brand: BrandProfileDTO | null; className?: string; iconClassName?: string }) {
  const [broken, setBroken] = useState(false);
  const src = !broken ? (brand?.icon_url ?? null) : null;
  return (
    <span className={cn("flex items-center justify-center overflow-hidden border bg-surface-raised text-[10px] font-semibold text-foreground", className)}>
      {src ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      ) : c.domain ? (
        <SourceFavicon domain={c.domain} className={iconClassName ?? "size-4"} />
      ) : (
        initials(c.name)
      )}
    </span>
  );
}

function CompetitorDot({ c, brand, active, onHover }: { c: Competitor; brand: BrandProfileDTO | null; active: boolean; onHover: (n: string | null) => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={c.name}
          onMouseEnter={() => onHover(c.name)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(c.name)}
          onBlur={() => onHover(null)}
          className={cn("rounded-full transition-transform", active && "scale-110")}
        >
          <CompetitorMark
            c={c}
            brand={brand}
            className={cn("size-9 rounded-full", active ? "border-observed" : "border-border-strong")}
            iconClassName="size-5"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{c.name}</p>
        <p className="text-muted-foreground">
          {KIND_LABEL[c.kind]} · {SCOPE_LABEL[c.scope]} · {SEGMENT_LABEL[c.segment]}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MarketLandscape({
  slug,
  startup,
  competitors,
  features,
  differentiation,
  businessModel,
}: {
  slug: string;
  startup: { name: string; brand: Brand };
  competitors: Competitor[];
  features: Feature[];
  differentiation: Differentiator[];
  businessModel: BusinessModel;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const { profiles, byName, looking } = useCompetitorBrands(slug);
  const brandOf = (c: Competitor) => brandFor(c, profiles, byName);
  const proposed = businessModel.target_scope && businessModel.target_segment
    ? { scope: businessModel.target_scope, segment: businessModel.target_segment }
    : null;

  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        <div className="panel p-6 text-center">
          <CircleDashed className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-display text-lg text-foreground">No named competitors surfaced in the live research</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Demandquake only lists companies explicitly named in retrieved sources. An empty landscape is a signal to validate — talk to buyers about what they use today.
          </p>
        </div>
        <Differentiation items={differentiation} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="panel p-5 xl:sticky xl:top-32">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="mt-1 font-display text-lg font-semibold text-foreground">Where existing solutions sit</h3>
            </div>
            <InferredTag label="AI-placed" />
          </div>
          <div className="mt-5 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1.5">
            <div />
            {SCOPES.map((sc) => (
              <p key={sc} className="pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {SCOPE_LABEL[sc]}
              </p>
            ))}
            {SEGMENTS.map((seg) => (
              <div key={seg} className="contents">
                <p className="flex items-center pr-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] rotate-180 sm:rotate-0 sm:[writing-mode:horizontal-tb]">
                  {SEGMENT_LABEL[seg]}
                </p>
                {SCOPES.map((sc) => {
                  const here = competitors.filter((c) => c.scope === sc && c.segment === seg);
                  const isProposed = proposed?.scope === sc && proposed?.segment === seg;
                  return (
                    <div
                      key={sc}
                      className={cn(
                        "flex min-h-[86px] flex-wrap content-center items-center justify-center gap-1.5 rounded-lg border p-2",
                        isProposed ? "border-dashed border-inferred/60 bg-inferred/[0.06]" : here.length ? "border-border bg-surface-sunken/70" : "border-border/50 bg-surface-sunken/30",
                      )}
                    >
                      {here.map((c) => (
                        <CompetitorDot key={c.name} c={c} brand={brandOf(c)} active={hover === c.name} onHover={setHover} />
                      ))}
                      {isProposed && (
                        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1">
                          <StartupMark brand={startup.brand} size="sm" />
                          <span className="text-[10px] font-semibold text-inferred">{startup.name}</span>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {proposed
              ? `Competitors are named in live sources; their placement and the proposed position for ${startup.name} (dashed) are AI interpretation.`
              : "Competitors are named in live sources; their placement on these axes is AI interpretation."}
          </p>
        </section>

        <section className="space-y-3">
          {looking && (
            <p className="inline-flex items-center gap-2 rounded-full border border-observed/25 bg-observed/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-observed">
              <Loader2 className="size-3 animate-spin" /> Looking up company brands on Context.dev
            </p>
          )}
          {competitors.map((c) => {
            const brand = brandOf(c);
            const accent = brand?.colors[0]?.hex;
            return (
            <div
              key={c.name}
              onMouseEnter={() => setHover(c.name)}
              onMouseLeave={() => setHover(null)}
              className={cn("panel relative overflow-hidden p-4 transition-colors", hover === c.name && "border-observed/50")}
            >
              {accent && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />}
              <div className="flex flex-wrap items-center gap-2">
                <CompetitorMark c={c} brand={brand} className="size-8 rounded-md border-border" />
                <p className="font-display text-base font-semibold text-foreground">{c.name}</p>
                <Badge variant="outline">{KIND_LABEL[c.kind]}</Badge>
                {c.detected_in_scan && <Badge variant="live">New in scan</Badge>}
                {c.source_id && <Cite ids={[c.source_id]} className="ml-auto" />}
              </div>
              <p className="mt-2 text-sm text-foreground/85">
                <span className="mr-1.5 align-middle">
                  <ObservedTag label="Source says" />
                </span>
                {c.description}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-foreground/[0.03] p-2.5">
                  <p className="data-label">Strengths · AI view</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.strengths}</p>
                </div>
                <div className="rounded-md border border-dashed border-inferred/30 bg-inferred/[0.04] p-2.5">
                  <p className="data-label text-inferred">Gap · opportunity</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.gap}</p>
                </div>
              </div>
              {brand && <BrandProfile brand={brand} />}
            </div>
            );
          })}
        </section>
      </div>

      {features.length > 0 && (
        <section className="panel overflow-x-auto p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="mt-1 font-display text-lg font-semibold text-foreground">What the proposed product covers that others don’t</h3>
            </div>
            <InferredTag label="AI comparison" />
          </div>
          <table className="mt-4 w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 text-left font-normal text-muted-foreground">Capability</th>
                <th className="px-2 py-2 text-center">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-inferred">
                    <Sparkles className="size-3.5" /> {startup.name}
                  </span>
                </th>
                {competitors.map((c) => (
                  <th key={c.name} className={cn("px-2 py-2 text-center font-medium text-foreground/80", hover === c.name && "text-observed")}>
                    <span className="inline-flex flex-col items-center gap-1">
                      <CompetitorMark c={c} brand={brandOf(c)} className="size-5 rounded border-border" iconClassName="size-3" />
                      {c.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.title} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 text-foreground/90">{f.title}</td>
                  <td className="px-2 text-center">
                    <CoverageIcon coverage="yes" proposed />
                  </td>
                  {competitors.map((c) => (
                    <td key={c.name} className="px-2 text-center">
                      <CoverageIcon coverage={c.feature_coverage.find((x) => x.feature === f.title)?.coverage ?? "unknown"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CoverageIcon coverage="yes" /> Covers</span>
            <span className="inline-flex items-center gap-1"><CoverageIcon coverage="partial" /> Partially</span>
            <span className="inline-flex items-center gap-1"><CoverageIcon coverage="no" /> Not covered</span>
            <span className="inline-flex items-center gap-1"><CoverageIcon coverage="unknown" /> Unknown from sources</span>
          </div>
        </section>
      )}

      <Differentiation items={differentiation} />
    </div>
  );
}

function BrandProfile({ brand }: { brand: MatchedBrand }) {
  const facts = [
    brand.employees && { icon: Users, text: `${brand.employees} employees` },
    brand.hq_country && { icon: MapPin, text: brand.hq_country },
  ].filter(Boolean) as { icon: typeof Users; text: string }[];
  return (
    <div className="mt-3 rounded-md border border-observed/20 bg-observed/[0.035] p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="data-label inline-flex items-center gap-1 text-observed">
          <Building2 className="size-3" /> Company profile · Context.dev brand data
        </p>
        {brand.via === "name" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="rounded border border-dashed border-border-strong px-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Matched by name
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              The source names this company without a website. Context.dev found a same-name company whose profile fits what the source says (AI-checked) — confirm it is the same company.
            </TooltipContent>
          </Tooltip>
        )}
        {brand.colors.length > 0 && (
          <span className="ml-auto flex items-center gap-1" aria-label="Brand colors">
            {brand.colors.slice(0, 4).map((col) => (
              <Tooltip key={col.hex}>
                <TooltipTrigger asChild>
                  <span className="size-3 rounded-full border border-border-strong" style={{ background: col.hex }} />
                </TooltipTrigger>
                <TooltipContent>
                  {col.name ?? "Brand color"} · {col.hex}
                </TooltipContent>
              </Tooltip>
            ))}
          </span>
        )}
      </div>
      {brand.slogan && <p className="mt-1.5 text-xs italic text-foreground/80">“{brand.slogan}”</p>}
      {brand.description && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{brand.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
        {facts.map((f) => (
          <span key={f.text} className="inline-flex items-center gap-1">
            <f.icon className="size-3" /> {f.text}
          </span>
        ))}
        <a
          href={`https://${brand.domain}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-observed hover:underline"
        >
          <Globe2 className="size-3" /> {brand.domain} <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function CoverageIcon({ coverage, proposed }: { coverage: Coverage; proposed?: boolean }) {
  const cls = "mx-auto size-4";
  if (coverage === "yes") return <Check className={cn(cls, proposed ? "text-inferred" : "text-positive")} />;
  if (coverage === "partial") return <Minus className={cn(cls, "text-uncertain")} />;
  if (coverage === "no") return <X className={cn(cls, "text-negative/80")} />;
  return <span className="mx-auto block text-center font-mono text-xs text-faint">?</span>;
}

function Differentiation({ items }: { items: Differentiator[] }) {
  if (!items.length) return null;
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-2">
        <InferredTag />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((d, i) => (
          <div key={i} className="prov-inferred rounded-lg p-4">
            <p className="font-display text-sm font-semibold text-foreground">{d.point}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d.rationale}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

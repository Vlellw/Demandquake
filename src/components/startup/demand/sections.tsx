import { useState } from "react";
import { ArrowBigUp, MessageSquare, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InferredTag } from "@/components/common/Provenance";
import { formatDate } from "@/lib/format";
import {
  PERIOD_LABEL,
  PLATFORM_LABEL,
  VOICE_KIND_LABEL,
  formatCount,
  formatLooseDate,
  formatPrice,
  formatUsd,
  type FundingData,
  type LocalData,
  type MarketSizeData,
  type PricePlan,
  type PricingData,
  type ReviewsData,
  type VideosData,
  type VoicesData,
  type WhyNowData,
} from "@/lib/demand";
import { Chip, ExtLink, MiniStat, Quote, SourceLink, Stars, SubHeading } from "./parts";

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

function ShowMore({ total, shown, onClick }: { total: number; shown: number; onClick: () => void }) {
  if (total <= shown) return null;
  return (
    <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={onClick}>
      Show {total - shown} more
    </Button>
  );
}

// ---------- What customers say ----------

export function VoicesBody({ data }: { data: VoicesData }) {
  const [all, setAll] = useState(false);
  const posts = all ? data.posts : data.posts.slice(0, 5);
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-foreground/90">
        <strong className="text-primary">{plural(data.relevant, "Reddit post")}</strong> from the last 12 months describe this problem, out of {data.scanned} that matched the
        searches. Together they drew {plural(data.upvotes, "upvote")} and {plural(data.comments, "comment")}.
      </p>
      <div>
        <div className="min-w-0">
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <ExtLink href={p.url} className="text-sm font-semibold text-foreground">
                    {p.title}
                  </ExtLink>
                  <Badge variant="inferred" className="shrink-0">
                    {VOICE_KIND_LABEL[p.kind]}
                  </Badge>
                </div>
                {p.quote && p.quote !== p.title && <p className="mt-2 border-l-2 border-observed/50 pl-3 text-sm italic text-foreground/80">"{p.quote}"</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">r/{p.community}</span>
                  {p.posted_at && <span>{formatDate(p.posted_at)}</span>}
                  <span className="inline-flex items-center gap-0.5">
                    <ArrowBigUp className="size-3.5" aria-hidden="true" />
                    {p.upvotes.toLocaleString("en-US")}
                    <span className="sr-only">upvotes</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-3" aria-hidden="true" />
                    {p.comments.toLocaleString("en-US")}
                    <span className="sr-only">comments</span>
                  </span>
                  <span className="ml-auto">
                    <SourceLink href={p.url} label="Open post" />
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <ShowMore total={data.posts.length} shown={posts.length} onClick={() => setAll(true)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Searched Reddit for {data.queries.map((q) => `"${q}"`).join(" and ")}.</p>
    </div>
  );
}

// ---------- Where competitors fall short ----------

export function ReviewsBody({ data }: { data: ReviewsData }) {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium">Where</th>
              <th className="pb-2 font-medium">Rating</th>
              <th className="pb-2 font-medium">Reviews read</th>
              <th className="pb-2 font-medium">Rated 3 or lower</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {data.listings.map((l) => (
              <tr key={`${l.platform}-${l.url}`} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <span className="font-semibold text-foreground">{l.name}</span>
                  {l.name !== l.competitor && <span className="block text-xs text-muted-foreground">{l.competitor}</span>}
                </td>
                <td className="py-2.5 pr-3 text-foreground/80">{PLATFORM_LABEL[l.platform]}</td>
                <td className="py-2.5 pr-3">
                  <Stars rating={l.rating} />
                  <span className="block text-xs text-muted-foreground">
                    {l.rating_count !== null ? `${formatCount(l.rating_count)} ratings` : l.platform === "g2" ? "average of reviews read" : ""}
                  </span>
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-foreground/80">{l.reviews_read}</td>
                <td className="py-2.5 pr-3 tabular-nums text-foreground/80">{l.low_ratings}</td>
                <td className="py-2.5 text-right">
                  <SourceLink href={l.url} label="Listing" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.themes.length > 0 && (
        <div>
          <SubHeading tag={<InferredTag label="AI grouping" />}>Recurring complaints</SubHeading>
          <ol className="grid gap-4 lg:grid-cols-2">
            {data.themes.map((t, i) => (
              <li key={i} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-foreground">{t.title}</p>
                  <span className="shrink-0 text-xs font-semibold text-primary">{plural(t.mentions, "review")}</span>
                </div>
                <p className="prov-inferred mt-2 rounded-md px-2.5 py-1.5 text-sm text-foreground/80">{t.explanation}</p>
                <div className="mt-3 space-y-2">
                  {t.quotes.map((q, j) => (
                    <Quote key={j} text={q.text} url={q.url} rating={q.rating} date={q.date} platform={q.platform} by={q.product} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {data.pay_quotes.length > 0 && (
        <div>
          <SubHeading>What reviewers say about paying</SubHeading>
          <div className="grid gap-3 md:grid-cols-2">
            {data.pay_quotes.map((q, i) => (
              <Quote key={i} text={q.text} url={q.url} rating={q.rating} date={q.date} platform={q.platform} by={q.product} />
            ))}
          </div>
        </div>
      )}

      {(data.segments.company_size.length > 0 || data.segments.industry.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.segments.company_size.length > 0 && (
            <div>
              <SubHeading>G2 reviewers by company size</SubHeading>
              <div className="flex flex-wrap gap-1.5">
                {data.segments.company_size.map((s) => (
                  <Chip key={s.label}>
                    {s.label} <strong className="text-primary">{s.count}</strong>
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {data.segments.industry.length > 0 && (
            <div>
              <SubHeading>G2 reviewers by industry</SubHeading>
              <div className="flex flex-wrap gap-1.5">
                {data.segments.industry.map((s) => (
                  <Chip key={s.label}>
                    {s.label} <strong className="text-primary">{s.count}</strong>
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Read {plural(data.reviews_read, "review")}; {data.listings.reduce((n, l) => n + l.low_ratings, 0)} rated 3 stars or lower. Complaint themes also use the "dislikes" part of
        every G2 review.
        {data.not_listed.length > 0 && ` No review listings found for ${data.not_listed.join(", ")}.`}
      </p>
    </div>
  );
}

// ---------- What people already pay ----------

function planPrice(p: PricePlan): string {
  if (p.price === 0) return "Free";
  if (p.price === null) return p.price_text ?? "Price not shown";
  const base = formatPrice(p.price, p.currency);
  if (!p.period) return base;
  if (p.period === "one_time") return `${base} one-time`;
  if (p.period === "usage") return `${base} per use`;
  return `${base}/${p.period === "month" ? "mo" : "yr"}`;
}

const STATUS_BADGE: Record<string, { label: string; variant: "positive" | "uncertain" | "outline" }> = {
  published: { label: "Public prices", variant: "positive" },
  quote_only: { label: "Prices on request", variant: "uncertain" },
  not_found: { label: "No pricing page found", variant: "outline" },
};

export function PricingBody({ data }: { data: PricingData }) {
  const s = data.summary;
  return (
    <div className="space-y-5">
      {s.range ? (
        <p className="text-sm leading-relaxed text-foreground/90">
          {s.range.min === s.range.max ? (
            <>
              The printed paid {s.range.plans === 1 ? "plan costs" : "plans cost"} <strong className="text-primary">{formatPrice(s.range.min, s.range.currency)}</strong>
            </>
          ) : (
            <>
              Printed paid plans run from <strong className="text-primary">{formatPrice(s.range.min, s.range.currency)}</strong> to{" "}
              <strong className="text-primary">{formatPrice(s.range.max, s.range.currency)}</strong>
            </>
          )}{" "}
          {s.range.basis === "per_user" ? "per user " : ""}per {PERIOD_LABEL[s.range.period]}
          {s.range.min !== s.range.max && `, across ${plural(s.range.plans, "plan")}`}.
        </p>
      ) : (
        <p className="text-sm text-foreground/90">No competitor prints a comparable monthly or yearly price.</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Chip>
          {s.published} of {s.checked} publish prices
        </Chip>
        {s.quote_only > 0 && <Chip>{s.quote_only} on request only</Chip>}
        {s.free_plans > 0 && <Chip>{plural(s.free_plans, "free plan")}</Chip>}
        {s.free_trials > 0 && <Chip>{plural(s.free_trials, "free trial")}</Chip>}
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {data.competitors.map((c) => {
          const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE["not_found"]!;
          return (
            <li key={c.domain} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{c.competitor}</span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                {c.url ? <SourceLink href={c.url} label={c.status === "published" ? "Pricing page" : "Sales page"} /> : <span className="text-xs text-muted-foreground">{c.domain}</span>}
              </div>
              {c.plans.length > 0 && (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {c.plans.map((p, i) => (
                    <li key={i} className="rounded-md bg-muted/60 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{p.name}</p>
                      <p className="font-semibold text-foreground">{planPrice(p)}</p>
                      {p.unit && !/^(flat|flat rate|n\/a|none)$/i.test(p.unit.trim()) && <p className="text-xs text-muted-foreground">{p.unit}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {(c.has_free_plan || c.has_free_trial) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {[c.has_free_plan && "Free plan", c.has_free_trial && "Free trial"].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Money in the market ----------

const STAGE_LABEL = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function FundingBody({ data, reviews }: { data: FundingData; reviews: ReviewsData | null }) {
  const [all, setAll] = useState(false);
  const s = data.summary;
  const companies = all ? data.companies : data.companies.slice(0, 6);
  const apps = (reviews?.listings ?? []).filter((l) => l.platform !== "g2" && (l.downloads || l.rating_count));
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        <MiniStat value={s.companies} label="Similar companies" />
        <MiniStat value={s.with_funding} label="With disclosed funding" />
        <MiniStat value={s.total_usd > 0 ? formatUsd(s.total_usd) : "-"} label="Total disclosed" />
        <MiniStat value={s.recent_rounds} label="Rounds in the last 2 years" />
        <MiniStat value={s.new_entrants} label="Founded in the last 3 years" />
      </dl>

      {data.companies.length > 0 && (
        <div>
          <SubHeading tag={<InferredTag label="AI filtered" />}>Companies working on this problem</SubHeading>
          <ul className="grid gap-3 md:grid-cols-2">
            {companies.map((c) => (
              <li key={c.domain} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <ExtLink href={`https://${c.domain}`} className="text-xs text-observed">
                      {c.domain}
                    </ExtLink>
                  </div>
                  {c.total_usd !== null && <span className="shrink-0 font-display text-base font-semibold text-primary">{formatUsd(c.total_usd)}</span>}
                </div>
                {c.description && <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{c.description}</p>}
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {c.founded_year && <span>Founded {c.founded_year}</span>}
                  {c.team && <span>{c.team}</span>}
                  {c.stage && <span>{STAGE_LABEL(c.stage)}</span>}
                  {c.latest_round?.date && (
                    <span>
                      Last round {formatDate(c.latest_round.date, { month: "short", year: "numeric" })}
                      {c.latest_round.amount_usd ? ` · ${formatUsd(c.latest_round.amount_usd)}` : ""}
                    </span>
                  )}
                  {c.crunchbase && (
                    <span className="ml-auto">
                      <SourceLink href={c.crunchbase} label="Crunchbase" />
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <ShowMore total={data.companies.length} shown={companies.length} onClick={() => setAll(true)} />
        </div>
      )}

      {data.announcements.length > 0 && (
        <div>
          <SubHeading>Recent announcements</SubHeading>
          <ul className="divide-y divide-border">
            {data.announcements.map((a) => (
              <li key={a.url} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5">
                <div className="min-w-0 flex-1">
                  <ExtLink href={a.url} className="text-sm font-medium text-foreground">
                    {a.title}
                  </ExtLink>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[a.publisher, a.published_at && formatDate(a.published_at)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Badge variant="inferred" className="capitalize">
                  {a.kind}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {apps.length > 0 && (
        <div>
          <SubHeading>Competitor apps</SubHeading>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((l) => (
              <li key={l.url} className="flex items-start justify-between gap-2 rounded-md bg-muted/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[PLATFORM_LABEL[l.platform], l.downloads && `${l.downloads} downloads`, l.rating_count !== null && `${formatCount(l.rating_count)} ratings`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <SourceLink href={l.url} label="Store" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- How people cope today ----------

export function VideosBody({ data }: { data: VideosData }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/90">
        The top {plural(data.videos.length, "how-to video")} for "{data.query}" have <strong className="text-primary">{formatCount(data.total_views)} views</strong>.
      </p>
      <ul className="space-y-2.5">
        {data.videos.map((v) => (
          <li key={v.url}>
            <a href={v.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40">
              <PlayCircle className="mt-0.5 size-5 shrink-0 text-negative" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium text-foreground group-hover:underline">{v.title}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {v.channel && <span>{v.channel}</span>}
                  {v.duration && <span>{v.duration}</span>}
                  {v.published_at && <span>{formatDate(v.published_at)}</span>}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-semibold tabular-nums text-primary">{v.views !== null ? formatCount(v.views) : "-"}</span>
                <span className="text-xs text-muted-foreground">views</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Why now ----------

export function WhyNowBody({ data }: { data: WhyNowData }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {data.changes.map((c, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{formatLooseDate(c.date) ?? "Date not stated"}</span>
            {c.jurisdiction && <Chip>{c.jurisdiction}</Chip>}
          </p>
          <p className="prov-inferred mt-1.5 rounded-md px-2.5 py-1.5 text-sm text-foreground/90">
            {c.change}
            {c.effect && <span className="mt-1 block text-foreground/70">{c.effect}</span>}
          </p>
          {c.quote && <p className="mt-2 border-l-2 border-observed/50 pl-3 text-sm italic text-foreground/80">"{c.quote}"</p>}
          <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{c.publisher}</span>
            <SourceLink href={c.source_url} />
          </p>
        </li>
      ))}
    </ol>
  );
}

// ---------- Reported market size ----------

export function MarketSizeBody({ data }: { data: MarketSizeData }) {
  return (
    <ul className="space-y-3">
      {data.figures.map((f, i) => (
        <li key={i} className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-2xl font-semibold text-primary">{f.value}</p>
            {f.year && <span className="text-xs text-muted-foreground">{f.year}</span>}
          </div>
          {f.scope && <p className="mt-1 text-sm text-foreground/85">{f.scope}</p>}
          {f.quote && <p className="mt-2 border-l-2 border-observed/50 pl-3 text-sm italic text-foreground/80">"{f.quote}"</p>}
          <p className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{f.publisher}</span>
            <SourceLink href={f.source_url} />
          </p>
        </li>
      ))}
    </ul>
  );
}

// ---------- Local demand ----------

export function LocalBody({ data }: { data: LocalData }) {
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-4">
        <MiniStat value={data.found} label="Businesses on Google Maps" />
        <MiniStat value={data.average_rating ?? "-"} label="Average rating" />
        <MiniStat value={formatCount(data.total_reviews)} label="Customer reviews" />
      </dl>
      <ul className="divide-y divide-border">
        {data.businesses.map((b) => (
          <li key={b.url} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <ExtLink href={b.url} className="truncate text-sm font-medium text-foreground">
                {b.name}
              </ExtLink>
              {b.category && <p className="text-xs text-muted-foreground">{b.category}</p>}
            </div>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <Stars rating={b.rating} />
              {b.reviews !== null && <span>{formatCount(b.reviews)} reviews</span>}
            </span>
          </li>
        ))}
      </ul>
      {data.complaints.length > 0 && (
        <div>
          <SubHeading>What their unhappiest customers say</SubHeading>
          <div className="space-y-2">
            {data.complaints.map((c, i) => (
              <Quote key={i} text={c.text} url={c.url} rating={c.rating} date={c.date} by={c.place} />
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Searched Google Maps for "{data.query}".</p>
    </div>
  );
}

import type { ReactNode } from "react";
import { AlertCircle, ExternalLink, Loader2, RotateCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/common/InfoTip";
import { TimeAgo } from "@/components/common/TimeAgo";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { PLATFORM_LABEL, type DemandSectionDTO, type ReviewPlatform } from "@/lib/demand";

export function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("underline-offset-4 hover:underline", className)}>
      {children}
    </a>
  );
}

export function SourceLink({ href, label = "Source" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-observed underline-offset-4 hover:underline"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-foreground" aria-label={`Rated ${rating} out of 5`}>
      <Star className="size-3 fill-current text-uncertain" aria-hidden="true" />
      {rating % 1 === 0 ? rating : rating.toFixed(1)}
    </span>
  );
}

/** A verbatim excerpt from a public page, always with a link back to it. */
export function Quote({
  text,
  url,
  rating,
  date,
  platform,
  by,
}: {
  text: string;
  url: string;
  rating?: number | null;
  date?: string | null;
  platform?: ReviewPlatform;
  by?: string | null;
}) {
  return (
    <figure className="prov-observed rounded-lg p-3">
      <blockquote className="text-sm leading-relaxed text-foreground/90">"{text}"</blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {typeof rating === "number" && <Stars rating={rating} />}
        {platform && <span>{PLATFORM_LABEL[platform]}</span>}
        {by && <span className="font-medium text-foreground/80">{by}</span>}
        {date && <span>{formatDate(date)}</span>}
        <span className="ml-auto">
          <SourceLink href={url} />
        </span>
      </figcaption>
    </figure>
  );
}

export function SubHeading({ children, tag }: { children: ReactNode; tag?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold text-primary">{children}</h4>
      {tag}
    </div>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground/80", className)}>{children}</span>;
}

export function MiniStat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className="stat-rule flex flex-col-reverse justify-end pt-2">
      <dt className="mt-0.5 text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-xl font-semibold leading-tight text-primary">{value}</dd>
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <div className="h-3 w-4/5 rounded bg-muted shimmer-line" />
      <div className="h-3 w-3/5 rounded bg-muted shimmer-line" />
      <div className="h-14 w-full rounded-lg bg-muted/70 shimmer-line" />
      <div className="h-14 w-full rounded-lg bg-muted/70 shimmer-line" />
    </div>
  );
}

/**
 * Frame for one demand check: heading with an info button, then a loading, failure, empty or
 * result state. Results stay visible while a monthly refresh runs in the background.
 */
export function DemandPanel<T>({
  id,
  title,
  info,
  tags,
  section,
  emptyText,
  waiting,
  onRetry,
  retrying,
  className,
  children,
}: {
  id: string;
  title: string;
  info: ReactNode;
  tags?: ReactNode;
  section: DemandSectionDTO & { data: T | null };
  emptyText: (data: T | null) => ReactNode;
  waiting?: boolean;
  onRetry: () => void;
  retrying: boolean;
  className?: string;
  children: (data: T) => ReactNode;
}) {
  const { status, data } = section;
  const showData = data !== null && (status === "done" || status === "running");
  const loading = !showData && (status === "pending" || status === "running");
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("panel min-w-0 scroll-mt-36 p-5", className)} aria-busy={loading || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`${id}-title`} className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
          {title}
          <InfoTip align="start">{info}</InfoTip>
        </h3>
        {showData && <div className="flex flex-wrap items-center gap-2">{tags}</div>}
      </div>
      <div className="mt-4">
        {showData ? (
          children(data as T)
        ) : loading ? (
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              {waiting ? (
                "Waiting to start"
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {status === "running" ? "Checking now" : "In the queue"}
                </>
              )}
            </p>
            <SkeletonLines />
          </div>
        ) : status === "error" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-start gap-2 text-sm text-foreground/90">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              {section.error}
            </p>
            {section.retry_allowed ? (
              <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
                <RotateCw className={cn("size-3.5", retrying && "animate-spin")} aria-hidden="true" />
                Try again
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Retrying automatically later</span>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{emptyText(data)}</div>
        )}
      </div>
      {section.retrieved_at && status !== "pending" && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === "running" && showData && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
          {status === "running" && showData ? "Refreshing - last checked " : "Checked "}
          <TimeAgo iso={section.retrieved_at} />
          <span aria-hidden="true">·</span> via Context.dev
        </p>
      )}
    </section>
  );
}

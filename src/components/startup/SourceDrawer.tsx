import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ExternalLink, Radar, Search } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SourceRecord } from "@/lib/types";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { ObservedTag } from "@/components/common/Provenance";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { signalLabel } from "@/lib/taxonomy";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface Citation {
  text: string;
  context: string;
}

interface Ctx {
  sources: Map<string, SourceRecord>;
  order: Map<string, number>;
  open: (id: string) => void;
  citationsFor: (id: string) => Citation[];
}

const SourceCtx = createContext<Ctx | null>(null);

export function useSources() {
  const ctx = useContext(SourceCtx);
  if (!ctx) throw new Error("useSources must be used inside SourceProvider");
  return ctx;
}

export function SourceProvider({
  sources,
  citations,
  children,
}: {
  sources: SourceRecord[];
  citations: (id: string) => Citation[];
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const map = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const order = useMemo(() => new Map(sources.map((s, i) => [s.id, i + 1])), [sources]);
  const open = useCallback((id: string) => setOpenId(id), []);
  const src = openId ? map.get(openId) : undefined;
  const cites = openId ? citations(openId) : [];

  return (
    <SourceCtx.Provider value={{ sources: map, order, open, citationsFor: citations }}>
      {children}
      <Sheet open={Boolean(src)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto border-border bg-surface sm:max-w-lg">
          {src && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SourceFavicon domain={src.domain} />
                  <span>{src.publisher ?? src.domain}</span>
                  <span className="text-faint">· source {order.get(src.id)}</span>
                </div>
                <SheetTitle className="font-display text-xl leading-snug text-foreground">{src.title}</SheetTitle>
                <SheetDescription asChild>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <ObservedTag />
                    {src.signal_type && <Badge variant="secondary">{signalLabel(src.signal_type)}</Badge>}
                    {src.origin === "scan" && <Badge variant="live">Found in market scan</Badge>}
                    {src.origin === "competitor" && <Badge variant="outline">Competitor research</Badge>}
                  </div>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5 px-4 pb-8">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <dt className="data-label flex items-center gap-1">
                      <CalendarDays className="size-3" /> Published
                    </dt>
                    <dd className="mt-1 text-foreground">{src.published_at ? formatDate(src.published_at) : "Not stated by the page"}</dd>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <dt className="data-label flex items-center gap-1">
                      <Radar className="size-3" /> Retrieved
                    </dt>
                    <dd className="mt-1 text-foreground">{formatDateTime(src.retrieved_at)}</dd>
                  </div>
                </dl>
                {(src.snippet || src.highlights.length > 0) && (
                  <div>
                    <div className="mt-2 space-y-2">
                      {src.snippet && <p className="prov-observed rounded-lg p-3 text-sm leading-relaxed text-foreground/90">{src.snippet}</p>}
                      {src.highlights
                        .filter((h) => h !== src.snippet)
                        .slice(0, 3)
                        .map((h, i) => (
                          <blockquote key={i} className="border-l-2 border-observed/50 pl-3 text-sm leading-relaxed text-muted-foreground">
                            {h.replace(/\s+/g, " ").slice(0, 600)}
                          </blockquote>
                        ))}
                    </div>
                  </div>
                )}
                {cites.length > 0 && (
                  <div>
                    <ul className="mt-2 space-y-2">
                      {cites.map((c, i) => (
                        <li key={i} className="rounded-lg border border-border p-3 text-sm">
                          <p className="data-label">{c.context}</p>
                          <p className="mt-1 text-foreground/90">{c.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {src.search_query && (
                  <p className="flex items-start gap-1.5 text-xs text-faint">
                    <Search className="mt-0.5 size-3 shrink-0" /> Found via Context.dev query: “{src.search_query}”
                  </p>
                )}
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-observed/40 bg-observed/10 px-4 py-2.5 text-sm font-medium text-observed transition-colors hover:bg-observed/20"
                >
                  Open original publication <ExternalLink className="size-4" />
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </SourceCtx.Provider>
  );
}

/** Numbered citation chips that open the source drawer. */
export function Cite({ ids, className }: { ids: string[]; className?: string }) {
  const { sources, order, open } = useSources();
  const valid = ids.filter((id) => sources.has(id));
  if (valid.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1 align-middle", className)}>
      {valid.slice(0, 6).map((id) => {
        const s = sources.get(id)!;
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => open(id)}
                className="inline-flex h-5 items-center gap-1 rounded border border-observed/30 bg-observed/10 px-1.5 font-mono text-[10px] text-observed transition-colors hover:bg-observed/20"
              >
                <SourceFavicon domain={s.domain} className="size-3" />
                {order.get(id)}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              <p className="font-medium">{s.title}</p>
              <p className="text-muted-foreground">{s.domain}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      {valid.length > 6 && <span className="font-mono text-[10px] text-muted-foreground">+{valid.length - 6}</span>}
    </span>
  );
}

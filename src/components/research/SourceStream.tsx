import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Newspaper } from "lucide-react";
import type { SourceRecord } from "@/lib/types";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { signalLabel } from "@/lib/taxonomy";
import { formatDate } from "@/lib/format";

const INTENT_LABEL: Record<string, string> = {
  complaints: "Complaints",
  regulation: "Regulation",
  market_news: "Market",
  technology: "Technology",
  requests: "Requests",
  forums: "Forums",
  reddit: "Reddit",
  news: "News",
  competitors: "Competitors",
};

export function intentLabel(intent: string | null): string {
  return INTENT_LABEL[intent ?? ""] ?? "Web";
}

export function SourceStream({ sources, limit = 24 }: { sources: SourceRecord[]; limit?: number }) {
  const shown = sources.slice(0, limit);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {shown.map((s, i) => (
          <motion.a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: Math.min(i, 20) * 0.035, duration: 0.35 }}
            className="group prov-observed flex min-w-0 flex-col gap-1.5 rounded-lg p-3 transition-colors hover:border-observed/60"
          >
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <SourceFavicon domain={s.domain} className="size-3.5" />
              <span className="truncate">{s.publisher ?? s.domain}</span>
              <span className="ml-auto shrink-0 rounded bg-foreground/[0.06] px-1.5 py-px font-mono text-[10px] uppercase tracking-wide">
                {s.signal_type ? signalLabel(s.signal_type) : intentLabel(s.search_intent)}
              </span>
            </div>
            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground/90 group-hover:text-foreground">{s.title}</p>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-faint">
              {s.origin === "news" && <Newspaper className="size-3" />}
              {s.published_at ? `Published ${formatDate(s.published_at)}` : "Web page · undated"}
              <ExternalLink className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </motion.a>
        ))}
      </AnimatePresence>
      {sources.length > limit && (
        <p className="col-span-full pt-1 text-center font-mono text-[11px] text-muted-foreground">
          + {sources.length - limit} more sources retrieved
        </p>
      )}
    </div>
  );
}

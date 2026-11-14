import { Link } from "@tanstack/react-router";
import { LayoutGrid, Route as RouteIcon } from "lucide-react";
import { FOR_YOU, type DiscoverView } from "@/lib/journey";
import { cn } from "@/lib/utils";

const item =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Switch between the guided three-step journey and the full catalog with filters and market tools. */
export function DiscoverViewToggle({ view }: { view: DiscoverView }) {
  return (
    <div role="group" aria-label="How to browse" className="inline-flex shrink-0 self-start rounded-full border border-ink/40 bg-background p-1 lg:self-auto">
      <Link
        from="/discover"
        to="/discover"
        search={(p) => ({ ...p, view: "guided" })}
        resetScroll={false}
        aria-current={view === "guided" ? "true" : undefined}
        className={cn(item, view === "guided" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}
      >
        <RouteIcon className="size-4" aria-hidden="true" /> Guided
      </Link>
      <Link
        from="/discover"
        to="/discover"
        search={(p) => ({ ...p, view: "all", industry: p.industry === FOR_YOU ? "all" : p.industry })}
        resetScroll={false}
        aria-current={view === "all" ? "true" : undefined}
        className={cn(item, view === "all" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}
      >
        <LayoutGrid className="size-4" aria-hidden="true" /> Full catalog
      </Link>
    </div>
  );
}

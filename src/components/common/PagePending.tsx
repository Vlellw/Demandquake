import { DemandquakeMark } from "@/components/brand/DemandquakeLogo";

/** Shown while a route's data loads (client navigations and signed-in pages). */
export function PagePending() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="relative flex size-14 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <DemandquakeMark className="relative size-9" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Loading signal…</p>
    </div>
  );
}

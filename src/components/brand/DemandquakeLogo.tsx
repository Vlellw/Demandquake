import { cn } from "@/lib/utils";

/** Red round mark with a white seismograph line — the Demandquake symbol. */
export function DemandquakeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--brand-red)" />
      <path
        d="M4.5 16.5h4.3l1.9-4.2 2.8 9.6 3.1-14.4 2.9 12.4 2-5.2 1.6 1.8h4.4"
        fill="none"
        stroke="var(--ink-foreground)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DemandquakeLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DemandquakeMark />
      <span className="font-display text-[1.2rem] font-bold tracking-[-0.02em] text-primary">Demandquake</span>
    </span>
  );
}

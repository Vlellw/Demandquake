import { cn } from "@/lib/utils";

export function DemandquakeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <defs>
        <linearGradient id="dq-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-glow)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="url(#dq-mark)" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="url(#dq-mark)" strokeOpacity="0.55" strokeWidth="1" />
      <path
        d="M3 16.5h5.2l2.1-4.4 3 10.2 3.4-15.6 3.1 13.4 2.2-5.6 1.7 2h5.3"
        fill="none"
        stroke="url(#dq-mark)"
        strokeWidth="2"
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
      <span className="font-display text-[1.05rem] font-semibold tracking-tight text-foreground">
        Demand<span className="text-magma">quake</span>
      </span>
    </span>
  );
}

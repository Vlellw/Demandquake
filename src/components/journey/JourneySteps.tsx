import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { JOURNEY_STEPS, journeyStatuses, type JourneyStepNumber } from "@/lib/journey";
import { cn } from "@/lib/utils";

/**
 * Founder journey tracker (Choose → Inspect → Claim), drawn like Lindström's segmented progress bars:
 * numbered circles, a bold label and a navy rule under every step that is done or current.
 * `renderStep` can wrap a step in a link or button; return undefined to keep it static.
 */
export function JourneySteps({
  current,
  complete = false,
  renderStep,
  className,
}: {
  current: JourneyStepNumber;
  complete?: boolean;
  renderStep?: (n: JourneyStepNumber, content: ReactNode, className: string) => ReactNode | undefined;
  className?: string;
}) {
  const statuses = journeyStatuses(current, complete);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById("header-journey")), []);
  const tracker = (
    <nav aria-label="Your progress" className={cn("border-b border-border bg-background", className)}>
      <ol className="mx-auto grid max-w-[1400px] grid-cols-4 gap-1 px-0 sm:gap-3">
        {JOURNEY_STEPS.map((s, i) => {
          const status = statuses[i] ?? "upcoming";
          const content = (
            <>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition-colors sm:size-9",
                  status === "current" && "border-primary bg-primary text-primary-foreground",
                  status === "done" && "border-primary bg-background text-primary",
                  status === "upcoming" && "border-border-strong bg-background text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {status === "done" ? <Check className="size-4" strokeWidth={3} /> : s.n}
              </span>
              <span className="min-w-0 text-left">
                <span
                  className={cn(
                    "block truncate text-sm font-bold",
                    status === "upcoming" ? "text-muted-foreground" : status === "current" ? "text-primary" : "text-foreground",
                  )}
                >
                  <span className="xl:hidden">{s.short}</span>
                  <span className="hidden xl:inline">{s.label}</span>
                </span>
              </span>
              <span className="sr-only">{status === "done" ? "(done)" : status === "current" ? "(you are here)" : "(next)"}</span>
            </>
          );
          const cls = "group flex w-full min-w-0 items-center gap-1 py-3.5 sm:gap-2 sm:py-4";
          return (
            <li
              key={s.key}
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "relative min-w-0 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full",
                status === "upcoming" ? "after:bg-border" : "after:bg-primary",
              )}
            >
              {renderStep?.(s.n, content, cls) ?? <div className={cls}>{content}</div>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
  return target ? createPortal(tracker, target) : tracker;
}


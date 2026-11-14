import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { JOURNEY_STEPS, journeyStatuses, type JourneyStepNumber } from "@/lib/journey";
import { cn } from "@/lib/utils";

/**
 * Compact founder journey navigation with a filled current step and quiet completed states.
 * `renderStep` can wrap a step in a link or button; return undefined to keep it static.
 */
export function JourneySteps({
  current,
  complete = false,
  renderStep,
  className,
  inline = false,
}: {
  current: JourneyStepNumber | null;
  complete?: boolean;
  renderStep?: (n: JourneyStepNumber, content: ReactNode, className: string) => ReactNode | undefined;
  className?: string;
  inline?: boolean;
}) {
  const statuses = journeyStatuses(current, complete);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!inline) setTarget(document.getElementById("header-journey"));
  }, [inline]);
  const tracker = (
    <nav aria-label="Your progress" className={cn("min-w-0 bg-background py-1", className)}>
      <ol className="mx-auto grid max-w-[1400px] grid-cols-3 gap-1 rounded-full bg-muted p-1 sm:gap-1.5">
        {JOURNEY_STEPS.map((s, i) => {
          const status = statuses[i] ?? "upcoming";
          const content = (
            <>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-semibold transition-colors motion-reduce:transition-none sm:size-6 sm:text-xs",
                  status === "current" && "bg-primary-foreground/20 text-primary-foreground",
                  status === "done" && "bg-primary/10 text-primary",
                  status === "upcoming" && "bg-background text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {s.n}
              </span>
              <span className="min-w-0 text-center sm:text-left">
                <span
                  className={cn(
                    "block text-[0.5625rem] font-semibold sm:text-xs xl:text-sm",
                    status === "upcoming" ? "text-muted-foreground" : status === "current" ? "text-primary-foreground" : "text-primary",
                  )}
                >
                  <span className="xl:hidden">{s.short}</span>
                  <span className="hidden xl:inline">{s.label}</span>
                </span>
              </span>
              <span className="sr-only">{status === "done" ? "(done)" : status === "current" ? "(you are here)" : "(next)"}</span>
            </>
          );
          const cls = "group flex h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10 sm:flex-row sm:gap-2 sm:px-2";
          return (
            <li
              key={s.key}
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "min-w-0 rounded-full transition-colors motion-reduce:transition-none",
                status === "current" ? "bg-primary" : "has-[a:hover]:bg-background has-[button:hover]:bg-background",
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


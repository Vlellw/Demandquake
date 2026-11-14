import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Round "i" button that sits next to a headline and reveals its explanation on click.
 * Keeps pages free of subheadlines while preserving the context for newcomers.
 */
export function InfoTip({
  children,
  label = "More about this section",
  align = "center",
  className,
}: {
  children: ReactNode;
  label?: string;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-grid size-6 shrink-0 translate-y-[-2px] cursor-pointer place-items-center rounded-full border-2 border-primary/50 text-primary transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Info className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

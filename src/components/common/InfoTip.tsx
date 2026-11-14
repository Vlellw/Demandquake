import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn(
            "size-6 shrink-0 translate-y-[-2px] rounded-full p-0 text-primary/70 hover:bg-accent hover:text-primary [&_svg]:size-6",
            className,
          )}
        >
          <Info strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

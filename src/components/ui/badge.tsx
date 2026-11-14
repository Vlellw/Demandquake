import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Lindström-style tags: small bold uppercase text with a thin colored outline.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-px text-[0.625rem] font-bold uppercase leading-4 tracking-[0.04em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary/70 bg-background text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-destructive/70 bg-background text-destructive",
        outline: "border-ink/60 bg-background text-foreground",
        observed: "border-observed/70 bg-background text-observed",
        inferred: "border-dashed border-inferred/70 bg-background text-inferred",
        positive: "border-positive/70 bg-background text-positive",
        negative: "border-negative/70 bg-background text-negative",
        uncertain: "border-uncertain/60 bg-background text-uncertain",
        live: "border-primary bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

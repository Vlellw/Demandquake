import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.7rem] font-medium leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/15 text-destructive",
        outline: "border-border-strong text-muted-foreground",
        observed: "border-observed/30 bg-observed/10 text-observed",
        inferred: "border-dashed border-inferred/45 bg-inferred/8 text-inferred",
        positive: "border-positive/30 bg-positive/10 text-positive",
        negative: "border-negative/30 bg-negative/10 text-negative",
        uncertain: "border-uncertain/30 bg-uncertain/10 text-uncertain",
        live: "border-primary/40 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

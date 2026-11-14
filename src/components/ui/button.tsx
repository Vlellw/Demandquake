import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-glow",
        // Primary call to action: filled navy pill
        hero: "bg-primary text-primary-foreground font-bold hover:bg-primary-glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Lindström signature: ink-outlined pill that fills on hover
        outline: "border border-ink bg-background text-foreground hover:bg-ink hover:text-ink-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        // White-outlined pill for photos and colored bands
        glass: "border border-ink-foreground bg-transparent text-ink-foreground hover:bg-ink-foreground hover:text-ink",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "rounded-none px-0 text-primary underline-offset-4 hover:underline",
        google:
          "rounded-full border border-google-border bg-google font-google text-[14px] leading-5 font-medium text-google-foreground pl-3 pr-3 gap-2.5 hover:bg-accent [&_svg]:size-[18px]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-11 px-7 text-[0.95rem]",
        xl: "h-12 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

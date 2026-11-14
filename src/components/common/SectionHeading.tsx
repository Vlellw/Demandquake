import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lindström-style section opener: small bold uppercase eyebrow, navy title,
 * optional lead text and a pill action underneath. Centered by default.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "center",
  as: Tag = "h2",
  id,
  tone = "default",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "center" | "left";
  as?: "h1" | "h2" | "h3";
  id?: string;
  tone?: "default" | "inverse";
  className?: string;
}) {
  const inverse = tone === "inverse";
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl", className)}>
      {eyebrow && <p className={cn("eyebrow", inverse && "text-primary-foreground")}>{eyebrow}</p>}
      <Tag
        id={id}
        className={cn(
          "section-title mt-2 text-[1.75rem] sm:text-[2rem]",
          Tag === "h1" && "text-[2rem] sm:text-[2.75rem]",
          inverse && "text-primary-foreground",
        )}
      >
        {title}
      </Tag>
      {description && (
        <p className={cn("mt-3 text-base leading-relaxed", inverse ? "text-primary-foreground/85" : "text-muted-foreground")}>
          {description}
        </p>
      )}
      {action && <div className={cn("mt-6 flex flex-wrap gap-3", align === "center" && "justify-center")}>{action}</div>}
    </div>
  );
}

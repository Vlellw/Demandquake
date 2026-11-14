import type { ReactNode } from "react";
import { InfoTip } from "@/components/common/InfoTip";
import { cn } from "@/lib/utils";

/**
 * Lindström-style section opener: navy title and a pill action underneath.
 * Centered by default. The optional explanation lives in a round info button
 * next to the title, so no subheadline is rendered.
 */
export function SectionHeading({
  title,
  description,
  action,
  align = "center",
  as: Tag = "h2",
  id,
  tone = "default",
  className,
}: {
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
      <Tag
        id={id}
        className={cn(
          "section-title text-[1.75rem] sm:text-[2rem]",
          Tag === "h1" && "text-[2rem] sm:text-[2.75rem]",
          inverse && "text-primary-foreground",
        )}
      >
        {title}
        {description && (
          <>
            {" "}
            <InfoTip align={align === "center" ? "center" : "start"}>{description}</InfoTip>
          </>
        )}
      </Tag>
      {action && <div className={cn("mt-6 flex flex-wrap gap-3", align === "center" && "justify-center")}>{action}</div>}
    </div>
  );
}

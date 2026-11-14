import { LEVEL_META } from "@/lib/taxonomy";
import type { Level } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneBg: Record<string, string> = {
  positive: "bg-positive",
  inferred: "bg-inferred",
  negative: "bg-negative",
  uncertain: "bg-uncertain",
};
const toneText: Record<string, string> = {
  positive: "text-positive",
  inferred: "text-inferred",
  negative: "text-negative",
  uncertain: "text-uncertain",
};

/** Qualitative 3-segment meter. "Unvalidated" renders as hollow segments — never a percentage. */
export function LevelMeter({ level, className, showLabel = true, compact = false }: { level: Level; className?: string; showLabel?: boolean; compact?: boolean }) {
  const meta = LEVEL_META[level] ?? LEVEL_META.unknown;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("flex gap-0.5", compact ? "w-9" : "w-14")}>
        {[1, 2, 3].map((seg) => (
          <span
            key={seg}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-700",
              meta.rank >= seg ? toneBg[meta.tone] : level === "unknown" ? "border border-dashed border-uncertain/50" : "bg-foreground/10",
            )}
          />
        ))}
      </span>
      {showLabel && <span className={cn("text-xs font-medium", toneText[meta.tone])}>{meta.label}</span>}
    </span>
  );
}

export function levelTextClass(level: Level): string {
  return toneText[(LEVEL_META[level] ?? LEVEL_META.unknown).tone];
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Counter with a navy top rule, as on Lindström's key-figure rows. Place inside a <dl>. */
export function StatRule({ label, value, align = "center", className }: { label: ReactNode; value: ReactNode; align?: "center" | "left"; className?: string }) {
  return (
    <div className={cn("stat-rule flex flex-col-reverse justify-end pt-3", align === "center" ? "items-center text-center" : "items-start text-left", className)}>
      <dt className="mt-1 text-sm text-primary">{label}</dt>
      <dd className="font-display text-[2rem] font-bold leading-tight text-primary">{value}</dd>
    </div>
  );
}

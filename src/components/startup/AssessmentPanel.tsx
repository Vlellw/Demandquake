import { motion } from "motion/react";
import { FlaskConical, ShieldQuestion } from "lucide-react";
import type { Assessment, Hypothesis, SourceRecord } from "@/lib/types";
import { DIMENSION_META, LEVEL_META } from "@/lib/taxonomy";
import { LevelMeter, levelTextClass } from "@/components/common/LevelMeter";
import { InferredTag } from "@/components/common/Provenance";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { Cite } from "./SourceDrawer";
import { cn } from "@/lib/utils";

export function AssessmentPanel({
  assessment,
  hypotheses,
}: {
  assessment: Assessment;
  hypotheses: Hypothesis[];
  evidence: SourceRecord[];
}) {
  return (
    <div className="space-y-6">
      <section className="panel-raised p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{assessment.summary}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <InferredTag label="AI reasoning over sources" />
            <span className="font-mono text-[10px] text-faint">Updated {formatDate(assessment.updated_at)}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {assessment.dimensions.map((d) => (
            <div key={d.key} className="rounded-lg border border-border bg-surface-sunken/60 p-3">
              <p className="text-[11px] text-muted-foreground">{DIMENSION_META[d.key]?.label ?? d.key}</p>
              <p className={cn("mt-1 font-display text-base font-semibold", levelTextClass(d.level))}>{LEVEL_META[d.level].label}</p>
              <LevelMeter level={d.level} showLabel={false} compact className="mt-2" />
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Qualitative levels only — Demandquake never assigns success percentages. Each level is reasoning you can audit against its cited sources.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {assessment.dimensions.map((d, i) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="panel p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold text-foreground">{DIMENSION_META[d.key]?.label ?? d.key}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{DIMENSION_META[d.key]?.question}</p>
              </div>
              <LevelMeter level={d.level} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">{d.reasoning}</p>
            <div className="mt-3 flex items-center gap-2">
              {d.source_ids.length > 0 ? (
                <>
                  <span className="data-label">Based on</span>
                  <Cite ids={d.source_ids} />
                </>
              ) : d.key === "validation_status" ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldQuestion className="size-3.5" /> Not validated with customers yet
                </span>
              ) : (
                <span className="text-xs text-faint">No direct source — reasoning is an AI hypothesis</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div>
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <InferredTag />
          </div>
          <ul className="mt-4 space-y-3">
            {hypotheses.map((h, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <FlaskConical className="mt-0.5 size-4 shrink-0 text-inferred" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90">{h.statement}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-1.5 capitalize">{h.type}</Badge>
                      {h.how_to_test}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

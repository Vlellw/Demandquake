import { motion } from "motion/react";
import { Coins, Megaphone, ShieldAlert, Target } from "lucide-react";
import type { BusinessModel, BusinessPlan, CustomerSegment, ValidationStep } from "@/lib/types";
import { InferredTag } from "@/components/common/Provenance";

export function BusinessPlanPanel({
  model,
  plan,
  validation,
  customers,
}: {
  model: BusinessModel;
  plan: BusinessPlan;
  validation: ValidationStep[];
  customers: CustomerSegment[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-inferred/30 bg-inferred/[0.05] px-4 py-3 text-sm text-foreground/85">
        <span>Everything on this tab is an AI-generated starting point for a founder — not verified market data.</span>
        <InferredTag />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-1">
          <p className="eyebrow flex items-center gap-1.5">
            <Coins className="size-3.5" /> Business model
          </p>
          <p className="mt-3 font-display text-xl font-semibold text-foreground">{model.type}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="data-label">Pricing hypothesis</dt>
              <dd className="mt-1 text-foreground/90">{model.pricing_hypothesis}</dd>
            </div>
            <div>
              <dt className="data-label">Unit of value</dt>
              <dd className="mt-1 text-foreground/90">{model.unit_of_value}</dd>
            </div>
            <div>
              <dt className="data-label">Revenue streams</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {model.revenue_streams.map((r) => (
                  <span key={r} className="brand-soft brand-text rounded-full px-2.5 py-0.5 text-xs">
                    {r}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel p-5 lg:col-span-2">
          <p className="eyebrow flex items-center gap-1.5">
            <Target className="size-3.5" /> Roadmap
          </p>
          <div className="relative mt-5 grid gap-4 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-[11px] hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block" />
            {plan.roadmap.map((p, i) => (
              <motion.div
                key={p.phase}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <span className="brand-fill relative z-10 flex size-6 items-center justify-center rounded-full font-mono text-[11px] font-bold text-background">
                  {i + 1}
                </span>
                <p className="mt-3 font-display text-base font-semibold text-foreground">{p.phase}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{p.horizon}</p>
                <ul className="mt-2 space-y-1.5">
                  {p.goals.map((g) => (
                    <li key={g} className="flex gap-2 text-sm text-foreground/85">
                      <span className="brand-fill mt-2 size-1 shrink-0 rounded-full" />
                      {g}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <p className="eyebrow flex items-center gap-1.5">
            <Megaphone className="size-3.5" /> Go-to-market
          </p>
          <ol className="mt-4 space-y-2.5">
            {plan.go_to_market.map((g, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/90">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                {g}
              </li>
            ))}
          </ol>
          {customers.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="data-label">First buyers</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customers.map((c) => (
                  <span key={c.segment} className="rounded-md border border-border px-2 py-1 text-xs text-foreground/85">
                    {c.buyer} <span className="text-muted-foreground">at {c.segment}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="panel p-5">
          <p className="eyebrow flex items-center gap-1.5">
            <ShieldAlert className="size-3.5" /> Key risks
          </p>
          <ul className="mt-4 space-y-3">
            {plan.key_risks.map((r, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">{r.risk}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-positive">Mitigation:</span> {r.mitigation}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel p-5">
        <p className="eyebrow">Validation plan · first experiments</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {validation.map((v, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-sunken/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Experiment {i + 1} · {v.method}</p>
              <p className="mt-1.5 font-display text-sm font-semibold text-foreground">{v.title}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{v.description}</p>
              <p className="mt-3 border-t border-border pt-2 text-xs text-foreground/80">
                <span className="text-positive">Signal:</span> {v.success_signal}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

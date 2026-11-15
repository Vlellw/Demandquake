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
        <span>Everything on this tab is an AI-generated starting point for a founder - not verified market data.</span>
        <InferredTag />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-1">
          <div className="flex items-center gap-2 border-t-2 border-primary pt-4">
            <Coins className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="font-display text-xl font-semibold text-primary">{model.type}</p>
          </div>
          <dl className="mt-5 space-y-5 text-sm">
            <div>
              <dt className="text-sm font-semibold text-primary">Pricing hypothesis</dt>
              <dd className="mt-2 border-l-2 border-primary/30 bg-muted/50 px-4 py-3 leading-relaxed text-foreground">{model.pricing_hypothesis}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-primary">Unit of value</dt>
              <dd className="mt-2 leading-relaxed text-foreground">{model.unit_of_value}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-primary">Revenue streams</dt>
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
                <p className="mt-3 font-display text-base font-semibold leading-snug text-foreground">{p.phase}</p>
                <span className="mt-1.5 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-primary">{p.horizon}</span>
                <ul className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
                  {p.goals.map((g) => (
                    <li key={g} className="flex gap-2 text-sm leading-relaxed text-foreground">
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
          <div className="flex items-center gap-2 border-t-2 border-primary pt-4">
            <Megaphone className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-primary">Go to market</h3>
          </div>
          <ol className="mt-4 divide-y divide-border">
            {plan.go_to_market.map((g, i) => (
              <li key={i} className="flex gap-3 py-3 text-sm leading-relaxed text-foreground first:pt-0">
                <span className="brand-soft brand-text flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">{i + 1}</span>
                {g}
              </li>
            ))}
          </ol>
          {customers.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-semibold text-primary">First buyers</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customers.map((c) => (
                  <span key={c.segment} className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                    {c.buyer} <span className="text-muted-foreground">at {c.segment}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2 border-t-2 border-primary pt-4">
            <ShieldAlert className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-primary">Key risks</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {plan.key_risks.map((r, i) => (
              <li key={i} className="overflow-hidden rounded-lg border border-border">
                <p className="px-4 py-3 text-sm font-semibold leading-snug text-foreground">{r.risk}</p>
                <p className="border-t border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed text-foreground">
                  <span className="font-semibold text-positive">Mitigation: </span>{r.mitigation}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2 border-t-2 border-primary pt-4">
          <Target className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <h3 className="font-display text-lg font-semibold text-primary">Validation experiments</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {validation.map((v, i) => (
            <div key={i} className="flex flex-col rounded-xl border border-border bg-card p-4">
              <span className="self-start rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-primary">{i + 1} · {v.method}</span>
              <p className="mt-3 font-display text-base font-semibold leading-snug text-foreground">{v.title}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{v.description}</p>
              <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                <span className="font-semibold text-positive">Signal: </span>{v.success_signal}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

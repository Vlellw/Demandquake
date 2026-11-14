import { SlidersHorizontal, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_MODELS, FRESHNESS_FILTERS, GEOGRAPHIES, INDUSTRIES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import type { CatalogFilters } from "@/lib/journey";

export type FilterState = CatalogFilters;

export const EMPTY_FILTERS: FilterState = { industry: "all", region: "all", model: "all", fresh: "all" };

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={`h-10 w-auto min-w-[9.5rem] gap-2 rounded-full bg-background px-4 text-sm font-semibold ${value !== "all" ? "border-primary bg-accent text-primary" : "border-ink/40 text-foreground"}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DiscoveryFilters({ value, onChange, count, total }: { value: FilterState; onChange: (v: FilterState) => void; count: number; total: number }) {
  const active = Object.values(value).some((v) => v !== "all");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 inline-flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">
        <SlidersHorizontal className="size-3.5" /> Filter by
      </span>
      <FilterSelect
        label="Industry"
        value={value.industry}
        onChange={(industry) => onChange({ ...value, industry })}
        options={[{ value: "all", label: "All industries" }, ...INDUSTRIES.map((i) => ({ value: i, label: i }))]}
      />
      <FilterSelect
        label="Region"
        value={value.region}
        onChange={(region) => onChange({ ...value, region })}
        options={[{ value: "all", label: "All regions" }, ...GEOGRAPHIES.map((g) => ({ value: g, label: g }))]}
      />
      <FilterSelect
        label="Business model"
        value={value.model}
        onChange={(model) => onChange({ ...value, model })}
        options={[{ value: "all", label: "All business models" }, ...BUSINESS_MODELS.map((m) => ({ value: m, label: m }))]}
      />
      <FilterSelect
        label="How recent"
        value={value.fresh}
        onChange={(fresh) => onChange({ ...value, fresh })}
        options={FRESHNESS_FILTERS.map((f) => ({ value: f.value, label: f.value === "all" ? "Any date" : f.label }))}
      />
      {active && (
        <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          <X /> Clear filters
        </Button>
      )}
      <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
        <span className="font-bold text-foreground">{count}</span> of {total} startups
      </span>
    </div>
  );
}

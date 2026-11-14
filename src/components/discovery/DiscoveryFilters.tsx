import { SlidersHorizontal, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_MODELS, FRESHNESS_FILTERS, GEOGRAPHIES, INDUSTRIES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";

export interface FilterState {
  industry: string;
  geography: string;
  model: string;
  freshness: string;
}

export const EMPTY_FILTERS: FilterState = { industry: "all", geography: "all", model: "all", freshness: "all" };

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
        className={`h-8 w-auto min-w-[8.5rem] gap-2 bg-surface text-xs ${value !== "all" ? "border-primary/50 text-foreground" : "border-border text-muted-foreground"}`}
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
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <SlidersHorizontal className="size-3.5" /> Filter
      </span>
      <FilterSelect
        label="Industry"
        value={value.industry}
        onChange={(industry) => onChange({ ...value, industry })}
        options={[{ value: "all", label: "All industries" }, ...INDUSTRIES.map((i) => ({ value: i, label: i }))]}
      />
      <FilterSelect
        label="Geography"
        value={value.geography}
        onChange={(geography) => onChange({ ...value, geography })}
        options={[{ value: "all", label: "All geographies" }, ...GEOGRAPHIES.map((g) => ({ value: g, label: g }))]}
      />
      <FilterSelect
        label="Business model"
        value={value.model}
        onChange={(model) => onChange({ ...value, model })}
        options={[{ value: "all", label: "All business models" }, ...BUSINESS_MODELS.map((m) => ({ value: m, label: m }))]}
      />
      <FilterSelect
        label="Research freshness"
        value={value.freshness}
        onChange={(freshness) => onChange({ ...value, freshness })}
        options={FRESHNESS_FILTERS.map((f) => ({ value: f.value, label: f.value === "all" ? "Any freshness" : f.label }))}
      />
      {active && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          <X /> Clear
        </Button>
      )}
      <span className="ml-auto font-mono text-xs text-muted-foreground">
        {count} of {total} startups
      </span>
    </div>
  );
}

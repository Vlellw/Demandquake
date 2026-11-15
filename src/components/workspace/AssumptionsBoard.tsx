import { useState } from "react";
import { CheckCircle2, CircleDashed, Plus, Trash2, XCircle } from "lucide-react";
import type { ProjectAssumption } from "@/lib/dto";
import { InfoTip } from "@/components/common/InfoTip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statuses = [
  { value: "untested", label: "Untested", icon: CircleDashed, tone: "text-uncertain" },
  { value: "validated", label: "Validated", icon: CheckCircle2, tone: "text-positive" },
  { value: "invalidated", label: "Invalidated", icon: XCircle, tone: "text-negative" },
] as const;

export function AssumptionsBoard({ assumptions, readOnly = false, onChange }: {
  assumptions: ProjectAssumption[];
  readOnly?: boolean;
  onChange: (assumptions: ProjectAssumption[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = assumptions.filter((a) => filter === "all" || a.status === filter);

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...assumptions, {
      id: `a${crypto.randomUUID()}`, text: text.slice(0, 600), type: "product", how_to_test: "", status: "untested",
    }]);
    setDraft("");
    setFilter("all");
  }

  return (
    <section id="assumptions" aria-labelledby="assumptions-heading" className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-2">
        <h2 id="assumptions-heading" className="font-display text-xl font-bold text-primary">Assumptions</h2>
        <InfoTip label="About assumptions" align="start">
          These are assumptions, not verified facts. Read the suggested test, then choose Validated or Invalidated based on what you learn.
          Clicking the text never changes its status. Changes save automatically.
        </InfoTip>
      </div>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList aria-label="Filter assumptions" className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="all" className="min-h-10 gap-2 px-2">All <span className="font-mono text-xs">{assumptions.length}</span></TabsTrigger>
          {statuses.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="min-h-10 gap-2 px-2">
              {label} <span className="font-mono text-xs">{assumptions.filter((a) => a.status === value).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={filter} className="mt-4">
          <ul className="space-y-3">
            {visible.map((a) => {
              const current = statuses.find((s) => s.value === a.status) ?? statuses[0];
              return (
                <li key={a.id} className="min-w-0 rounded-md border border-border bg-surface p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="inferred">Assumption</Badge>
                    <div className="flex items-center gap-2">
                      <Select value={a.status} onValueChange={(value) => {
                        const status = statuses.find((s) => s.value === value)?.value;
                        if (status) onChange(assumptions.map((item) => item.id === a.id ? { ...item, status } : item));
                      }}>
                        <SelectTrigger aria-label={`Status for ${a.text}`} className={`w-40 shrink-0 ${current.tone}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(({ value, label, icon: StatusIcon, tone }) => (
                            <SelectItem key={value} value={value}>
                              <span className={`flex items-center gap-2 ${tone}`}><StatusIcon className="size-4" />{label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!readOnly && (
                        <Button variant="ghost" size="icon" title="Delete assumption" aria-label={`Delete assumption: ${a.text}`} onClick={() => {
                          if (window.confirm("Delete this assumption?")) onChange(assumptions.filter((item) => item.id !== a.id));
                        }}><Trash2 className="size-4 text-negative" /></Button>
                      )}
                    </div>
                  </div>
                  <p className="break-words text-base leading-relaxed text-foreground">{a.text}</p>
                  {a.how_to_test && (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-sm font-semibold text-foreground">Suggested test</p>
                      <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">{a.how_to_test}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{filter === "all" ? "No assumptions added yet." : `No ${filter} assumptions.`}</p>}
        </TabsContent>
      </Tabs>
      {!readOnly && (
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-col gap-2 sm:flex-row">
          <Input aria-label="New assumption" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an assumption…" maxLength={600} className="min-w-0 flex-1" />
          <Button type="submit" variant="outline" disabled={!draft.trim()}><Plus /> Add assumption</Button>
        </form>
      )}
    </section>
  );
}
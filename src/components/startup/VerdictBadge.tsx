import { Badge } from "@/components/ui/badge";

export const VERDICT_LABEL: Record<string, string> = {
  strengthened: "Strengthened",
  weakened: "Weakened",
  mixed: "Mixed",
  unchanged: "No material change",
};

export function VerdictBadge({ verdict, status }: { verdict: string | null; status: string }) {
  if (status === "failed") return <Badge variant="negative">Failed</Badge>;
  if (status !== "complete") return <Badge variant="live">Scanning</Badge>;
  if (verdict === "strengthened") return <Badge variant="positive">Strengthened</Badge>;
  if (verdict === "weakened") return <Badge variant="negative">Weakened</Badge>;
  if (verdict === "mixed") return <Badge variant="uncertain">Mixed</Badge>;
  return <Badge variant="outline">No material change</Badge>;
}

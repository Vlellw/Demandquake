import { createRun, advanceRun } from "@/lib/pipeline.server";
const query = process.argv[2] ?? "Find startup opportunities in European manufacturing";
const t0 = Date.now();
const { runId, reused } = await createRun({ query, industry: null, geography: null, force: false });
console.log("run", runId, reused);
let guard = 0;
while (guard++ < 30) {
  const ts = Date.now();
  // generation phase: run up to 3 in parallel
  const res = await Promise.all([advanceRun(runId), advanceRun(runId), advanceRun(runId)]);
  console.log(((Date.now() - t0) / 1000).toFixed(1) + "s", JSON.stringify(res.map((r) => r.status + (r.busy ? "*" : ""))), ((Date.now() - ts) / 1000).toFixed(1) + "s");
  if (res.some((r) => r.status === "complete" || r.status === "failed")) break;
}
console.log("done in", (Date.now() - t0) / 1000);

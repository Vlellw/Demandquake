import { describe, expect, it } from "vitest";
import { myProjectsQuery, projectQuery, runDetailQuery, scanDetailQuery } from "@/lib/queries";

describe("loader cache reuse", () => {
  it("keeps workspace data fresh when its loader's observer mounts", () => {
    expect(myProjectsQuery.staleTime).toBe(15_000);
    expect(projectQuery("example").staleTime).toBe(10_000);
  });
  it("reuses progress reads without disabling active-job polling", () => {
    expect(runDetailQuery("example").staleTime).toBe(2000);
    expect(scanDetailQuery("example").staleTime).toBe(2000);
  });
});
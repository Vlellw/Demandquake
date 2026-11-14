import { describe, expect, it } from "vitest";
import { isCurrentBanner } from "@/lib/banner-version";

describe("topic artwork cache", () => {
  it("replaces old mosaic artwork instead of treating it as current", () => {
    expect(isCurrentBanner("/api/public/banner/startup-id")).toBe(false);
  });
  it("reuses successfully generated topic artwork", () => {
    expect(isCurrentBanner("/api/public/banner/startup-id?v=objects-2")).toBe(true);
  });
});
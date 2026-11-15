import { describe, expect, it } from "vitest";
import { networkReadDelay, retryNetworkRead } from "@/lib/query-recovery";

describe("interrupted read recovery", () => {
  it("allows two delayed retries then stops for failed browser fetches", () => {
    const error = new TypeError("Failed to fetch");
    expect(retryNetworkRead(0, error)).toBe(true);
    expect(retryNetworkRead(1, error)).toBe(true);
    expect(retryNetworkRead(2, error)).toBe(false);
    expect(networkReadDelay(0)).toBe(1000);
    expect(networkReadDelay(1)).toBe(2000);
  });
  it("does not retry auth, provider denials or application errors", () => {
    for (const error of [new Error("Failed to fetch"), new Error("Forbidden"), new Error("402"), new TypeError("Cannot read properties of null")]) {
      expect(retryNetworkRead(0, error)).toBe(false);
    }
  });
});
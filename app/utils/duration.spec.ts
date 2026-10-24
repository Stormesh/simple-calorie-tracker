import { describe, it, expect } from "vitest";
import { formatRetryDelay } from "./duration";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

describe("formatRetryDelay", () => {
  it("returns a placeholder when the deadline has already passed", () => {
    expect(formatRetryDelay(0, 1000)).toBe("a moment");
    expect(formatRetryDelay(1000, 1000)).toBe("a moment");
  });

  it("uses singular and plural minutes below an hour", () => {
    expect(formatRetryDelay(30 * 1000, 0)).toBe("1 minute");
    expect(formatRetryDelay(45 * MINUTE_MS, 0)).toBe("45 minutes");
  });

  it("rounds up so the deadline is never understated", () => {
    expect(formatRetryDelay(MINUTE_MS + 1, 0)).toBe("2 minutes");
  });

  it("drops the minutes component on whole hours", () => {
    expect(formatRetryDelay(2 * HOUR_MS, 0)).toBe("2h");
  });

  it("keeps the minutes component on partial hours", () => {
    expect(formatRetryDelay(3 * HOUR_MS + 20 * MINUTE_MS, 0)).toBe("3h 20m");
  });

  it("handles non-finite deadlines", () => {
    expect(formatRetryDelay(Number.POSITIVE_INFINITY, 0)).toBe("a moment");
  });
});

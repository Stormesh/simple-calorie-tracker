import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit";
import type { IRateLimitPolicy } from "./rate-limit";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const policy = (overrides: Partial<IRateLimitPolicy> = {}): IRateLimitPolicy => ({
  name: "test",
  max: 3,
  windowMs: MINUTE_MS,
  ...overrides,
});

/** Deterministic clock so window expiry needs no timers. */
const clock = (start = 1_000) => {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe("peek", () => {
  it("does not consume quota", () => {
    const limiter = createRateLimiter(clock().now);
    const policies = [policy()];

    expect(limiter.peek("1.1.1.1", policies).remaining).toBe(3);
    expect(limiter.peek("1.1.1.1", policies).remaining).toBe(3);
  });

  it("reports retryAt as the current time while still allowed", () => {
    const time = clock();
    const limiter = createRateLimiter(time.now);

    expect(limiter.peek("1.1.1.1", [policy()]).retryAt).toBe(time.now());
  });

  it("tracks each address separately", () => {
    const limiter = createRateLimiter(clock().now);
    const policies = [policy({ max: 1 })];

    limiter.consume("1.1.1.1", policies);

    expect(limiter.peek("1.1.1.1", policies).allowed).toBe(false);
    expect(limiter.peek("2.2.2.2", policies).allowed).toBe(true);
  });
});

describe("consume", () => {
  it("blocks once the policy maximum is reached", () => {
    const limiter = createRateLimiter(clock().now);
    const policies = [policy({ max: 2 })];

    limiter.consume("1.1.1.1", policies);
    expect(limiter.peek("1.1.1.1", policies)).toMatchObject({ allowed: true, remaining: 1 });

    limiter.consume("1.1.1.1", policies);
    expect(limiter.peek("1.1.1.1", policies)).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("does not extend a window that is already exhausted", () => {
    const time = clock();
    const limiter = createRateLimiter(time.now);
    const policies = [policy({ max: 1 })];

    limiter.consume("1.1.1.1", policies);
    const blockedUntil = limiter.peek("1.1.1.1", policies).retryAt;

    time.advance(30_000);
    limiter.consume("1.1.1.1", policies);

    expect(limiter.peek("1.1.1.1", policies).retryAt).toBe(blockedUntil);
  });

  it("restores capacity after the window elapses", () => {
    const time = clock();
    const limiter = createRateLimiter(time.now);
    const policies = [policy({ max: 1, windowMs: MINUTE_MS })];

    limiter.consume("1.1.1.1", policies);
    expect(limiter.peek("1.1.1.1", policies).allowed).toBe(false);

    time.advance(MINUTE_MS);
    expect(limiter.peek("1.1.1.1", policies)).toMatchObject({ allowed: true, remaining: 1 });
  });
});

describe("stacked policies", () => {
  const policies = [
    policy({ name: "hourly", max: 2, windowMs: MINUTE_MS }),
    policy({ name: "daily", max: 5, windowMs: DAY_MS }),
  ];

  it("reports the tightest remaining across windows", () => {
    const limiter = createRateLimiter(clock().now);

    limiter.consume("1.1.1.1", policies);

    expect(limiter.peek("1.1.1.1", policies).remaining).toBe(1);
  });

  it("unblocks at the earliest window reset that restores capacity", () => {
    const time = clock();
    const limiter = createRateLimiter(time.now);

    limiter.consume("1.1.1.1", policies);
    limiter.consume("1.1.1.1", policies);

    const blocked = limiter.peek("1.1.1.1", policies);
    expect(blocked.allowed).toBe(false);
    // Only the hourly window is exhausted, so that is the shortest way back.
    expect(blocked.retryAt).toBe(time.now() + MINUTE_MS);

    time.advance(MINUTE_MS);
    expect(limiter.peek("1.1.1.1", policies).allowed).toBe(true);
  });

  it("waits for the last reset when several windows are exhausted", () => {
    const time = clock();
    const limiter = createRateLimiter(time.now);
    const both = [
      policy({ name: "hourly", max: 2, windowMs: MINUTE_MS }),
      policy({ name: "daily", max: 2, windowMs: DAY_MS }),
    ];

    limiter.consume("1.1.1.1", both);
    limiter.consume("1.1.1.1", both);

    // Both windows are empty, so the daily reset is what actually unblocks.
    expect(limiter.peek("1.1.1.1", both).retryAt).toBe(time.now() + DAY_MS);
  });
});

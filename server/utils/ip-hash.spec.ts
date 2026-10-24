import { describe, it, expect } from "vitest";
import { hashIp } from "./ip-hash";

describe("hashIp", () => {
  it("produces a 64 character lowercase hex digest", async () => {
    const digest = await hashIp("203.0.113.7");

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable for the same address", async () => {
    expect(await hashIp("203.0.113.7")).toBe(await hashIp("203.0.113.7"));
  });

  it("separates different addresses", async () => {
    expect(await hashIp("203.0.113.7")).not.toBe(await hashIp("203.0.113.8"));
  });
});

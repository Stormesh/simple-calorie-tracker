import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALLOWED_ORIGINS,
  isPublicApiPath,
  parseAllowedOrigins,
  planCorsResponse,
} from "./cors";
import type { ICorsInput } from "./cors";

const allow = (...origins: string[]) => origins;

const plan = (overrides: Partial<ICorsInput> = {}) =>
  planCorsResponse({
    origin: "capacitor://localhost",
    path: "/api/community/search",
    method: "GET",
    allowedOrigins: DEFAULT_ALLOWED_ORIGINS,
    ...overrides,
  });

describe("planCorsResponse", () => {
  it("echoes the exact app origin", () => {
    expect(plan()?.headers["Access-Control-Allow-Origin"]).toBe("capacitor://localhost");
  });

  it("allows the Android origin", () => {
    expect(plan({ origin: "https://localhost" })?.headers["Access-Control-Allow-Origin"]).toBe(
      "https://localhost",
    );
  });

  it("answers preflight with 204 and no route work", () => {
    const decision = plan({ method: "OPTIONS", path: "/api/community/submit" });

    expect(decision?.status).toBe(204);
    expect(decision?.headers["Access-Control-Allow-Headers"]).toBe("content-type");
    expect(decision?.headers["Access-Control-Allow-Methods"]).toBe("GET,POST,OPTIONS");
  });

  it("varies on Origin even when rejecting", () => {
    const decision = plan({ origin: "https://evil.example" });

    expect(decision?.headers.Vary).toBe("Origin");
    expect(decision?.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("still answers a disallowed preflight, just without the allow headers", () => {
    const decision = plan({ origin: "https://evil.example", method: "OPTIONS" });

    expect(decision?.status).toBe(204);
    expect(decision?.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it.each(["/api/community/approve", "/api/community/delete", "/api/community/edit"])(
    "leaves the moderator route %s untouched",
    (path) => {
      expect(plan({ path, method: "POST" })).toBeNull();
    },
  );

  it("leaves flagged untouched", () => {
    expect(plan({ path: "/api/community/flagged" })).toBeNull();
  });

  it("leaves non-API paths untouched", () => {
    expect(plan({ path: "/" })).toBeNull();
  });

  it("covers nutrition search and detail", () => {
    expect(isPublicApiPath("/api/nutrition/search/milk")).toBe(true);
    expect(isPublicApiPath("/api/nutrition/12345")).toBe(true);
  });

  it("does not match a prefix of another community route", () => {
    expect(isPublicApiPath("/api/community/search-archive")).toBe(false);
  });
});

describe("parseAllowedOrigins", () => {
  it("falls back to the defaults when unset", () => {
    expect(parseAllowedOrigins("")).toEqual(DEFAULT_ALLOWED_ORIGINS);
    expect(parseAllowedOrigins(undefined)).toEqual(DEFAULT_ALLOWED_ORIGINS);
  });

  it("splits, trims and drops empty entries", () => {
    expect(parseAllowedOrigins(" https://maxhp.pages.dev , ,https://localhost ")).toEqual([
      "https://maxhp.pages.dev",
      "https://localhost",
    ]);
  });

  it("honours a configured single origin", () => {
    expect(parseAllowedOrigins("https://staging.example")).toEqual(["https://staging.example"]);
  });

  it("keeps the list immutable in behaviour across calls", () => {
    const origins = allow("https://a.example");
    expect(plan({ allowedOrigins: origins, origin: "https://a.example" })?.headers).toHaveProperty(
      "Access-Control-Allow-Origin",
      "https://a.example",
    );
    expect(
      plan({ allowedOrigins: origins, origin: "https://b.example" })?.headers,
    ).not.toHaveProperty("Access-Control-Allow-Origin");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { apiUrl, getApiBase, setApiBase } from "./api";

afterEach(() => {
  setApiBase("");
});

describe("apiUrl", () => {
  it("returns the path untouched while no base is configured (web)", () => {
    expect(apiUrl("/api/community/search?q=milk")).toBe("/api/community/search?q=milk");
  });

  it("prefixes the configured base (native)", () => {
    setApiBase("https://maxhp.pages.dev");

    expect(apiUrl("/api/nutrition/search/milk")).toBe(
      "https://maxhp.pages.dev/api/nutrition/search/milk",
    );
  });

  it("tolerates a trailing slash on the base", () => {
    setApiBase("https://maxhp.pages.dev/");

    expect(getApiBase()).toBe("https://maxhp.pages.dev");
    expect(apiUrl("/api/community/search")).toBe("https://maxhp.pages.dev/api/community/search");
  });

  it("adds a missing leading slash", () => {
    setApiBase("https://maxhp.pages.dev");

    expect(apiUrl("api/community/search")).toBe("https://maxhp.pages.dev/api/community/search");
  });

  it("treats a whitespace-only base as unset", () => {
    setApiBase("   ");

    expect(getApiBase()).toBe("");
    expect(apiUrl("/api/nutrition/1")).toBe("/api/nutrition/1");
  });
});

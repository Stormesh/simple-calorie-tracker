import { describe, it, expect } from "vitest";
import { escapeLikePattern, normalizeFoodName } from "./food-name";

describe("normalizeFoodName", () => {
  it("lowercases and trims", () => {
    expect(normalizeFoodName("  Chicken Breast  ")).toBe("chicken breast");
  });

  it("collapses internal whitespace, including tabs and newlines", () => {
    expect(normalizeFoodName("chicken \t\n  breast")).toBe("chicken breast");
  });

  it("folds accented characters to a single form", () => {
    const composed = "Caf\u00e9"; // café
    const decomposed = "Cafe\u0301"; // cafe + combining acute

    expect(normalizeFoodName(composed)).toBe(normalizeFoodName(decomposed));
    expect(normalizeFoodName(composed)).toBe("caf\u00e9");
  });

  it("lowercases non-ASCII characters, which SQLite's lower() cannot", () => {
    expect(normalizeFoodName("CAF\u00c9")).toBe("caf\u00e9");
  });

  it("strips zero-width characters", () => {
    expect(normalizeFoodName("chic\u200Bken\uFEFF")).toBe("chicken");
  });

  it("treats visually identical names as the same key", () => {
    expect(normalizeFoodName("Chicken  Breast")).toBe(normalizeFoodName("chicken breast"));
  });

  it("keeps genuinely different names apart", () => {
    expect(normalizeFoodName("chicken breast")).not.toBe(normalizeFoodName("chicken thigh"));
  });

  it("returns an empty key for whitespace-only input", () => {
    expect(normalizeFoodName("   ")).toBe("");
    expect(normalizeFoodName("\u200B")).toBe("");
  });
});

describe("escapeLikePattern", () => {
  it("escapes the LIKE wildcards", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes the escape character itself", () => {
    expect(escapeLikePattern("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeLikePattern("chicken breast")).toBe("chicken breast");
  });
});

import { describe, it, expect } from "vitest";
import {
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  HEX_COLOR_RE,
  isThemeId,
  sanitizeAccent,
  sanitizeTheme,
  themes,
} from "./themes";

describe("isThemeId", () => {
  it("accepts every registered preset id", () => {
    for (const theme of themes) {
      expect(isThemeId(theme.id)).toBe(true);
    }
    expect(isThemeId("custom")).toBe(true);
  });

  it("rejects unknown strings and non-strings", () => {
    expect(isThemeId("nope")).toBe(false);
    expect(isThemeId("Crimson")).toBe(false); // case-sensitive
    expect(isThemeId("")).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
    expect(isThemeId(42)).toBe(false);
    expect(isThemeId({ id: "crimson" })).toBe(false);
  });
});

describe("sanitizeTheme", () => {
  it("passes through valid theme ids", () => {
    for (const theme of themes) {
      expect(sanitizeTheme(theme.id)).toBe(theme.id);
    }
    expect(sanitizeTheme("custom")).toBe("custom");
  });

  it("falls back to the default for anything invalid", () => {
    expect(sanitizeTheme("nope")).toBe(DEFAULT_THEME);
    expect(sanitizeTheme("")).toBe(DEFAULT_THEME);
    expect(sanitizeTheme(null)).toBe(DEFAULT_THEME);
    expect(sanitizeTheme(undefined)).toBe(DEFAULT_THEME);
    expect(sanitizeTheme(123)).toBe(DEFAULT_THEME);
  });
});

describe("sanitizeAccent", () => {
  it("accepts a valid 6-digit hex color", () => {
    expect(sanitizeAccent("#ef4444")).toBe("#ef4444");
    expect(sanitizeAccent("#ABCDEF")).toBe("#ABCDEF");
    expect(sanitizeAccent("#000000")).toBe("#000000");
  });

  it("falls back to the default for malformed colors", () => {
    expect(sanitizeAccent("#ef444")).toBe(DEFAULT_ACCENT); // too short
    expect(sanitizeAccent("#ef44444")).toBe(DEFAULT_ACCENT); // too long
    expect(sanitizeAccent("ef4444")).toBe(DEFAULT_ACCENT); // missing #
    expect(sanitizeAccent("#ef44zz")).toBe(DEFAULT_ACCENT); // non-hex
    expect(sanitizeAccent("red")).toBe(DEFAULT_ACCENT);
    expect(sanitizeAccent("")).toBe(DEFAULT_ACCENT);
    expect(sanitizeAccent(null)).toBe(DEFAULT_ACCENT);
    expect(sanitizeAccent("#rgb")).toBe(DEFAULT_ACCENT);
  });
});

describe("HEX_COLOR_RE", () => {
  it("matches exactly six hex digits after a hash", () => {
    expect(HEX_COLOR_RE.test("#123abc")).toBe(true);
    expect(HEX_COLOR_RE.test("#123ABC")).toBe(true);
    expect(HEX_COLOR_RE.test("#123ab")).toBe(false); // 5 digits
    expect(HEX_COLOR_RE.test("#123abcd")).toBe(false); // 7 digits
    expect(HEX_COLOR_RE.test("123abc")).toBe(false); // no hash
  });
});

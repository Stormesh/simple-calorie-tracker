import { describe, it, expect } from "vitest";
import { planNameKeyBackfill, planToStatements } from "./backfill-name-key";
import type { INameKeyRow } from "./backfill-name-key";

const row = (overrides: Partial<INameKeyRow> = {}): INameKeyRow => ({
  id: "community-1",
  food_name: "Chicken Breast",
  name_key: null,
  flags: 0,
  hidden: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("planNameKeyBackfill", () => {
  it("writes the key for rows that do not have one", () => {
    const plan = planNameKeyBackfill([row()]);

    expect(plan.updates).toEqual([{ id: "community-1", nameKey: "chicken breast" }]);
    expect(plan.duplicates).toEqual([]);
    expect(plan.merges).toEqual([]);
  });

  it("leaves rows that already hold the correct key alone", () => {
    const plan = planNameKeyBackfill([row({ name_key: "chicken breast" })]);

    expect(plan.updates).toEqual([]);
  });

  it("groups names that normalize to the same key", () => {
    const plan = planNameKeyBackfill([
      row({ id: "community-a", food_name: "Chicken  Breast" }),
      row({ id: "community-b", food_name: "chicken breast" }),
      row({ id: "community-c", food_name: "Chicken Thigh" }),
    ]);

    expect(plan.duplicates).toHaveLength(1);
    expect(plan.duplicates[0]!.nameKey).toBe("chicken breast");
    expect(plan.duplicates[0]!.removedIds).toEqual(["community-b"]);
  });

  it("keeps the earliest row as the survivor", () => {
    const plan = planNameKeyBackfill([
      row({ id: "community-late", created_at: "2026-05-01T00:00:00.000Z" }),
      row({ id: "community-early", created_at: "2026-01-01T00:00:00.000Z" }),
    ]);

    expect(plan.duplicates[0]!.survivorId).toBe("community-early");
    expect(plan.duplicates[0]!.removedIds).toEqual(["community-late"]);
  });

  it("breaks created_at ties by id so runs agree", () => {
    const plan = planNameKeyBackfill([row({ id: "community-b" }), row({ id: "community-a" })]);

    expect(plan.duplicates[0]!.survivorId).toBe("community-a");
  });

  it("merges flags and hidden state upward instead of discarding it", () => {
    const plan = planNameKeyBackfill([
      row({ id: "community-early", flags: 1, hidden: 0 }),
      row({ id: "community-late", flags: 3, hidden: 1 }),
    ]);

    expect(plan.merges).toEqual([{ id: "community-early", flags: 3, hidden: 1 }]);
  });

  it("skips the merge when the survivor already carries the state", () => {
    const plan = planNameKeyBackfill([
      row({ id: "community-early", flags: 3, hidden: 1 }),
      row({ id: "community-late", flags: 1, hidden: 0 }),
    ]);

    expect(plan.merges).toEqual([]);
  });
});

describe("planToStatements", () => {
  it("merges, then deletes, then writes keys", () => {
    const plan = planNameKeyBackfill([
      row({ id: "community-early", flags: 0 }),
      row({ id: "community-late", flags: 2, hidden: 1 }),
    ]);

    const statements = planToStatements(plan);

    expect(statements[0]).toContain("UPDATE community_foods SET flags = 2, hidden = 1");
    expect(statements[1]).toContain("DELETE FROM community_foods WHERE id IN ('community-late')");
    expect(statements.at(-1)).toContain("SET name_key = 'chicken breast'");
  });

  it("never writes a key for a row it is deleting", () => {
    const plan = planNameKeyBackfill([
      row({ id: "community-early", name_key: "chicken breast" }),
      row({ id: "community-late" }),
    ]);

    const statements = planToStatements(plan);

    expect(
      statements.some((sql) => sql.includes("community-late") && sql.includes("name_key")),
    ).toBe(false);
  });

  it("escapes single quotes in names", () => {
    const plan = planNameKeyBackfill([row({ food_name: "Bob's Burger" })]);

    expect(planToStatements(plan)[0]).toContain("'bob''s burger'");
  });
});

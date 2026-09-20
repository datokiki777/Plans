import { describe, expect, it } from "vitest";
import { isCorrectionResolved, compareCorrectionsForDisplay } from "./rules";
import type { Correction } from "./types";

describe("isCorrectionResolved", () => {
  it("is true for fixed and not-applicable, false for pending", () => {
    expect(isCorrectionResolved("fixed")).toBe(true);
    expect(isCorrectionResolved("not-applicable")).toBe(true);
    expect(isCorrectionResolved("pending")).toBe(false);
  });
});

describe("compareCorrectionsForDisplay", () => {
  function correction(overrides: Partial<Correction>): Correction {
    return {
      id: "id",
      jobId: "job-1",
      status: "pending",
      comment: "",
      resolvedDate: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides
    };
  }

  it("puts pending before fixed before not-applicable, regardless of input order", () => {
    const notApplicable = correction({ id: "na", status: "not-applicable" });
    const pending = correction({ id: "p", status: "pending" });
    const fixed = correction({ id: "f", status: "fixed" });

    const sorted = [notApplicable, fixed, pending].sort(compareCorrectionsForDisplay);
    expect(sorted.map((c) => c.id)).toEqual(["p", "f", "na"]);
  });

  it("within the same status, sorts newest createdAt first - the exact reported request", () => {
    const older = correction({ id: "older", status: "pending", createdAt: "2026-01-01T00:00:00.000Z" });
    const newer = correction({ id: "newer", status: "pending", createdAt: "2026-08-15T00:00:00.000Z" });

    const sorted = [older, newer].sort(compareCorrectionsForDisplay);
    expect(sorted.map((c) => c.id)).toEqual(["newer", "older"]);
  });

  it("status grouping wins over date, even when a much older pending item exists next to a very recent fixed one", () => {
    const oldPending = correction({ id: "old-pending", status: "pending", createdAt: "2020-01-01T00:00:00.000Z" });
    const recentFixed = correction({ id: "recent-fixed", status: "fixed", createdAt: "2026-09-17T00:00:00.000Z" });

    const sorted = [recentFixed, oldPending].sort(compareCorrectionsForDisplay);
    expect(sorted.map((c) => c.id)).toEqual(["old-pending", "recent-fixed"]);
  });
});

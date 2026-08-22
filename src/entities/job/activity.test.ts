import { describe, expect, it } from "vitest";
import { isJobActiveToday } from "./activity";

describe("isJobActiveToday", () => {
  it("is false when there's no jobDate", () => {
    expect(isJobActiveToday({ jobDate: null, jobDurationDays: 3 }, "2026-08-20")).toBe(false);
  });

  it("a 1-day job (no duration) is active only on its own date", () => {
    expect(isJobActiveToday({ jobDate: "2026-08-20", jobDurationDays: null }, "2026-08-20")).toBe(true);
    expect(isJobActiveToday({ jobDate: "2026-08-20", jobDurationDays: null }, "2026-08-19")).toBe(false);
    expect(isJobActiveToday({ jobDate: "2026-08-20", jobDurationDays: null }, "2026-08-21")).toBe(false);
  });

  it("a multi-day job is active on every day of its span, inclusive", () => {
    const job = { jobDate: "2026-08-19", jobDurationDays: 3 };
    expect(isJobActiveToday(job, "2026-08-18")).toBe(false);
    expect(isJobActiveToday(job, "2026-08-19")).toBe(true);
    expect(isJobActiveToday(job, "2026-08-20")).toBe(true);
    expect(isJobActiveToday(job, "2026-08-21")).toBe(true);
    expect(isJobActiveToday(job, "2026-08-22")).toBe(false);
  });

  it("correctly spans a month boundary", () => {
    const job = { jobDate: "2026-08-30", jobDurationDays: 4 };
    expect(isJobActiveToday(job, "2026-08-31")).toBe(true);
    expect(isJobActiveToday(job, "2026-09-01")).toBe(true);
    expect(isJobActiveToday(job, "2026-09-02")).toBe(true);
    expect(isJobActiveToday(job, "2026-09-03")).toBe(false);
  });
});

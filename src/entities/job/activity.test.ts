import { describe, expect, it } from "vitest";
import { isJobActiveToday, findHighlightDate, isJobHighlighted, computeGroupHighlightDates, isJobRowHighlighted } from "./activity";

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

describe("findHighlightDate", () => {
  it("returns today when at least one non-archived job covers it", () => {
    const jobs = [{ jobDate: "2026-08-23", jobDurationDays: 1, status: "active" as const }];
    expect(findHighlightDate(jobs, "2026-08-23")).toBe("2026-08-23");
  });

  it("ignores archived jobs even if their date covers today", () => {
    const jobs = [{ jobDate: "2026-08-23", jobDurationDays: 1, status: "archived" as const }];
    expect(findHighlightDate(jobs, "2026-08-23")).not.toBe("2026-08-23");
  });

  it("rolls forward to the nearest future date once today's work is archived - the exact reported scenario", () => {
    const jobs = [
      { jobDate: "2026-08-23", jobDurationDays: 1, status: "archived" as const }, // today's job, done
      { jobDate: "2026-08-25", jobDurationDays: 2, status: "active" as const }, // Monday, group A
      { jobDate: "2026-08-25", jobDurationDays: 1, status: "active" as const }, // Monday, group B
      { jobDate: "2026-08-30", jobDurationDays: 1, status: "active" as const } // further out, should NOT win
    ];
    expect(findHighlightDate(jobs, "2026-08-23")).toBe("2026-08-25");
  });

  it("returns null when there is nothing non-archived to highlight at all", () => {
    const jobs = [{ jobDate: "2026-08-20", jobDurationDays: 1, status: "archived" as const }];
    expect(findHighlightDate(jobs, "2026-08-23")).toBeNull();
    expect(findHighlightDate([], "2026-08-23")).toBeNull();
  });
});

describe("isJobHighlighted", () => {
  it("matches jobs whose range covers the highlight date", () => {
    const job = { jobDate: "2026-08-25", jobDurationDays: 2, status: "active" as const };
    expect(isJobHighlighted(job, "2026-08-25")).toBe(true);
    expect(isJobHighlighted(job, "2026-08-26")).toBe(true);
    expect(isJobHighlighted(job, "2026-08-27")).toBe(false);
  });

  it("never highlights an archived job, even if its date matches", () => {
    const job = { jobDate: "2026-08-25", jobDurationDays: 2, status: "archived" as const };
    expect(isJobHighlighted(job, "2026-08-25")).toBe(false);
  });

  it("is false when there is no highlight date at all", () => {
    const job = { jobDate: "2026-08-25", jobDurationDays: 2, status: "active" as const };
    expect(isJobHighlighted(job, null)).toBe(false);
  });
});

describe("computeGroupHighlightDates - the exact reported bug", () => {
  it("group A having work today does not block group B's own upcoming day from being found", () => {
    const jobs = [
      { groupId: "A", jobDate: "2026-08-23", jobDurationDays: 1, status: "active" as const }, // A: today
      { groupId: "B", jobDate: "2026-08-24", jobDurationDays: 1, status: "active" as const } // B: tomorrow, nothing today
    ];
    const dates = computeGroupHighlightDates(jobs, "2026-08-23");
    expect(dates.get("A")).toBe("2026-08-23");
    expect(dates.get("B")).toBe("2026-08-24"); // previously: undefined (the bug)
  });

  it("a third group with nothing scheduled at all gets no entry", () => {
    const jobs = [
      { groupId: "A", jobDate: "2026-08-23", jobDurationDays: 1, status: "active" as const },
      { groupId: "C", jobDate: "2026-08-10", jobDurationDays: 1, status: "archived" as const } // fully in the past, archived
    ];
    const dates = computeGroupHighlightDates(jobs, "2026-08-23");
    expect(dates.has("C")).toBe(false);
  });

  it("ignores jobs with no group entirely", () => {
    const jobs = [{ groupId: null, jobDate: "2026-08-23", jobDurationDays: 1, status: "active" as const }];
    expect(computeGroupHighlightDates(jobs, "2026-08-23").size).toBe(0);
  });
});

describe("isJobRowHighlighted", () => {
  it("checks a grouped job against its OWN group's date, not a shared one", () => {
    const groupDates = new Map([
      ["A", "2026-08-23"],
      ["B", "2026-08-24"]
    ]);
    const jobA = { groupId: "A", jobDate: "2026-08-23", jobDurationDays: 1, status: "active" as const };
    const jobB = { groupId: "B", jobDate: "2026-08-24", jobDurationDays: 1, status: "active" as const };
    expect(isJobRowHighlighted(jobA, groupDates, "2026-08-23")).toBe(true);
    expect(isJobRowHighlighted(jobB, groupDates, "2026-08-23")).toBe(true); // matches B's own date, not "today"
  });

  it("an ungrouped job is checked against today directly", () => {
    const job = { groupId: null, jobDate: "2026-08-23", jobDurationDays: 1, status: "active" as const };
    expect(isJobRowHighlighted(job, new Map(), "2026-08-23")).toBe(true);
    expect(isJobRowHighlighted(job, new Map(), "2026-08-22")).toBe(false);
  });

  it("never highlights an archived job, even if it matches its group's date", () => {
    const groupDates = new Map([["A", "2026-08-23"]]);
    const job = { groupId: "A", jobDate: "2026-08-23", jobDurationDays: 1, status: "archived" as const };
    expect(isJobRowHighlighted(job, groupDates, "2026-08-23")).toBe(false);
  });
});

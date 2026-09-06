import { describe, expect, it } from "vitest";
import { jobOverlapsPeriod, findPeriodForJob, isJobDateAllowedForGroup, isPeriodActiveToday } from "./domain";
import type { GroupPeriod } from "./types";

function period(overrides: Partial<GroupPeriod> = {}): GroupPeriod {
  return {
    id: "p1",
    groupId: "g1",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    carNumber: null,
    worker1Name: "",
    worker2Name: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("jobOverlapsPeriod", () => {
  it("is false when the job has no date", () => {
    expect(jobOverlapsPeriod({ jobDate: null, jobDurationDays: null }, period())).toBe(false);
  });

  it("matches a single-day job whose date falls inside the period", () => {
    expect(jobOverlapsPeriod({ jobDate: "2026-09-03", jobDurationDays: 1 }, period())).toBe(true);
  });

  it("matches a job with no duration (treated as 1 day) whose date falls inside the period", () => {
    expect(jobOverlapsPeriod({ jobDate: "2026-09-03", jobDurationDays: null }, period())).toBe(true);
  });

  it("does not match a job entirely before the period", () => {
    expect(jobOverlapsPeriod({ jobDate: "2026-08-20", jobDurationDays: 2 }, period())).toBe(false);
  });

  it("does not match a job entirely after the period", () => {
    expect(jobOverlapsPeriod({ jobDate: "2026-09-10", jobDurationDays: 1 }, period())).toBe(false);
  });

  it("matches a multi-day job that starts before the period but overlaps into it", () => {
    // Job: Aug 30 - Sep 2 (3 days), period: Sep 1-5 - overlaps Sep 1-2.
    expect(jobOverlapsPeriod({ jobDate: "2026-08-30", jobDurationDays: 3 }, period())).toBe(true);
  });

  it("matches a multi-day job that starts inside the period but extends past its end", () => {
    // Job: Sep 4 - Sep 8 (5 days), period: Sep 1-5 - overlaps Sep 4-5.
    expect(jobOverlapsPeriod({ jobDate: "2026-09-04", jobDurationDays: 5 }, period())).toBe(true);
  });

  it("matches a job spanning the entire period and beyond on both sides", () => {
    expect(jobOverlapsPeriod({ jobDate: "2026-08-25", jobDurationDays: 20 }, period())).toBe(true);
  });

  it("matches right at the boundary: job ends exactly on the period's start date", () => {
    // Job: Aug 31 - Sep 1 (2 days) - jobEnd (Sep 1) equals period.startDate exactly.
    expect(jobOverlapsPeriod({ jobDate: "2026-08-31", jobDurationDays: 2 }, period())).toBe(true);
  });

  it("does not match one day short of the boundary", () => {
    // Job: Aug 30 - Aug 31 (2 days) - ends the day before the period starts.
    expect(jobOverlapsPeriod({ jobDate: "2026-08-30", jobDurationDays: 2 }, period())).toBe(false);
  });
});

describe("findPeriodForJob", () => {
  it("returns undefined when the job has no group", () => {
    expect(findPeriodForJob({ jobDate: "2026-09-03", jobDurationDays: 1, groupId: null }, [period()])).toBeUndefined();
  });

  it("returns undefined when no period overlaps the job's date", () => {
    expect(findPeriodForJob({ jobDate: "2026-10-01", jobDurationDays: 1, groupId: "g1" }, [period()])).toBeUndefined();
  });

  it("ignores periods belonging to a different group", () => {
    const otherGroup = period({ id: "p2", groupId: "g2" });
    expect(findPeriodForJob({ jobDate: "2026-09-03", jobDurationDays: 1, groupId: "g1" }, [otherGroup])).toBeUndefined();
  });

  it("finds the matching period for the job's group and date", () => {
    const match = period();
    expect(findPeriodForJob({ jobDate: "2026-09-03", jobDurationDays: 1, groupId: "g1" }, [match])).toBe(match);
  });

  it("picks the most recently started period when more than one overlaps", () => {
    const earlier = period({ id: "p-earlier", startDate: "2026-08-25", endDate: "2026-09-10" });
    const later = period({ id: "p-later", startDate: "2026-09-01", endDate: "2026-09-05" });
    const result = findPeriodForJob({ jobDate: "2026-09-03", jobDurationDays: 1, groupId: "g1" }, [earlier, later]);
    expect(result?.id).toBe("p-later");
  });
});

describe("isJobDateAllowedForGroup", () => {
  it("is always allowed when the group has no periods at all", () => {
    expect(isJobDateAllowedForGroup({ jobDate: "2026-01-01", jobDurationDays: 1 }, [])).toBe(true);
  });

  it("is allowed when the job's date falls within one of the group's periods", () => {
    expect(isJobDateAllowedForGroup({ jobDate: "2026-09-03", jobDurationDays: 1 }, [period()])).toBe(true);
  });

  it("is blocked when the group has periods but none cover the job's date", () => {
    expect(isJobDateAllowedForGroup({ jobDate: "2026-10-01", jobDurationDays: 1 }, [period()])).toBe(false);
  });

  it("is always allowed when the job has no date yet, even if the group has periods", () => {
    expect(isJobDateAllowedForGroup({ jobDate: null, jobDurationDays: null }, [period()])).toBe(true);
  });
});

describe("isPeriodActiveToday", () => {
  it("is true when today falls within the period, inclusive of both boundaries", () => {
    const p = period({ startDate: "2026-09-01", endDate: "2026-09-05" });
    expect(isPeriodActiveToday(p, "2026-09-01")).toBe(true);
    expect(isPeriodActiveToday(p, "2026-09-03")).toBe(true);
    expect(isPeriodActiveToday(p, "2026-09-05")).toBe(true);
  });

  it("is false before the period starts or after it ends", () => {
    const p = period({ startDate: "2026-09-01", endDate: "2026-09-05" });
    expect(isPeriodActiveToday(p, "2026-08-31")).toBe(false);
    expect(isPeriodActiveToday(p, "2026-09-06")).toBe(false);
  });
});

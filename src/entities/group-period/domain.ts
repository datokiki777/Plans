import type { GroupPeriod } from "./types";
import { addDays } from "@/entities/stay";

/** A job "belongs" to a period automatically - there's no manual
 * attachment step. A job counts as part of a period when its own
 * scheduled range ([jobDate, jobDate + duration - 1]) overlaps the
 * period's range at all, not just when its start date falls inside it -
 * a job spanning into or out of the period still counts. */
export function jobOverlapsPeriod(job: { jobDate: string | null; jobDurationDays: number | null }, period: GroupPeriod): boolean {
  if (!job.jobDate) return false;
  const days = job.jobDurationDays && job.jobDurationDays > 0 ? job.jobDurationDays : 1;
  const jobEnd = addDays(job.jobDate, days - 1);
  return job.jobDate <= period.endDate && jobEnd >= period.startDate;
}

/** Finds which of a group's periods (if any) a job falls into, so its
 * car/worker info can be read from that period's own snapshot rather than
 * the group's current (possibly since-changed) values. When a job matches
 * more than one period (overlapping periods, which shouldn't normally
 * happen but isn't actively prevented), the most recently started one
 * wins. */
export function findPeriodForJob(
  job: { jobDate: string | null; jobDurationDays: number | null; groupId: string | null },
  periods: GroupPeriod[]
): GroupPeriod | undefined {
  if (!job.groupId) return undefined;
  const candidates = periods.filter((p) => p.groupId === job.groupId && jobOverlapsPeriod(job, p));
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, p) => (p.startDate > latest.startDate ? p : latest));
}

/** Whether a job's date is allowed for its group, given that group's own
 * periods (already filtered to just this group). A group that has never
 * defined any periods is unrestricted (old-style groups, or ones that
 * simply don't use this feature) - the check only activates once at least
 * one period exists, in which case the job's date must fall within one of
 * them. Used to stop a job being created/edited with a date that doesn't
 * belong to any of its group's planned work windows. */
export function isJobDateAllowedForGroup(job: { jobDate: string | null; jobDurationDays: number | null }, groupPeriods: GroupPeriod[]): boolean {
  if (!job.jobDate || groupPeriods.length === 0) return true;
  return groupPeriods.some((p) => jobOverlapsPeriod(job, p));
}

/** Whether a period is currently in progress - purely today's date
 * falling within [startDate, endDate], with no regard at all to any
 * job's status (active/archived). Used to highlight the "currently
 * happening" period in the Jobs page's period picker, the same green
 * highlight already used for groups/jobs elsewhere. */
export function isPeriodActiveToday(period: Pick<GroupPeriod, "startDate" | "endDate">, today: string): boolean {
  return today >= period.startDate && today <= period.endDate;
}

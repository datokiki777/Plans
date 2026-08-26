import type { Job, JobStatus } from "./types";
import { addDays } from "@/entities/stay";

/** True when the given reference date falls within the Job's scheduled
 * work period - [jobDate, jobDate + jobDurationDays - 1] inclusive. A job
 * with a date but no duration is treated as a single day. A job with no
 * date never matches. Whole-day date-only arithmetic (addDays), same
 * approach already proven for worker period calculations - no time-of-day/
 * timezone ambiguity. */
export function isJobActiveToday(job: Pick<Job, "jobDate" | "jobDurationDays">, referenceDate: string): boolean {
  if (!job.jobDate) return false;
  const days = job.jobDurationDays && job.jobDurationDays > 0 ? job.jobDurationDays : 1;
  const lastDay = addDays(job.jobDate, days - 1);
  return referenceDate >= job.jobDate && referenceDate <= lastDay;
}

/** Which date the "what's happening" highlight should point at: today
 * itself if any non-archived job covers it, otherwise the nearest future
 * date that has at least one non-archived job starting on it. This is
 * what makes the highlight "roll forward" once today's jobs are archived
 * (done) - it points at Monday's work instead of just going dark. Returns
 * null when there's nothing non-archived to highlight at all. */
export function findHighlightDate(jobs: Array<Pick<Job, "jobDate" | "jobDurationDays" | "status">>, today: string): string | null {
  const eligible = jobs.filter((j) => j.status !== "archived");
  if (eligible.some((j) => isJobActiveToday(j, today))) return today;

  const futureDates = eligible.map((j) => j.jobDate).filter((d): d is string => d !== null && d > today);
  if (futureDates.length === 0) return null;
  return futureDates.reduce((min, d) => (d < min ? d : min));
}

/** Convenience combining findHighlightDate's result with the per-job
 * range check and an explicit archived guard (archived jobs never glow,
 * even if their date range happens to overlap the highlight date). */
export function isJobHighlighted(
  job: Pick<Job, "jobDate" | "jobDurationDays"> & { status: JobStatus },
  highlightDate: string | null
): boolean {
  if (highlightDate === null || job.status === "archived") return false;
  return isJobActiveToday(job, highlightDate);
}

/** Each GROUP finds its own "what's next" date independently - one
 * group's work happening today must not block a different group's
 * upcoming day from being found. (A single shared date for every group
 * was the bug: whichever group had work today "won" today as the target
 * date, and every other group's jobs were checked against thatsame date -
 * a group with nothing today but something tomorrow never highlighted at
 * all, even though tomorrow's job for THAT group should.) Jobs with no
 * group are not included here - see isJobRowHighlighted for how they're
 * handled (simple "active today", no rolling forward - there's no
 * sibling job to roll forward towards). */
export function computeGroupHighlightDates(
  jobs: Array<Pick<Job, "jobDate" | "jobDurationDays" | "status" | "groupId">>,
  today: string
): Map<string, string> {
  const byGroup = new Map<string, Array<Pick<Job, "jobDate" | "jobDurationDays" | "status">>>();
  for (const job of jobs) {
    if (!job.groupId) continue;
    const list = byGroup.get(job.groupId);
    if (list) list.push(job);
    else byGroup.set(job.groupId, [job]);
  }

  const result = new Map<string, string>();
  for (const [groupId, groupJobs] of byGroup) {
    const date = findHighlightDate(groupJobs, today);
    if (date !== null) result.set(groupId, date);
  }
  return result;
}

/** The single function both Jobs page rows and Dashboard rows should use:
 * a grouped job is checked against ITS OWN group's highlight date (from
 * computeGroupHighlightDates); an ungrouped job is just checked against
 * today directly. Archived jobs never highlight. */
export function isJobRowHighlighted(
  job: Pick<Job, "jobDate" | "jobDurationDays" | "groupId"> & { status: JobStatus },
  groupHighlightDates: Map<string, string>,
  today: string
): boolean {
  if (job.status === "archived") return false;
  const referenceDate = job.groupId ? groupHighlightDates.get(job.groupId) : today;
  if (referenceDate === undefined) return false;
  return isJobActiveToday(job, referenceDate);
}

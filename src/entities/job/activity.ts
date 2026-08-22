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

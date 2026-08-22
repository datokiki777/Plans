import type { Job } from "./types";
import { addDays } from "@/entities/stay";

/** True when today falls within the Job's scheduled work period -
 * [jobDate, jobDate + jobDurationDays - 1] inclusive. A job with a date
 * but no duration is treated as a single day. A job with no date is
 * never "active today" (nothing to compare against). Whole-day date-only
 * arithmetic (addDays), same approach already proven for worker period
 * calculations - no time-of-day/timezone ambiguity. */
export function isJobActiveToday(job: Pick<Job, "jobDate" | "jobDurationDays">, today: string): boolean {
  if (!job.jobDate) return false;
  const days = job.jobDurationDays && job.jobDurationDays > 0 ? job.jobDurationDays : 1;
  const lastDay = addDays(job.jobDate, days - 1);
  return today >= job.jobDate && today <= lastDay;
}

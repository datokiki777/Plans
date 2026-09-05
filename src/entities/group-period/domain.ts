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

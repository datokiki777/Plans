import type { Job } from "./types";

/** Sorts by the job's scheduled date (jobDate) descending - newest first,
 * matching what's actually displayed in every list. Jobs with a date
 * always come before undated ones; undated jobs fall back to createdAt
 * (also newest first) so their relative order is still stable and
 * meaningful rather than arbitrary. */
export function compareByJobDateDesc(a: Job, b: Job): number {
  if (a.jobDate && b.jobDate) return b.jobDate.localeCompare(a.jobDate);
  if (a.jobDate) return -1;
  if (b.jobDate) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

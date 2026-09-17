import type { Job } from "./types";

/** Sorts by the job's scheduled date (jobDate) ascending - nearest date
 * first, matching what "upcoming work" naturally means and what the
 * Dashboard's own upcoming-jobs list already did correctly. Jobs with a
 * date always come before undated ones; undated jobs fall back to
 * createdAt (also ascending) so their relative order is still stable
 * rather than arbitrary. */
export function compareByJobDateAsc(a: Job, b: Job): number {
  if (a.jobDate && b.jobDate) return a.jobDate.localeCompare(b.jobDate);
  if (a.jobDate) return -1;
  if (b.jobDate) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

/** Newest date first - used for archived jobs, where "most recently
 * done" (yesterday, the day before, ...) is what's actually useful to
 * see at the top, the reverse of "upcoming work" ordering. Same
 * dated-before-undated / createdAt fallback as the ascending version,
 * just flipped. */
export function compareByJobDateDesc(a: Job, b: Job): number {
  if (a.jobDate && b.jobDate) return b.jobDate.localeCompare(a.jobDate);
  if (a.jobDate) return -1;
  if (b.jobDate) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

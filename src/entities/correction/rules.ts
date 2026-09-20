import type { Correction, CorrectionStatus } from "./types";

/** Only "fixed" and "not-applicable" are resolved states - "pending"
 * always means still open, regardless of whether a resolvedDate happens
 * to be set on the record. */
export function isCorrectionResolved(status: CorrectionStatus): boolean {
  return status === "fixed" || status === "not-applicable";
}

/** Still-open work belongs at the top: pending, then fixed, then
 * not-applicable - regardless of when each was created. Within the same
 * status, newest first (matches the createdAt-desc order this list
 * already used before status grouping was added). The default sort for
 * both CorrectionRepository.listByJob and .listAll. */
const STATUS_SORT_ORDER: Record<CorrectionStatus, number> = { pending: 0, fixed: 1, "not-applicable": 2 };

export function compareCorrectionsForDisplay(a: Correction, b: Correction): number {
  const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
  if (statusDiff !== 0) return statusDiff;
  return b.createdAt.localeCompare(a.createdAt);
}

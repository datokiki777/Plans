import type { CorrectionStatus } from "./types";

/** Only "fixed" and "not-applicable" are resolved states - "pending"
 * always means still open, regardless of whether a resolvedDate happens
 * to be set on the record. */
export function isCorrectionResolved(status: CorrectionStatus): boolean {
  return status === "fixed" || status === "not-applicable";
}

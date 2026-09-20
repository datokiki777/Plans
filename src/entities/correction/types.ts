/** A "needs fixing" item tied to a specific job - a shower installation
 * that came out imperfect, photographed/documented for the crew to
 * revisit. Always belongs to exactly one job (deleted along with it on a
 * PERMANENT delete - see JobRepository.delete - but untouched by simple
 * archiving, same as every other "archiving is always safe" rule in this
 * app).
 */
export type CorrectionStatus = "pending" | "fixed" | "not-applicable";

export interface Correction {
  id: string;
  jobId: string;
  status: CorrectionStatus;
  comment: string;
  /** When it was fixed, or marked not-applicable - null while pending. */
  resolvedDate: string | null; // "YYYY-MM-DD"
  createdAt: string;
  updatedAt: string;
}

export type NewCorrectionInput = Pick<Correction, "jobId"> & Partial<Pick<Correction, "comment" | "status" | "resolvedDate">>;

export const CORRECTION_STATUS_LABELS: Record<CorrectionStatus, string> = {
  pending: "გასასწორებელია",
  fixed: "გასწორებულია",
  "not-applicable": "არ ჩაითვალა"
};

/** One uploaded image or PDF attached to a Correction. A Correction can
 * have several of these (a small photo gallery, plus an optional PDF) -
 * stored as a separate table (one-to-many), same normalization pattern as
 * LoadingItem belonging to a LoadingList.
 *
 * The Blob itself is stored directly in IndexedDB (Dexie supports this
 * natively) - no external storage/service needed. Deliberately excluded
 * from the JSON Export/Import backup (binary data doesn't serialize
 * sensibly into JSON without a large Base64 blow-up) - see
 * features/backup/backupService.ts, which does not touch this table.
 */
export type CorrectionFileType = "image" | "pdf";

export interface CorrectionFile {
  id: string;
  correctionId: string;
  fileType: CorrectionFileType;
  fileName: string;
  blob: Blob;
  createdAt: string;
}

export type NewCorrectionFileInput = Pick<CorrectionFile, "correctionId" | "fileType" | "fileName" | "blob">;

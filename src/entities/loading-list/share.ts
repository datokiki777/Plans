import type { LoadingList } from "./types";

/** Same pattern as V1's shareLoading filename: title with spaces replaced
 * by underscores, falling back to a generic name, .png extension. */
export function buildLoadingShareFilename(list: Pick<LoadingList, "title">): string {
  const base = (list.title || "datvirtvis-sia").trim().replace(/\s+/g, "_");
  return `${base || "datvirtvis-sia"}.png`;
}

import type { LoadingList } from "./types";

/** Only a loading list with a date set ever shows up as a job-like card
 * on the Jobs page - undated lists stay exactly as before, visible only
 * on the Loading page itself. */
export function isDatedLoadingList(list: Pick<LoadingList, "loadingDate">): boolean {
  return list.loadingDate !== null;
}

/** Same active/archived semantics as a Job's status, applied to a loading
 * list's own archivedAt - "active" means not archived, "archived" means
 * archived, "all" means either. */
export function loadingListMatchesTab(list: Pick<LoadingList, "archivedAt">, tab: "all" | "active" | "archived"): boolean {
  if (tab === "active") return list.archivedAt === null;
  if (tab === "archived") return list.archivedAt !== null;
  return true;
}

/** No group filter selected ("ყველა ჯგუფი") matches every list, including
 * ones with no group of their own. */
export function loadingListMatchesGroup(list: Pick<LoadingList, "groupId">, groupId?: string): boolean {
  if (!groupId) return true;
  return list.groupId === groupId;
}

/** Same case-insensitive substring match already used for loading list
 * search elsewhere (LoadingRepository.searchLists). */
export function loadingListMatchesQuery(list: Pick<LoadingList, "title">, query?: string): boolean {
  const q = query?.trim().toLocaleLowerCase("ka");
  if (!q) return true;
  return list.title.toLocaleLowerCase("ka").includes(q);
}

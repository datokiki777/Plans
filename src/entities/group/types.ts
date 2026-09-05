/**
 * See DATA_MODEL.md §3.
 * Unlike V1, deleting a group archives it by default (does not cascade a
 * permanent delete of its jobs) - see OLD_APP_FEATURE_AUDIT.md risk note.
 * carNumber/worker1Name/worker2Name are optional (added in schema version
 * 5) - existing groups (named with a date range baked into the name, e.g.
 * "108. (19/08-02/09) გიო ელიბო") are left completely as-is; any group can
 * be given a car number + workers going forward, but nothing requires it.
 */
export interface Group {
  id: string;
  name: string;
  carNumber: number | null;
  worker1Name: string;
  worker2Name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type NewGroupInput = Pick<Group, "name"> & Partial<Pick<Group, "carNumber" | "worker1Name" | "worker2Name">>;

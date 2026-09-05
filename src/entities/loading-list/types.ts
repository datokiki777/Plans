/** See DATA_MODEL.md §5. */
export interface LoadingList {
  id: string;
  title: string;
  /** Optional - picking a group when creating the list (instead of typing
   * a free-text title) sets this, and the list's effective display name
   * becomes the group's own label. Added in schema version 6. */
  groupId: string | null;
  /** A single, fixed, always-last note field - separate from the
   * repeatable extras items (no quantity, just free text), meant for a
   * recurring important reminder that should stand out visually and be
   * fillable from a template. Added in schema version 4, see
   * db/database.ts. */
  specialNote: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type NewLoadingListInput = Pick<LoadingList, "title"> & Partial<Pick<LoadingList, "specialNote" | "groupId">>;

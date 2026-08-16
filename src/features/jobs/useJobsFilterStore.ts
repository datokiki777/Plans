import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Simplified to match the current Jobs page: "all" = active+archived
 * combined, plus the two real states that matter day to day. planned/
 * completed no longer have dedicated tabs on this page (still valid
 * per-Job statuses, settable from the Job detail screen). */
export type JobsListTab = "all" | "active" | "archived";

interface JobsFilterState {
  tab: JobsListTab;
  groupId: string;
  query: string;
  setTab: (tab: JobsListTab) => void;
  setGroupId: (groupId: string) => void;
  setQuery: (query: string) => void;
}

/** Persisted to localStorage so the selected group survives closing and
 * reopening the app entirely, not just navigating within the same session -
 * per explicit request. Only groupId is persisted; tab/query reset each
 * session (not asked to persist, and a stale search query silently
 * filtering results on next open would be more surprising than useful). */
export const useJobsFilterStore = create<JobsFilterState>()(
  persist(
    (set) => ({
      tab: "all",
      groupId: "",
      query: "",
      setTab: (tab) => set({ tab }),
      setGroupId: (groupId) => set({ groupId }),
      setQuery: (query) => set({ query })
    }),
    {
      name: "plans-jobs-filter",
      partialize: (state) => ({ groupId: state.groupId })
    }
  )
);

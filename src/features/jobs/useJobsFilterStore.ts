import { create } from "zustand";
import type { JobStatus } from "@/entities/job";

interface JobsFilterState {
  status: JobStatus | "";
  groupId: string;
  query: string;
  setStatus: (status: JobStatus | "") => void;
  setGroupId: (groupId: string) => void;
  setQuery: (query: string) => void;
}

/** Lives outside React, so it survives JobsPage unmounting/remounting
 * (e.g. navigating into a Job and back) within the same session - fixes
 * the selected group filter appearing to "reset itself" on navigation. */
export const useJobsFilterStore = create<JobsFilterState>((set) => ({
  status: "",
  groupId: "",
  query: "",
  setStatus: (status) => set({ status }),
  setGroupId: (groupId) => set({ groupId }),
  setQuery: (query) => set({ query })
}));

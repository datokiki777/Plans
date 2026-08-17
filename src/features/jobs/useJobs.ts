import { useCallback, useEffect, useState } from "react";
import { jobRepository as defaultJobRepository } from "@/db/repositories";
import type { JobRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import { compareByJobDateAsc } from "@/entities/job";
import type { JobsListTab } from "./useJobsFilterStore";

export interface JobsFilter {
  tab: JobsListTab;
  groupId?: string;
  query?: string;
}

/** The Jobs page always shows nearest-scheduled-date first (ascending),
 * regardless of tab - applied explicitly here rather than relying on
 * JobRepository.list()'s generic default sort (which stays createdAt-desc,
 * correct for other callers like Dashboard's "recently changed" list that
 * have nothing to do with jobDate). `repo` is injectable (defaults to the
 * app singleton) so this exact logic is directly testable against an
 * isolated database, same pattern used elsewhere in the app. */
export async function fetchJobsForTab(tab: JobsListTab, groupId?: string, repo: JobRepository = defaultJobRepository): Promise<Job[]> {
  if (tab === "active" || tab === "archived") {
    const result = await repo.list({ status: tab, groupId, limit: 100 });
    return result.sort(compareByJobDateAsc);
  }
  // "all" = active + archived combined, per the simplified Jobs page - not
  // literally every status (planned/completed jobs, if any, are not shown
  // here; they remain reachable/editable from the Job detail screen).
  // Active jobs are always shown before archived ones (each block sorted
  // independently, nearest-date-first) - not merged into one global sort,
  // which would interleave the two statuses together.
  const [active, archived] = await Promise.all([
    repo.list({ status: "active", groupId, limit: 100 }),
    repo.list({ status: "archived", groupId, limit: 100 })
  ]);
  return [...active.sort(compareByJobDateAsc), ...archived.sort(compareByJobDateAsc)];
}

export function useJobs(filter: JobsFilter) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const task = filter.query?.trim() ? defaultJobRepository.search(filter.query) : fetchJobsForTab(filter.tab, filter.groupId);
    task.then((result) => {
      if (!cancelled) {
        setJobs(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.tab, filter.groupId, filter.query, reloadToken]);

  return { jobs, loading, reload };
}

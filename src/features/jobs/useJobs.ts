import { useCallback, useEffect, useState } from "react";
import { jobRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import type { JobsListTab } from "./useJobsFilterStore";

export interface JobsFilter {
  tab: JobsListTab;
  groupId?: string;
  query?: string;
}

async function fetchByTab(tab: JobsListTab, groupId?: string): Promise<Job[]> {
  if (tab === "active" || tab === "archived") {
    return jobRepository.list({ status: tab, groupId, limit: 100 });
  }
  // "all" = active + archived combined, per the simplified Jobs page - not
  // literally every status (planned/completed jobs, if any, are not shown
  // here; they remain reachable/editable from the Job detail screen).
  // Active jobs are always shown before archived ones (each block already
  // sorted newest-jobDate-first by list() itself) - not merged into one
  // global date sort, which would interleave the two statuses together.
  const [active, archived] = await Promise.all([
    jobRepository.list({ status: "active", groupId, limit: 100 }),
    jobRepository.list({ status: "archived", groupId, limit: 100 })
  ]);
  return [...active, ...archived];
}

export function useJobs(filter: JobsFilter) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const task = filter.query?.trim() ? jobRepository.search(filter.query) : fetchByTab(filter.tab, filter.groupId);
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

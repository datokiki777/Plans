/** A group can only ever be permanently deleted if it has zero jobs
 * attached (active or archived). Archiving is always safe and available
 * regardless of job count - see DATA_MODEL.md §3 and the explicit
 * "never reproduce V1's destructive group deletion" requirement. */
export function canPermanentlyDeleteGroup(jobCount: number): boolean {
  return jobCount === 0;
}

/** The group label shown on a Job card - name alone for old-style groups,
 * or "name · worker1, worker2" when worker names are set, so a job card
 * identifies which crew it is without needing to open the group. */
export function formatGroupLabel(group: { name: string; worker1Name: string; worker2Name: string }): string {
  const workers = [group.worker1Name, group.worker2Name].filter(Boolean).join(", ");
  return workers ? `${group.name} · ${workers}` : group.name;
}

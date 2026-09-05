/** A group can only ever be permanently deleted if it has zero jobs
 * attached (active or archived). Archiving is always safe and available
 * regardless of job count - see DATA_MODEL.md §3 and the explicit
 * "never reproduce V1's destructive group deletion" requirement. */
export function canPermanentlyDeleteGroup(jobCount: number): boolean {
  return jobCount === 0;
}

/** The group label shown everywhere a Job references its group (Jobs page
 * rows, Dashboard rows, and the group filter dropdown itself) - plain
 * name alone for old-style groups, or "🚐 N · name · worker1, worker2"
 * once a car number and/or worker names are set, so it's identifiable at
 * a glance without opening the group. */
export function formatGroupLabel(group: { name: string; carNumber: number | null; worker1Name: string; worker2Name: string }): string {
  const workers = [group.worker1Name, group.worker2Name].filter(Boolean).join(", ");
  const carPrefix = group.carNumber !== null ? `🚐 ${group.carNumber} · ` : "";
  const workerSuffix = workers ? ` · ${workers}` : "";
  return `${carPrefix}${group.name}${workerSuffix}`;
}

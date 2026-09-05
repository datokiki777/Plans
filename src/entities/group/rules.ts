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
 * a glance without opening the group.
 *
 * `periodOverride` lets a Job's card show the car/workers as they were
 * for the specific period that job falls into (see
 * entities/group-period/domain.ts findPeriodForJob), instead of the
 * group's current values - so reassigning a car going forward doesn't
 * silently rewrite which car an already-recorded job used. Falls back to
 * the group's own fields when no matching period exists (or none is
 * passed at all, e.g. the group picker dropdown, which has no specific
 * job/date context). */
export function formatGroupLabel(
  group: { name: string; carNumber: number | null; worker1Name: string; worker2Name: string },
  periodOverride?: { carNumber: number | null; worker1Name: string; worker2Name: string } | null
): string {
  const source = periodOverride ?? group;
  const workers = [source.worker1Name, source.worker2Name].filter(Boolean).join(", ");
  const carPrefix = source.carNumber !== null ? `🚐 ${source.carNumber} · ` : "";
  const workerSuffix = workers ? ` · ${workers}` : "";
  return `${carPrefix}${group.name}${workerSuffix}`;
}

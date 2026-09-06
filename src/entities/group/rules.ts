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
 * silently rewrite which car an already-recorded job used.
 *
 * The override is merged per-field, not wholesale: a period whose own
 * carNumber/worker fields were never set (e.g. it predates this feature,
 * or the user simply hasn't filled them in for that period) falls back to
 * the group's own value for that specific field, rather than blanking out
 * info the group clearly has. Only a field the period explicitly set
 * takes precedence over the group's. */
export function formatGroupLabel(
  group: { name: string; carNumber: number | null; worker1Name: string; worker2Name: string },
  periodOverride?: { carNumber: number | null; worker1Name: string; worker2Name: string } | null
): string {
  const carNumber = periodOverride?.carNumber ?? group.carNumber;
  const worker1Name = periodOverride?.worker1Name || group.worker1Name;
  const worker2Name = periodOverride?.worker2Name || group.worker2Name;
  const workers = [worker1Name, worker2Name].filter(Boolean).join(", ");
  const carPrefix = carNumber !== null ? `🚐 ${carNumber} · ` : "";
  const workerSuffix = workers ? ` · ${workers}` : "";
  return `${carPrefix}${group.name}${workerSuffix}`;
}

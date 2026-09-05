/**
 * A planned work period for a group/car - "from this date to that date",
 * entered as a complete range up front (unlike Stay's entry/exit-later
 * model for workers, which fits a worker not knowing their exit date when
 * they arrive). A group's period is scheduled work, so both dates are
 * known at creation time.
 *
 * carNumber/worker1Name/worker2Name live HERE, not just on Group - a
 * group's assigned car/crew can change over time (e.g. car 1 breaks down,
 * they switch to car 3 for a while), and changing that going forward must
 * not silently rewrite which car an already-recorded period/job used.
 * Pre-filled from the group's current values when a new period is
 * created, then independent of the group afterward.
 */
export interface GroupPeriod {
  id: string;
  groupId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  carNumber: number | null;
  worker1Name: string;
  worker2Name: string;
  createdAt: string;
  updatedAt: string;
}

export type NewGroupPeriodInput = Pick<GroupPeriod, "groupId" | "startDate" | "endDate" | "carNumber" | "worker1Name" | "worker2Name">;

/**
 * A planned work period for a group/car - "from this date to that date",
 * entered as a complete range up front (unlike Stay's entry/exit-later
 * model for workers, which fits a worker not knowing their exit date when
 * they arrive). A group's period is scheduled work, so both dates are
 * known at creation time.
 */
export interface GroupPeriod {
  id: string;
  groupId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  createdAt: string;
  updatedAt: string;
}

export type NewGroupPeriodInput = Pick<GroupPeriod, "groupId" | "startDate" | "endDate">;

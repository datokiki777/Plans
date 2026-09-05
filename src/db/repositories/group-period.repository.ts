import type { AppDatabase } from "@/db/database";
import type { GroupPeriod, NewGroupPeriodInput } from "@/entities/group-period";
import { createId, nowIso } from "@/shared/lib/id";

export interface GroupPeriodUpdate {
  startDate: string;
  endDate: string;
  carNumber: number | null;
  worker1Name: string;
  worker2Name: string;
}

export interface GroupPeriodRepository {
  listByGroup(groupId: string): Promise<GroupPeriod[]>;
  /** All periods, across every group - used when rendering a list of Jobs
   * from multiple groups at once (e.g. Jobs page, Dashboard), where
   * fetching per-group individually would mean one query per distinct
   * group shown. Bounded and safe since there are only ever a handful of
   * groups (and their periods) in this app. */
  listAll(): Promise<GroupPeriod[]>;
  create(input: NewGroupPeriodInput): Promise<GroupPeriod>;
  update(id: string, patch: GroupPeriodUpdate): Promise<void>;
  delete(id: string): Promise<void>;
}

export class LocalGroupPeriodRepository implements GroupPeriodRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  async listByGroup(groupId: string): Promise<GroupPeriod[]> {
    const periods = await this.db.groupPeriods.where("groupId").equals(groupId).toArray();
    return periods.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async listAll(): Promise<GroupPeriod[]> {
    return this.db.groupPeriods.toArray();
  }

  async create(input: NewGroupPeriodInput): Promise<GroupPeriod> {
    const now = nowIso();
    const period: GroupPeriod = { id: createId(), ...input, createdAt: now, updatedAt: now };
    await this.db.groupPeriods.add(period);
    return period;
  }

  async update(id: string, patch: GroupPeriodUpdate): Promise<void> {
    await this.db.groupPeriods.update(id, { ...patch, updatedAt: nowIso() });
  }

  async delete(id: string): Promise<void> {
    await this.db.groupPeriods.delete(id);
  }
}

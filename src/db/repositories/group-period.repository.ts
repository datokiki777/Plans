import type { AppDatabase } from "@/db/database";
import type { GroupPeriod, NewGroupPeriodInput } from "@/entities/group-period";
import { createId, nowIso } from "@/shared/lib/id";

export interface GroupPeriodRepository {
  listByGroup(groupId: string): Promise<GroupPeriod[]>;
  create(input: NewGroupPeriodInput): Promise<GroupPeriod>;
  update(id: string, patch: { startDate: string; endDate: string }): Promise<void>;
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

  async create(input: NewGroupPeriodInput): Promise<GroupPeriod> {
    const now = nowIso();
    const period: GroupPeriod = { id: createId(), ...input, createdAt: now, updatedAt: now };
    await this.db.groupPeriods.add(period);
    return period;
  }

  async update(id: string, patch: { startDate: string; endDate: string }): Promise<void> {
    await this.db.groupPeriods.update(id, { ...patch, updatedAt: nowIso() });
  }

  async delete(id: string): Promise<void> {
    await this.db.groupPeriods.delete(id);
  }
}

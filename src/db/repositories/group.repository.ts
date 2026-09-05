import type { AppDatabase } from "@/db/database";
import type { Group, NewGroupInput } from "@/entities/group";
import { createId, nowIso } from "@/shared/lib/id";

export interface GroupRepository {
  getById(id: string): Promise<Group | undefined>;
  list(opts?: { includeArchived?: boolean }): Promise<Group[]>;
  create(input: NewGroupInput): Promise<Group>;
  rename(id: string, name: string): Promise<void>;
  /** Updates the optional car/worker fields - independent of rename, since
   * the rename dialog and the car/worker fields can be edited separately. */
  updateDetails(id: string, patch: { carNumber: number | null; worker1Name: string; worker2Name: string }): Promise<void>;
  /** Archives the group. Does NOT cascade to its jobs by default - this is
   * the deliberate V2 fix for a V1 risk (group delete permanently destroyed
   * its clients) - see DATA_MODEL.md §3 and OLD_APP_FEATURE_AUDIT.md.
   * No longer exposed in the UI (groups don't archive anymore - see
   * GroupsPage), kept only so existing archived groups from before that
   * change still display/restore correctly if ever needed. */
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export class LocalGroupRepository implements GroupRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  async getById(id: string): Promise<Group | undefined> {
    return this.db.groups.get(id);
  }

  async list(opts: { includeArchived?: boolean } = {}): Promise<Group[]> {
    const all = await this.db.groups.orderBy("name").toArray();
    return opts.includeArchived ? all : all.filter((g) => g.archivedAt === null);
  }

  async create(input: NewGroupInput): Promise<Group> {
    const now = nowIso();
    const group: Group = {
      carNumber: null,
      worker1Name: "",
      worker2Name: "",
      ...input,
      id: createId(),
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    };
    await this.db.groups.add(group);
    return group;
  }

  async rename(id: string, name: string): Promise<void> {
    await this.db.groups.update(id, { name, updatedAt: nowIso() });
  }

  async updateDetails(id: string, patch: { carNumber: number | null; worker1Name: string; worker2Name: string }): Promise<void> {
    await this.db.groups.update(id, { ...patch, updatedAt: nowIso() });
  }

  async archive(id: string): Promise<void> {
    await this.db.groups.update(id, { archivedAt: nowIso(), updatedAt: nowIso() });
  }

  async restore(id: string): Promise<void> {
    await this.db.groups.update(id, { archivedAt: null, updatedAt: nowIso() });
  }

  async delete(id: string): Promise<void> {
    await this.db.groups.delete(id);
  }
}

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AppDatabase } from "@/db/database";
import { LocalGroupPeriodRepository } from "@/db/repositories/group-period.repository";
import { LocalGroupRepository } from "@/db/repositories/group.repository";

describe("LocalGroupPeriodRepository", () => {
  let testDb: AppDatabase;
  let periods: LocalGroupPeriodRepository;
  let groups: LocalGroupRepository;

  beforeEach(() => {
    testDb = new AppDatabase(`test-${crypto.randomUUID()}`);
    periods = new LocalGroupPeriodRepository(testDb);
    groups = new LocalGroupRepository(testDb);
  });

  afterEach(async () => {
    testDb.close();
    await testDb.delete();
  });

  it("creates a period and lists it by group", async () => {
    const group = await groups.create({ name: "მანქანა 1" });
    const period = await periods.create({ groupId: group.id, startDate: "2026-09-01", endDate: "2026-09-05" });

    expect(period.id).toBeTruthy();
    const list = await periods.listByGroup(group.id);
    expect(list.map((p) => p.id)).toEqual([period.id]);
  });

  it("lists a group's periods sorted by startDate descending (newest first)", async () => {
    const group = await groups.create({ name: "მანქანა 1" });
    const older = await periods.create({ groupId: group.id, startDate: "2026-08-01", endDate: "2026-08-05" });
    const newer = await periods.create({ groupId: group.id, startDate: "2026-09-10", endDate: "2026-09-15" });

    const list = await periods.listByGroup(group.id);
    expect(list.map((p) => p.id)).toEqual([newer.id, older.id]);
  });

  it("only returns periods for the requested group, not other groups'", async () => {
    const groupA = await groups.create({ name: "მანქანა 1" });
    const groupB = await groups.create({ name: "მანქანა 2" });
    await periods.create({ groupId: groupA.id, startDate: "2026-09-01", endDate: "2026-09-05" });
    const periodB = await periods.create({ groupId: groupB.id, startDate: "2026-09-01", endDate: "2026-09-05" });

    const listB = await periods.listByGroup(groupB.id);
    expect(listB.map((p) => p.id)).toEqual([periodB.id]);
  });

  it("updates a period's dates", async () => {
    const group = await groups.create({ name: "მანქანა 1" });
    const period = await periods.create({ groupId: group.id, startDate: "2026-09-01", endDate: "2026-09-05" });

    await periods.update(period.id, { startDate: "2026-09-02", endDate: "2026-09-06" });

    const [updated] = await periods.listByGroup(group.id);
    expect(updated).toBeDefined();
    expect(updated?.startDate).toBe("2026-09-02");
    expect(updated?.endDate).toBe("2026-09-06");
  });

  it("deletes a period", async () => {
    const group = await groups.create({ name: "მანქანა 1" });
    const period = await periods.create({ groupId: group.id, startDate: "2026-09-01", endDate: "2026-09-05" });

    await periods.delete(period.id);
    expect(await periods.listByGroup(group.id)).toHaveLength(0);
  });
});

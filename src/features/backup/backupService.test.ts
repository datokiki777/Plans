import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AppDatabase } from "@/db/database";
import { buildBackup, parseBackup, restoreBackup } from "./backupService";
import { V2_BACKUP_FORMAT, type V2Backup } from "./schema";

describe("backupService", () => {
  let testDb: AppDatabase;

  beforeEach(() => {
    testDb = new AppDatabase(`test-backup-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    testDb.close();
    await testDb.delete();
  });

  it("buildBackup captures every table's current rows with the correct format/version", async () => {
    await testDb.groups.add({
      id: "g1",
      name: "ჯგუფი",
      carNumber: null,
      worker1Name: "",
      worker2Name: "",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      archivedAt: null
    });
    const backup = await buildBackup(testDb);
    expect(backup.format).toBe(V2_BACKUP_FORMAT);
    expect(backup.data.groups).toHaveLength(1);
    expect(backup.data.jobs).toHaveLength(0);
  });

  it("buildBackup captures groupPeriods, including their car/worker fields - the exact reported gap", async () => {
    await testDb.groups.add({
      id: "g1",
      name: "108",
      carNumber: 1,
      worker1Name: "გიო",
      worker2Name: "ელიბო",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      archivedAt: null
    });
    await testDb.groupPeriods.add({
      id: "p1",
      groupId: "g1",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      carNumber: 1,
      worker1Name: "გიო",
      worker2Name: "ელიბო",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01"
    });

    const backup = await buildBackup(testDb);
    expect(backup.data.groupPeriods).toHaveLength(1);
    expect(backup.data.groupPeriods[0]).toMatchObject({ id: "p1", groupId: "g1", carNumber: 1, worker1Name: "გიო" });
  });

  it("parseBackup rejects invalid JSON and wrong format", () => {
    expect(parseBackup("{bad").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ format: "wrong" })).ok).toBe(false);
  });

  it("parseBackup accepts an older backup with no groupPeriods field at all, defaulting it to an empty array", () => {
    const legacyBackupJson = JSON.stringify({
      format: V2_BACKUP_FORMAT,
      schemaVersion: 1,
      backupId: "b1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: {
        clients: [],
        jobs: [],
        groups: [],
        // groupPeriods intentionally omitted - the real pre-fix export shape
        fieldTemplates: [],
        loadingLists: [],
        loadingItems: [],
        workers: [],
        stays: []
      }
    });
    const result = parseBackup(legacyBackupJson);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.data.groupPeriods).toEqual([]);
  });

  it("restoreBackup REPLACES existing data (clears tables first)", async () => {
    await testDb.groups.add({
      id: "old-group",
      name: "ძველი",
      carNumber: null,
      worker1Name: "",
      worker2Name: "",
      createdAt: "2020-01-01",
      updatedAt: "2020-01-01",
      archivedAt: null
    });

    const backup: V2Backup = {
      format: V2_BACKUP_FORMAT,
      schemaVersion: 1,
      backupId: "b1",
      exportedAt: "2026-08-15T00:00:00.000Z",
      data: {
        clients: [],
        jobs: [],
        groups: [
          { id: "new-group", name: "ახალი", carNumber: null, worker1Name: "", worker2Name: "", createdAt: "2026-01-01", updatedAt: "2026-01-01", archivedAt: null }
        ],
        groupPeriods: [],
        fieldTemplates: [],
        loadingLists: [],
        loadingItems: [],
        workers: [],
        stays: []
      }
    };

    await restoreBackup(backup, testDb);

    const groups = await testDb.groups.toArray();
    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe("new-group");
    expect(await testDb.groups.get("old-group")).toBeUndefined();
  });

  it("restoreBackup restores groupPeriods too, including car/worker fields - proves the round-trip actually works end to end", async () => {
    await testDb.groupPeriods.add({
      id: "old-period",
      groupId: "old-group",
      startDate: "2020-01-01",
      endDate: "2020-01-05",
      carNumber: null,
      worker1Name: "",
      worker2Name: "",
      createdAt: "2020-01-01",
      updatedAt: "2020-01-01"
    });

    const backup: V2Backup = {
      format: V2_BACKUP_FORMAT,
      schemaVersion: 1,
      backupId: "b1",
      exportedAt: "2026-08-15T00:00:00.000Z",
      data: {
        clients: [],
        jobs: [],
        groups: [],
        groupPeriods: [
          {
            id: "restored-period",
            groupId: "g1",
            startDate: "2026-09-01",
            endDate: "2026-09-05",
            carNumber: 3,
            worker1Name: "ლუკა",
            worker2Name: "ნიკა",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01"
          }
        ],
        fieldTemplates: [],
        loadingLists: [],
        loadingItems: [],
        workers: [],
        stays: []
      }
    };

    await restoreBackup(backup, testDb);

    const periods = await testDb.groupPeriods.toArray();
    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({ id: "restored-period", carNumber: 3, worker1Name: "ლუკა", worker2Name: "ნიკა" });
    expect(await testDb.groupPeriods.get("old-period")).toBeUndefined(); // old data was cleared, not merged
  });

  it("restoring a legacy backup with no groupPeriods field clears any existing periods (matches 'REPLACES existing data') rather than leaving them untouched", async () => {
    await testDb.groupPeriods.add({
      id: "existing-period",
      groupId: "g1",
      startDate: "2026-01-01",
      endDate: "2026-01-05",
      carNumber: null,
      worker1Name: "",
      worker2Name: "",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01"
    });

    const legacyBackupJson = JSON.stringify({
      format: V2_BACKUP_FORMAT,
      schemaVersion: 1,
      backupId: "b1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: { clients: [], jobs: [], groups: [], fieldTemplates: [], loadingLists: [], loadingItems: [], workers: [], stays: [] }
    });
    const parsed = parseBackup(legacyBackupJson);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await restoreBackup(parsed.data, testDb);
    expect(await testDb.groupPeriods.count()).toBe(0);
  });

  it("LoadingList.groupId (a plain new field, not a missing table) round-trips through backup/restore correctly", async () => {
    const backup: V2Backup = {
      format: V2_BACKUP_FORMAT,
      schemaVersion: 1,
      backupId: "b1",
      exportedAt: "2026-08-15T00:00:00.000Z",
      data: {
        clients: [],
        jobs: [],
        groups: [],
        groupPeriods: [],
        fieldTemplates: [],
        loadingLists: [
          { id: "list-1", title: "108", groupId: "g1", loadingDate: null, specialNote: "", createdAt: "2026-01-01", updatedAt: "2026-01-01", archivedAt: null }
        ],
        loadingItems: [],
        workers: [],
        stays: []
      }
    };

    await restoreBackup(backup, testDb);
    const restored = await testDb.loadingLists.get("list-1");
    expect(restored?.groupId).toBe("g1");
  });

  it("a failed restore rolls back completely - original data survives", async () => {
    await testDb.groups.add({
      id: "keep-me",
      name: "შენარჩუნებული",
      carNumber: null,
      worker1Name: "",
      worker2Name: "",
      createdAt: "2020-01-01",
      updatedAt: "2020-01-01",
      archivedAt: null
    });

    const backup: V2Backup = {
      format: V2_BACKUP_FORMAT,
      schemaVersion: 1,
      backupId: "b1",
      exportedAt: "2026-08-15T00:00:00.000Z",
      data: {
        clients: [],
        jobs: [],
        groups: [{ id: "g1", name: "ვალიდური" }, { id: "g1", name: "დუბლიკატი id" }] as never,
        groupPeriods: [],
        fieldTemplates: [],
        loadingLists: [],
        loadingItems: [],
        workers: [],
        stays: []
      }
    };

    await expect(restoreBackup(backup, testDb)).rejects.toBeDefined();

    expect(await testDb.groups.get("keep-me")).toBeDefined();
    expect(await testDb.groups.count()).toBe(1);
  });
});

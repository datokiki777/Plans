import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AppDatabase } from "@/db/database";
import { LocalJobRepository } from "@/db/repositories/job.repository";
import { LocalClientRepository } from "@/db/repositories/client.repository";

describe('Jobs "all" tab semantics', () => {
  let testDb: AppDatabase;
  let jobs: LocalJobRepository;
  let clients: LocalClientRepository;

  beforeEach(() => {
    testDb = new AppDatabase(`test-${crypto.randomUUID()}`);
    jobs = new LocalJobRepository(testDb);
    clients = new LocalClientRepository(testDb);
  });

  afterEach(async () => {
    testDb.close();
    await testDb.delete();
  });

  it('"all" (active+archived combined) excludes planned/completed jobs', async () => {
    const client = await clients.create({ fullName: "x", address: "", phone: "", googleMapsLink: "", notes: "" });
    const base = {
      clientId: client.id,
      groupId: null,
      seller: "",
      jobDate: null,
      jobDurationDays: null,
      packageType: "",
      antiSlip: "",
      showerTraySize: "",
      glassPartitionSize: [],
      hingedDoorSize: "",
      panelColor: "",
      floorPanelColor: "",
      panelHeight: "",
      installables: [],
      extraWork: [],
      workNotes: [],
      clientSnapshot: { fullName: "x", address: "", phone: "" }
    };
    const active = await jobs.create({ ...base, status: "active" });
    const archived = await jobs.create({ ...base, status: "archived" });
    await jobs.create({ ...base, status: "planned" });
    await jobs.create({ ...base, status: "completed" });

    const [activeList, archivedList] = await Promise.all([jobs.list({ status: "active" }), jobs.list({ status: "archived" })]);
    const combined = [...activeList, ...archivedList];

    expect(combined.map((j) => j.id).sort()).toEqual([active.id, archived.id].sort());
  });
});

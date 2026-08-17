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

  it('"all" keeps every active job before every archived job, even when an archived job has a NEWER date than an active one', async () => {
    const client = await clients.create({ fullName: "x", address: "", phone: "", googleMapsLink: "", notes: "" });
    const base = {
      clientId: client.id,
      groupId: null,
      seller: "",
      jobDurationDays: null,
      packageType: "",
      antiSlip: "",
      showerTraySize: "",
      glassPartitionSize: [] as string[],
      hingedDoorSize: "",
      panelColor: "",
      floorPanelColor: "",
      panelHeight: "",
      installables: [] as string[],
      extraWork: [] as string[],
      workNotes: [] as string[],
      clientSnapshot: { fullName: "x", address: "", phone: "" }
    };
    const activeOld = await jobs.create({ ...base, status: "active", jobDate: "2026-01-01" });
    const archivedNew = await jobs.create({ ...base, status: "archived", jobDate: "2026-08-15" });

    // Mirrors useJobs.ts's fetchByTab: concatenate, do NOT re-sort globally.
    const [activeList, archivedList] = await Promise.all([jobs.list({ status: "active" }), jobs.list({ status: "archived" })]);
    const combined = [...activeList, ...archivedList];

    expect(combined.map((j) => j.id)).toEqual([activeOld.id, archivedNew.id]);
  });
});

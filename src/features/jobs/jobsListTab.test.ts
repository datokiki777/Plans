import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AppDatabase } from "@/db/database";
import { LocalJobRepository } from "@/db/repositories/job.repository";
import { LocalClientRepository } from "@/db/repositories/client.repository";
import { fetchJobsForTab } from "./useJobs";

describe("fetchJobsForTab (Jobs page data fetching)", () => {
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

  function base(overrides: Record<string, unknown> = {}) {
    return {
      clientId: "c1",
      groupId: null,
      seller: "",
      jobDate: null,
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
      clientSnapshot: { fullName: "x", address: "", phone: "" },
      ...overrides
    };
  }

  it('"active" tab sorts by jobDate ascending - nearest date first', async () => {
    const client = await clients.create({ fullName: "x", address: "", phone: "", googleMapsLink: "", notes: "" });
    const later = await jobs.create({ ...base({ clientId: client.id }), status: "active", jobDate: "2026-08-15" });
    const nearer = await jobs.create({ ...base({ clientId: client.id }), status: "active", jobDate: "2026-01-01" });

    const result = await fetchJobsForTab("active", undefined, jobs);
    expect(result.map((j) => j.id)).toEqual([nearer.id, later.id]);
  });

  it('"all" (active+archived combined) excludes planned/completed jobs', async () => {
    const client = await clients.create({ fullName: "x", address: "", phone: "", googleMapsLink: "", notes: "" });
    const active = await jobs.create({ ...base({ clientId: client.id }), status: "active" });
    const archived = await jobs.create({ ...base({ clientId: client.id }), status: "archived" });
    await jobs.create({ ...base({ clientId: client.id }), status: "planned" });
    await jobs.create({ ...base({ clientId: client.id }), status: "completed" });

    const result = await fetchJobsForTab("all", undefined, jobs);
    expect(result.map((j) => j.id).sort()).toEqual([active.id, archived.id].sort());
  });

  it('"all" keeps every active job before every archived job, even when an archived job has a NEARER date than an active one', async () => {
    const client = await clients.create({ fullName: "x", address: "", phone: "", googleMapsLink: "", notes: "" });
    const activeLater = await jobs.create({ ...base({ clientId: client.id }), status: "active", jobDate: "2026-08-15" });
    const archivedNearer = await jobs.create({ ...base({ clientId: client.id }), status: "archived", jobDate: "2026-01-01" });

    const result = await fetchJobsForTab("all", undefined, jobs);
    expect(result.map((j) => j.id)).toEqual([activeLater.id, archivedNearer.id]);
  });

  it('"all" sorts each status block independently by nearest-date-first', async () => {
    const client = await clients.create({ fullName: "x", address: "", phone: "", googleMapsLink: "", notes: "" });
    const activeFar = await jobs.create({ ...base({ clientId: client.id }), status: "active", jobDate: "2026-08-15" });
    const activeNear = await jobs.create({ ...base({ clientId: client.id }), status: "active", jobDate: "2026-01-01" });
    const archivedFar = await jobs.create({ ...base({ clientId: client.id }), status: "archived", jobDate: "2026-12-01" });
    const archivedNear = await jobs.create({ ...base({ clientId: client.id }), status: "archived", jobDate: "2026-03-01" });

    const result = await fetchJobsForTab("all", undefined, jobs);
    expect(result.map((j) => j.id)).toEqual([activeNear.id, activeFar.id, archivedNear.id, archivedFar.id]);
  });
});

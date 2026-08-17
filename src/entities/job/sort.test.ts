import { describe, expect, it } from "vitest";
import { compareByJobDateDesc } from "./sort";
import type { Job } from "./types";

function job(overrides: Partial<Job>): Job {
  return {
    id: "j1",
    clientId: "c1",
    groupId: null,
    status: "active",
    statusBeforeArchive: null,
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
    clientSnapshot: { fullName: "", address: "", phone: "" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    ...overrides
  };
}

describe("compareByJobDateDesc", () => {
  it("sorts by jobDate, newest first", () => {
    const older = job({ id: "a", jobDate: "2026-01-01" });
    const newer = job({ id: "b", jobDate: "2026-08-15" });
    expect([older, newer].sort(compareByJobDateDesc).map((j) => j.id)).toEqual(["b", "a"]);
  });

  it("puts jobs WITH a date before jobs with no date, regardless of createdAt", () => {
    const dated = job({ id: "a", jobDate: "2020-01-01", createdAt: "2020-01-01T00:00:00.000Z" });
    const undated = job({ id: "b", jobDate: null, createdAt: "2026-08-15T00:00:00.000Z" });
    expect([undated, dated].sort(compareByJobDateDesc).map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("falls back to createdAt (newest first) when neither job has a date", () => {
    const older = job({ id: "a", jobDate: null, createdAt: "2026-01-01T00:00:00.000Z" });
    const newer = job({ id: "b", jobDate: null, createdAt: "2026-08-15T00:00:00.000Z" });
    expect([older, newer].sort(compareByJobDateDesc).map((j) => j.id)).toEqual(["b", "a"]);
  });
});

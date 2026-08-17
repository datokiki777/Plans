import { describe, expect, it } from "vitest";
import { jobFormToPersistedFields, jobToFormValues, JOB_FORM_DEFAULTS } from "./schema";

describe("job form transforms", () => {
  it("splits multiline textarea text into a trimmed, non-empty string array", () => {
    const fields = jobFormToPersistedFields({
      ...JOB_FORM_DEFAULTS,
      fullName: "გიორგი",
      groupId: "g1",
      installablesText: "Mischbatterie\n  Brauseset  \n\nRegendusche\n"
    });
    expect(fields.installables).toEqual(["Mischbatterie", "Brauseset", "Regendusche"]);
  });

  it('empty textarea produces an empty array, not [""]', () => {
    const fields = jobFormToPersistedFields({ ...JOB_FORM_DEFAULTS, fullName: "გიორგი", groupId: "g1" });
    expect(fields.installables).toEqual([]);
    expect(fields.extraWork).toEqual([]);
    expect(fields.workNotes).toEqual([]);
    expect(fields.glassPartitionSize).toEqual([]);
  });

  it("empty jobDate/jobDurationDays become null, not empty string/NaN", () => {
    const fields = jobFormToPersistedFields({ ...JOB_FORM_DEFAULTS, fullName: "გიორგი", groupId: "g1" });
    expect(fields.jobDate).toBeNull();
    expect(fields.jobDurationDays).toBeNull();
  });

  it("jobDurationDays parses to a number", () => {
    const fields = jobFormToPersistedFields({ ...JOB_FORM_DEFAULTS, fullName: "გიორგი", groupId: "g1", jobDurationDays: "3" });
    expect(fields.jobDurationDays).toBe(3);
  });

  it("name/address/phone map directly into clientSnapshot - no separate client step", () => {
    const fields = jobFormToPersistedFields({
      ...JOB_FORM_DEFAULTS,
      fullName: "გიორგი მაისურაძე",
      address: "თბილისი",
      phone: "555111222",
      groupId: "g1"
    });
    expect(fields.clientSnapshot).toEqual({ fullName: "გიორგი მაისურაძე", address: "თბილისი", phone: "555111222" });
  });

  it("jobToFormValues -> jobFormToPersistedFields round-trips array fields and clientSnapshot correctly", () => {
    const original = {
      clientSnapshot: { fullName: "გიორგი მაისურაძე", address: "თბილისი", phone: "555111222" },
      seller: "ნინო",
      groupId: "g1",
      jobDate: "2026-08-15",
      jobDurationDays: 2,
      packageType: "S",
      antiSlip: "დიახ",
      showerTraySize: "90x90",
      glassPartitionSize: ["შუშა 100 სმ.", "შუშა 90 სმ."],
      hingedDoorSize: "PK1-90",
      panelColor: "AMPARA",
      floorPanelColor: "",
      panelHeight: "",
      installables: ["Mischbatterie", "Brauseset"],
      extraWork: ["სახეხი 80 სმ."],
      workNotes: []
    };
    const formValues = jobToFormValues(original);
    const roundTripped = jobFormToPersistedFields({ ...formValues, googleMapsLink: "" });
    expect(roundTripped.clientSnapshot).toEqual(original.clientSnapshot);
    expect(roundTripped).toMatchObject({
      seller: original.seller,
      groupId: original.groupId,
      jobDate: original.jobDate,
      jobDurationDays: original.jobDurationDays,
      glassPartitionSize: original.glassPartitionSize,
      installables: original.installables,
      extraWork: original.extraWork,
      workNotes: original.workNotes
    });
  });
});

import { describe, expect, it } from "vitest";
import { hasShareValue, formatJobShareSchedule, buildJobShareFilename, buildJobShareText } from "./share";

describe("hasShareValue", () => {
  it("treats empty/whitespace strings as absent", () => {
    expect(hasShareValue("")).toBe(false);
    expect(hasShareValue("   ")).toBe(false);
    expect(hasShareValue(null)).toBe(false);
    expect(hasShareValue(undefined)).toBe(false);
  });
  it("treats a non-empty string as present", () => {
    expect(hasShareValue("S")).toBe(true);
  });
  it("treats an all-empty array as absent, one non-empty entry as present", () => {
    expect(hasShareValue([])).toBe(false);
    expect(hasShareValue(["", "  "])).toBe(false);
    expect(hasShareValue(["", "x"])).toBe(true);
  });
});

describe("formatJobShareSchedule", () => {
  it("combines date and duration when both present", () => {
    const result = formatJobShareSchedule({ jobDate: "2026-08-15", jobDurationDays: 3 });
    expect(result).toContain("·");
    expect(result).toContain("3 დღიანი");
  });
  it("falls back to just the date when duration is missing", () => {
    const result = formatJobShareSchedule({ jobDate: "2026-08-15", jobDurationDays: null });
    expect(result).not.toContain("·");
    expect(result.length).toBeGreaterThan(0);
  });
  it("falls back to just the duration when date is missing", () => {
    expect(formatJobShareSchedule({ jobDate: null, jobDurationDays: 2 })).toBe("2 დღიანი");
  });
  it("is empty when neither is present", () => {
    expect(formatJobShareSchedule({ jobDate: null, jobDurationDays: null })).toBe("");
  });
});

describe("buildJobShareFilename", () => {
  it("replaces whitespace in the client name and appends .png", () => {
    expect(buildJobShareFilename({ clientSnapshot: { fullName: "გიორგი მაისურაძე", address: "", phone: "" } })).toBe(
      "გიორგი_მაისურაძე.png"
    );
  });
  it("falls back to a generic name when the client has no name", () => {
    expect(buildJobShareFilename({ clientSnapshot: { fullName: "", address: "", phone: "" } })).toBe("client.png");
  });
});

describe("buildJobShareText", () => {
  it("normalizes a present Maps link", () => {
    const text = buildJobShareText("https://maps.google.com/?q=Tbilisi");
    expect(text).toContain("https://");
  });
  it("is empty when there is no Maps link", () => {
    expect(buildJobShareText(undefined)).toBe("");
    expect(buildJobShareText(null)).toBe("");
    expect(buildJobShareText("")).toBe("");
  });
});

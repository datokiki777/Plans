import { describe, expect, it } from "vitest";
import { isOnSection } from "./navigation";

describe("isOnSection", () => {
  it("matches an exact path", () => {
    expect(isOnSection("/groups", "/groups")).toBe(true);
  });

  it("matches a sub-path (deep link)", () => {
    expect(isOnSection("/settings/backup", "/settings")).toBe(true);
  });

  it("does not match a different section", () => {
    expect(isOnSection("/jobs", "/groups")).toBe(false);
  });

  it("does not match a section whose name merely starts the same way (no separator)", () => {
    expect(isOnSection("/groupsomething", "/groups")).toBe(false);
  });
});

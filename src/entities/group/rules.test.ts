import { describe, expect, it } from "vitest";
import { canPermanentlyDeleteGroup, formatGroupLabel } from "./rules";

describe("canPermanentlyDeleteGroup", () => {
  it("allows permanent delete only when the group has zero jobs", () => {
    expect(canPermanentlyDeleteGroup(0)).toBe(true);
  });

  it("blocks permanent delete when the group has any jobs", () => {
    expect(canPermanentlyDeleteGroup(1)).toBe(false);
    expect(canPermanentlyDeleteGroup(42)).toBe(false);
  });
});

describe("formatGroupLabel", () => {
  it("returns just the name when no worker names are set (old-style groups)", () => {
    expect(formatGroupLabel({ name: "108. (19/08-02/09) გიო ელიბო", worker1Name: "", worker2Name: "" })).toBe(
      "108. (19/08-02/09) გიო ელიბო"
    );
  });

  it("appends both worker names when both are set", () => {
    expect(formatGroupLabel({ name: "მანქანა 1", worker1Name: "გიორგი", worker2Name: "დავითი" })).toBe("მანქანა 1 · გიორგი, დავითი");
  });

  it("appends just one worker name when only one is set", () => {
    expect(formatGroupLabel({ name: "მანქანა 1", worker1Name: "გიორგი", worker2Name: "" })).toBe("მანქანა 1 · გიორგი");
    expect(formatGroupLabel({ name: "მანქანა 1", worker1Name: "", worker2Name: "დავითი" })).toBe("მანქანა 1 · დავითი");
  });
});

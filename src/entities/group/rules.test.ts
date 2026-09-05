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
  it("returns just the name when nothing else is set (old-style groups)", () => {
    expect(formatGroupLabel({ name: "108. (19/08-02/09) გიო ელიბო", carNumber: null, worker1Name: "", worker2Name: "" })).toBe(
      "108. (19/08-02/09) გიო ელიბო"
    );
  });

  it("appends both worker names when both are set", () => {
    expect(formatGroupLabel({ name: "მანქანა 1", carNumber: null, worker1Name: "გიორგი", worker2Name: "დავითი" })).toBe(
      "მანქანა 1 · გიორგი, დავითი"
    );
  });

  it("appends just one worker name when only one is set", () => {
    expect(formatGroupLabel({ name: "მანქანა 1", carNumber: null, worker1Name: "გიორგი", worker2Name: "" })).toBe("მანქანა 1 · გიორგი");
    expect(formatGroupLabel({ name: "მანქანა 1", carNumber: null, worker1Name: "", worker2Name: "დავითი" })).toBe("მანქანა 1 · დავითი");
  });

  it("prepends the car icon and number when a car number is set", () => {
    expect(formatGroupLabel({ name: "108", carNumber: 1, worker1Name: "", worker2Name: "" })).toBe("🚐 1 · 108");
  });

  it("combines car number, name, and both worker names together", () => {
    expect(formatGroupLabel({ name: "108", carNumber: 1, worker1Name: "გიორგი", worker2Name: "დავითი" })).toBe(
      "🚐 1 · 108 · გიორგი, დავითი"
    );
  });
});

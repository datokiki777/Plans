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

  it("uses the period override's car/workers instead of the group's current ones when given", () => {
    const group = { name: "108", carNumber: 3, worker1Name: "ახალი1", worker2Name: "ახალი2" }; // car reassigned since
    const periodOverride = { carNumber: 1, worker1Name: "ძველი1", worker2Name: "ძველი2" }; // what it was back then
    expect(formatGroupLabel(group, periodOverride)).toBe("🚐 1 · 108 · ძველი1, ძველი2");
  });

  it("falls back to the group's own fields when no period override is given", () => {
    const group = { name: "108", carNumber: 3, worker1Name: "გიო", worker2Name: "დათო" };
    expect(formatGroupLabel(group)).toBe("🚐 3 · 108 · გიო, დათო");
    expect(formatGroupLabel(group, null)).toBe("🚐 3 · 108 · გიო, დათო");
  });

  it("the group's own name is always used, even with a period override (periods don't have names)", () => {
    const group = { name: "108", carNumber: null, worker1Name: "", worker2Name: "" };
    const periodOverride = { carNumber: 2, worker1Name: "გიო", worker2Name: "" };
    expect(formatGroupLabel(group, periodOverride)).toBe("🚐 2 · 108 · გიო");
  });
});

import { describe, expect, it } from "vitest";
import { isDatedLoadingList, loadingListMatchesTab, loadingListMatchesGroup, loadingListMatchesQuery } from "./domain";

describe("isDatedLoadingList", () => {
  it("is true only when loadingDate is set", () => {
    expect(isDatedLoadingList({ loadingDate: "2026-09-05" })).toBe(true);
    expect(isDatedLoadingList({ loadingDate: null })).toBe(false);
  });
});

describe("loadingListMatchesTab", () => {
  it("'active' matches only non-archived lists", () => {
    expect(loadingListMatchesTab({ archivedAt: null }, "active")).toBe(true);
    expect(loadingListMatchesTab({ archivedAt: "2026-01-01" }, "active")).toBe(false);
  });

  it("'archived' matches only archived lists", () => {
    expect(loadingListMatchesTab({ archivedAt: "2026-01-01" }, "archived")).toBe(true);
    expect(loadingListMatchesTab({ archivedAt: null }, "archived")).toBe(false);
  });

  it("'all' matches either", () => {
    expect(loadingListMatchesTab({ archivedAt: null }, "all")).toBe(true);
    expect(loadingListMatchesTab({ archivedAt: "2026-01-01" }, "all")).toBe(true);
  });
});

describe("loadingListMatchesGroup", () => {
  it("matches everything when no group filter is set", () => {
    expect(loadingListMatchesGroup({ groupId: "g1" }, undefined)).toBe(true);
    expect(loadingListMatchesGroup({ groupId: null }, undefined)).toBe(true);
  });

  it("matches only the exact group when a filter is set", () => {
    expect(loadingListMatchesGroup({ groupId: "g1" }, "g1")).toBe(true);
    expect(loadingListMatchesGroup({ groupId: "g2" }, "g1")).toBe(false);
    expect(loadingListMatchesGroup({ groupId: null }, "g1")).toBe(false);
  });
});

describe("loadingListMatchesQuery", () => {
  it("matches everything when the query is empty", () => {
    expect(loadingListMatchesQuery({ title: "108" }, "")).toBe(true);
    expect(loadingListMatchesQuery({ title: "108" }, undefined)).toBe(true);
  });

  it("matches a case-insensitive substring of the title", () => {
    expect(loadingListMatchesQuery({ title: "108 გიო ელიბო" }, "გიო")).toBe(true);
    expect(loadingListMatchesQuery({ title: "108 გიო ელიბო" }, "999")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { findMatchingClient } from "./match";
import type { Client } from "./types";

function client(overrides: Partial<Client>): Client {
  return {
    id: "c1",
    fullName: "",
    address: "",
    phone: "",
    googleMapsLink: "",
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    ...overrides
  };
}

describe("findMatchingClient", () => {
  it("matches on normalized name + identical phone", () => {
    const existing = [client({ id: "c1", fullName: "გიორგი მაისურაძე", phone: "555111222" })];
    const match = findMatchingClient(existing, { fullName: "  გიორგი   მაისურაძე ", phone: "555111222", address: "" });
    expect(match?.id).toBe("c1");
  });

  it("does NOT match when phone differs, even with identical names", () => {
    const existing = [client({ id: "c1", fullName: "გიორგი მაისურაძე", phone: "111" })];
    const match = findMatchingClient(existing, { fullName: "გიორგი მაისურაძე", phone: "999", address: "" });
    expect(match).toBeUndefined();
  });

  it("falls back to address when neither record has a phone", () => {
    const existing = [client({ id: "c1", fullName: "გიორგი", phone: "", address: "თბილისი" })];
    const match = findMatchingClient(existing, { fullName: "გიორგი", phone: "", address: "თბილისი" });
    expect(match?.id).toBe("c1");
  });

  it("never matches when there's no name, or no phone/address to compare", () => {
    const existing = [client({ id: "c1", fullName: "გიორგი", phone: "", address: "" })];
    expect(findMatchingClient(existing, { fullName: "", phone: "", address: "" })).toBeUndefined();
    expect(findMatchingClient(existing, { fullName: "გიორგი", phone: "", address: "" })).toBeUndefined();
  });
});

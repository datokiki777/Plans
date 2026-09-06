import { describe, expect, it, beforeEach } from "vitest";
import { getDefaultLoadingMapsLink, setDefaultLoadingMapsLink } from "./loadingMapsLinkDefault";

describe("loadingMapsLinkDefault", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty string when nothing has been saved yet", () => {
    expect(getDefaultLoadingMapsLink()).toBe("");
  });

  it("remembers whatever was set, until changed again", () => {
    setDefaultLoadingMapsLink("https://maps.google.com/?q=warehouse");
    expect(getDefaultLoadingMapsLink()).toBe("https://maps.google.com/?q=warehouse");

    setDefaultLoadingMapsLink("https://maps.google.com/?q=new-warehouse");
    expect(getDefaultLoadingMapsLink()).toBe("https://maps.google.com/?q=new-warehouse");
  });

  it("clears the default when set to an empty string", () => {
    setDefaultLoadingMapsLink("https://maps.google.com/?q=warehouse");
    setDefaultLoadingMapsLink("");
    expect(getDefaultLoadingMapsLink()).toBe("");
  });
});

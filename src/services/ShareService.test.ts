import { describe, expect, it, vi, afterEach } from "vitest";
import { shareImage, preloadShareDependencies } from "./ShareService";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) }
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: vi.fn() },
  Directory: { Cache: "CACHE" }
}));
vi.mock("@capacitor/share", () => ({
  Share: { share: vi.fn() }
}));

function makeBlob(): Blob {
  return new Blob(["fake-png-bytes"], { type: "image/png" });
}

describe("shareImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as { share?: unknown }).share;
    delete (navigator as { canShare?: unknown }).canShare;
    delete (navigator as { clipboard?: unknown }).clipboard;
  });

  it("uses the Web Share API with the file when the platform supports sharing files", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    (navigator as { canShare?: unknown }).canShare = () => true;
    (navigator as { share?: unknown }).share = shareMock;

    const outcome = await shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "https://maps.example/x" });

    expect(outcome).toBe("shared");
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test", text: "https://maps.example/x", files: expect.any(Array) })
    );
  });

  it("reports 'cancelled' (not an error) when the user dismisses the native share sheet", async () => {
    (navigator as { canShare?: unknown }).canShare = () => true;
    (navigator as { share?: unknown }).share = vi.fn().mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));

    const outcome = await shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "" });
    expect(outcome).toBe("cancelled");
  });

  it("re-throws a genuine (non-AbortError) share failure", async () => {
    (navigator as { canShare?: unknown }).canShare = () => true;
    (navigator as { share?: unknown }).share = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "" })).rejects.toThrow("boom");
  });

  it("falls back to download + clipboard copy when file sharing isn't supported", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    (navigator as { clipboard?: unknown }).clipboard = { writeText: writeTextMock };

    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();

    const outcome = await shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "https://maps.example/x" });

    expect(outcome).toBe("downloaded-with-link-copied");
    expect(writeTextMock).toHaveBeenCalledWith("https://maps.example/x");
    expect(anchorClickSpy).toHaveBeenCalled();
    anchorClickSpy.mockRestore();
  });

  it("falls back to a plain download when clipboard access also isn't available", async () => {
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const outcome = await shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "https://maps.example/x" });

    expect(outcome).toBe("downloaded-only");
    anchorClickSpy.mockRestore();
  });

  it("downloads without a shareText and skips clipboard entirely when there's nothing to copy", async () => {
    const writeTextMock = vi.fn();
    (navigator as { clipboard?: unknown }).clipboard = { writeText: writeTextMock };
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const outcome = await shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "" });

    expect(outcome).toBe("downloaded-only");
    expect(writeTextMock).not.toHaveBeenCalled();
    anchorClickSpy.mockRestore();
  });
});

describe("shareImage - inside the native Capacitor app", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses Capacitor's native Share plugin (not the Web Share API) when running natively", async () => {
    const { Capacitor } = await import("@capacitor/core");
    const { Filesystem } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: "file:///cache/test.png" });
    vi.mocked(Share.share).mockResolvedValue({ activityType: undefined });

    const outcome = await shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "https://maps.example/x" });

    expect(outcome).toBe("shared");
    expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: "test.png", directory: "CACHE" }));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test", text: "https://maps.example/x", files: ["file:///cache/test.png"] })
    );
  });

  it("reports 'cancelled' when the user dismisses the native Android share sheet", async () => {
    const { Capacitor } = await import("@capacitor/core");
    const { Filesystem } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: "file:///cache/test.png" });
    vi.mocked(Share.share).mockRejectedValue(new Error("Share canceled"));

    const outcome = await shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "" });
    expect(outcome).toBe("cancelled");
  });

  it("re-throws a genuine native share failure", async () => {
    const { Capacitor } = await import("@capacitor/core");
    const { Filesystem } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: "file:///cache/test.png" });
    vi.mocked(Share.share).mockRejectedValue(new Error("boom"));

    await expect(shareImage({ blob: makeBlob(), filename: "test.png", title: "Test", shareText: "" })).rejects.toThrow("boom");
  });
});

describe("preloadShareDependencies", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when called outside the native app", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect(() => preloadShareDependencies()).not.toThrow();
  });

  it("does not throw when called inside the native app", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(() => preloadShareDependencies()).not.toThrow();
  });
});

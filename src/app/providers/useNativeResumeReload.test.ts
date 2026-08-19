import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNativeResumeReload } from "./useNativeResumeReload";

const listeners: Record<string, () => void> = {};
const addListenerMock = vi.fn((event: string, cb: () => void) => {
  listeners[event] = cb;
  return Promise.resolve({ remove: vi.fn() });
});

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) }
}));
vi.mock("@capacitor/app", () => ({
  App: { addListener: addListenerMock }
}));

describe("useNativeResumeReload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    // @ts-expect-error - test stub, avoids jsdom's "not implemented" navigation error
    delete window.location;
    // @ts-expect-error
    window.location = { reload: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does nothing outside the native app", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    renderHook(() => useNativeResumeReload());
    expect(addListenerMock).not.toHaveBeenCalled();
  });

  it("reloads if the app was backgrounded for a long time", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    renderHook(() => useNativeResumeReload());
    await vi.waitFor(() => expect(listeners.pause).toBeDefined());

    listeners.pause!();
    vi.advanceTimersByTime(90_000);
    listeners.resume!();

    expect(window.location.reload).toHaveBeenCalled();
  });

  it("does NOT reload for a quick round-trip (e.g. switching to WhatsApp to share and back)", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    renderHook(() => useNativeResumeReload());
    await vi.waitFor(() => expect(listeners.pause).toBeDefined());

    listeners.pause!();
    vi.advanceTimersByTime(2_000);
    listeners.resume!();

    expect(window.location.reload).not.toHaveBeenCalled();
  });
});

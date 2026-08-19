import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/** Android normally just suspends the WebView instead of killing it, so
 * "closing and reopening" the app doesn't actually re-navigate/refetch on
 * its own - the same already-loaded JS keeps running. This forces a real
 * reload (fresh network fetch) once the app has actually been in the
 * background for a while, so a genuine reopen always shows the latest
 * deployed version. Only reloads after a real background period (not on
 * quick round-trips like switching to WhatsApp mid-share and coming right
 * back), to avoid disrupting anything in progress. */
const BACKGROUND_RELOAD_THRESHOLD_MS = 60_000;

export function useNativeResumeReload(): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let pausedAt: number | null = null;
    let pauseListener: { remove: () => void } | undefined;
    let resumeListener: { remove: () => void } | undefined;

    void import("@capacitor/app").then(({ App }) => {
      App.addListener("pause", () => {
        pausedAt = Date.now();
      }).then((handle) => {
        pauseListener = handle;
      });
      App.addListener("resume", () => {
        if (pausedAt !== null && Date.now() - pausedAt >= BACKGROUND_RELOAD_THRESHOLD_MS) {
          window.location.reload();
        }
        pausedAt = null;
      }).then((handle) => {
        resumeListener = handle;
      });
    });

    return () => {
      pauseListener?.remove();
      resumeListener?.remove();
    };
  }, []);
}

import { Capacitor } from "@capacitor/core";

export type ShareOutcome = "shared" | "downloaded-with-link-copied" | "downloaded-only" | "cancelled";

/** Warms the share code path (html2canvas, plus the native Share/Filesystem
 * plugins inside the APK) in the background as soon as a screen that offers
 * sharing is opened - not waited on by anything. Without this, the actual
 * share button had to fetch these chunks fresh over the network on first
 * tap (the APK loads live from plans.dbuilder.eu, with no service-worker
 * precache to fall back on inside the native app - see AppProviders), which
 * showed up as a many-second delay before the share sheet appeared. Safe to
 * call repeatedly; the browser/JS module cache dedupes it after the first
 * successful load. */
export function preloadShareDependencies(): void {
  void import("html2canvas");
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor/filesystem");
    void import("@capacitor/share");
  }
}

/** Rasterizes a DOM node into a PNG blob via html2canvas - same library and
 * same options (2x scale, white background, useCORS) V1 used for its
 * WhatsApp share image (generateReportImageBlob in js/app.js). Dynamically
 * imported so html2canvas only loads when a share is actually requested. */
export async function generateElementImageBlob(element: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("სურათი ვერ შეიქმნა");
  return blob;
}

export interface ShareImageParams {
  blob: Blob;
  filename: string;
  title: string;
  shareText: string;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Inside the Capacitor Android app, the WebView's Web Share API doesn't
 * reliably support sharing files (canShare({files}) is often unsupported
 * or silently ignores files even when it returns true) - it was falling
 * back to a plain download instead of opening the share sheet. Capacitor's
 * own Share plugin talks to Android's native share intent directly,
 * bypassing the WebView's Web Share support entirely. The file has to be
 * written to disk first (the native Share API takes a file URI, not a
 * Blob) - written to the cache directory, which Android periodically
 * clears on its own. Filesystem.writeFile takes the Blob directly (no
 * manual base64 conversion) - base64 both costs time to compute and
 * inflates the payload ~33% right before it has to cross the native
 * bridge, which was most of the extra delay compared to the browser/PWA
 * path. */
async function shareNative({ blob, filename, title, shareText }: ShareImageParams): Promise<ShareOutcome> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const written = await Filesystem.writeFile({ path: filename, data: blob, directory: Directory.Cache });
  try {
    await Share.share({ title, text: shareText, files: [written.uri] });
    return "shared";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel/i.test(message)) return "cancelled";
    throw error;
  }
}

/**
 * Web/PWA fallback chain (same as V1's shareReport, js/app.js):
 * 1. Web Share API with the file, if the platform supports sharing files
 *    (Android Chrome / installed PWA - lets the user pick WhatsApp etc.).
 * 2. Otherwise, download the image and copy the share text (Maps link) to
 *    the clipboard, so the user can paste it manually.
 * 3. If clipboard access also isn't available, just download the image.
 * A user-cancelled share (AbortError) is reported as "cancelled", not an
 * error - the caller should not show a failure message for it.
 */
export async function shareImage(params: ShareImageParams): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) return shareNative(params);

  const { blob, filename, title, shareText } = params;
  const file = new File([blob], filename, { type: blob.type || "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: shareText });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
      throw error;
    }
  }

  downloadBlob(blob, filename);

  if (shareText && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareText);
      return "downloaded-with-link-copied";
    } catch {
      // Clipboard permission can be denied - fall through to a plain download outcome.
    }
  }
  return "downloaded-only";
}

export type ShareOutcome = "shared" | "downloaded-with-link-copied" | "downloaded-only" | "cancelled";

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

/**
 * Same fallback chain as V1's shareReport (js/app.js):
 * 1. Web Share API with the file, if the platform supports sharing files
 *    (Android Chrome / installed PWA - lets the user pick WhatsApp etc.).
 * 2. Otherwise, download the image and copy the share text (Maps link) to
 *    the clipboard, so the user can paste it manually.
 * 3. If clipboard access also isn't available, just download the image.
 * A user-cancelled share (AbortError) is reported as "cancelled", not an
 * error - the caller should not show a failure message for it.
 */
export async function shareImage({ blob, filename, title, shareText }: ShareImageParams): Promise<ShareOutcome> {
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

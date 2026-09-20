/** Downsizes and re-encodes an image file before it's stored - a phone
 * camera photo (often several MB) compresses down to a fraction of that
 * with no visible quality loss for on-screen viewing, which matters here
 * since every photo is stored directly in IndexedDB with no server-side
 * processing. Non-image files (PDF) are never passed through this - they
 * go in as-is.
 *
 * maxDimension bounds the longer side; quality is the JPEG encode
 * quality (0-1). Defaults chosen for "clear enough to review a defect on
 * a phone screen", not "print quality".
 */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file; // Extremely unlikely, but fall back to the original rather than fail the upload.
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

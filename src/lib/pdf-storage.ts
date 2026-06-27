/**
 * PDF upload and storage utilities
 * Uses Vercel Blob Storage for both dev and production
 */
import { put, list } from "@vercel/blob";

/**
 * Save a PDF file to Vercel Blob Storage.
 * Store is private, so we don't set access: "public".
 * The returned URL includes a token for reading.
 */
export async function savePdf(file: File): Promise<{ fileUrl: string; fileName: string }> {
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  console.log("[blob] starting put(), path:", `pdfs/${fileName}`, "size:", file.size);
  const blob = await put(`pdfs/${fileName}`, file, {
    access: "private",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });
  console.log("[blob] upload success, url:", blob.url);
  return { fileUrl: blob.url, fileName };
}

/**
 * Get the Blob URL for a stored PDF.
 * Since we store the full Blob URL in Paper.fileUrl, most callers can use it directly.
 * This helper is for cases where we only have the fileName.
 */
export async function resolvePdfUrl(fileName: string): Promise<string | null> {
  // Try direct head() to check if blob exists
  try {
    // We need to construct the expected URL or list blobs to find it
    const { blobs } = await list({ prefix: `pdfs/${fileName}` });
    if (blobs.length > 0) {
      return blobs[0].url;
    }
    return null;
  } catch {
    return null;
  }
}

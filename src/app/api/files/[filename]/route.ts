import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";

// GET /api/files/[filename] — redirect to Vercel Blob URL
// Since we store the full Blob URL in Paper.fileUrl, this route is mainly
// a fallback for any old references. It tries to resolve by reconstructing
// the blob path and redirecting.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // The filename stored in Vercel Blob is like "pdfs/1234567-paper.pdf"
  // We try to find it via head()
  try {
    // Construct the expected blob URL from environment
    // Vercel Blob URLs look like: https://<store-id>.public.blob.vercel-storage.com/pdfs/<filename>
    // We can't easily reconstruct without the store ID, so we redirect to
    // the papers API which has the full URL stored.

    // Better approach: return a 404 with guidance — callers should use Paper.fileUrl directly
    return NextResponse.json(
      { error: "Use Paper.fileUrl directly. This route is deprecated with Blob storage." },
      { status: 410 }
    );
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

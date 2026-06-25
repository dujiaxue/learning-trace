import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Proxy endpoint to serve PDF files from private Vercel Blob Storage.
 * Client cannot access private blob URLs directly, so we fetch server-side
 * and stream the content back.
 *
 * GET /api/pdf?id=<paperId>  — serve PDF for a paper
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing paper id" }, { status: 400 });
  }

  const paper = await prisma.paper.findUnique({
    where: { id },
    select: { fileUrl: true, fileName: true },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  try {
    const blobRes = await fetch(paper.fileUrl);
    if (!blobRes.ok) {
      console.error("[pdf-proxy] blob fetch failed:", blobRes.status, blobRes.statusText);
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${blobRes.status}` },
        { status: 502 }
      );
    }

    const contentType = blobRes.headers.get("content-type") || "application/pdf";
    const arrayBuffer = await blobRes.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${paper.fileName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("[pdf-proxy] error:", err);
    return NextResponse.json(
      { error: `Proxy error: ${err?.message || err}` },
      { status: 500 }
    );
  }
}

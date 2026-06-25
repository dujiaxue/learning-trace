import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { get } from "@vercel/blob";

/**
 * Proxy endpoint to serve PDF files from private Vercel Blob Storage.
 * Client cannot access private blob URLs directly, so we use the `get()`
 * method which handles auth automatically, then stream the content back.
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
    const result = await get(paper.fileUrl, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json(
        { error: `Blob not found (status: ${result?.statusCode})` },
        { status: 404 }
      );
    }

    const contentType = result.blob.contentType || "application/pdf";

    // Convert ReadableStream to ArrayBuffer for NextResponse
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${paper.fileName}"`,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(buffer.length),
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

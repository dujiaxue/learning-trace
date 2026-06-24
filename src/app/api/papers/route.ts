import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePdf } from "@/lib/pdf-storage";

// POST /api/papers — upload a new paper
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = (formData.get("userId") as string) || "demo-user"; // TODO: replace with auth

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Save file to Vercel Blob Storage
    let fileUrl: string;
    let fileName: string;
    try {
      const result = await savePdf(file);
      fileUrl = result.fileUrl;
      fileName = result.fileName;
    } catch (blobError: any) {
      console.error("Blob upload failed:", blobError);
      return NextResponse.json(
        { error: `Blob upload failed: ${blobError?.message || blobError}` },
        { status: 500 }
      );
    }

    // Create paper record
    let paper;
    try {
      paper = await prisma.paper.create({
        data: {
          title: file.name.replace(/\.pdf$/i, ""),
          fileName: fileName,
          fileSize: file.size,
          fileUrl: fileUrl,
          pageCount: 0,
          userId,
          status: "reading",
        },
      });
    } catch (dbError: any) {
      console.error("DB create failed:", dbError);
      return NextResponse.json(
        { error: `DB create failed: ${dbError?.message || dbError}` },
        { status: 500 }
      );
    }

    // Create initial reading session
    try {
      await prisma.readingSession.create({
        data: {
          paperId: paper.id,
          userId,
          mode: "free",
        },
      });
    } catch (dbError: any) {
      console.error("Session create failed:", dbError);
      // Paper is created, session is not critical
    }

    return NextResponse.json({ paper }, { status: 201 });
  } catch (error) {
    console.error("Upload outer error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${(error as Error)?.message || error}` },
      { status: 500 }
    );
  }
}

// GET /api/papers — list all papers for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "demo-user";

  const papers = await prisma.paper.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { annotations: true },
      },
    },
  });

  return NextResponse.json({ papers });
}

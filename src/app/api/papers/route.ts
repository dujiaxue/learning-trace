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
    const { fileUrl, fileName } = await savePdf(file);

    // Create paper record
    const paper = await prisma.paper.create({
      data: {
        title: file.name.replace(/\.pdf$/i, ""),
        fileName: fileName,
        fileSize: file.size,
        fileUrl: fileUrl,
        pageCount: 0, // TODO: extract with pdfjs on server
        userId,
        status: "reading",
      },
    });

    // Create initial reading session
    await prisma.readingSession.create({
      data: {
        paperId: paper.id,
        userId,
        mode: "free",
      },
    });

    return NextResponse.json({ paper }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload paper:", error);
    return NextResponse.json(
      { error: "Failed to upload paper" },
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/annotations — create an annotation
export async function POST(req: NextRequest) {
  const body = await req.json();

  const annotation = await prisma.annotation.create({
    data: {
      paperId: body.paperId,
      userId: body.userId || "demo-user",
      type: body.type,
      pageNumber: body.pageNumber,
      position: JSON.stringify(body.position),
      textContent: body.textContent || "",
      noteContent: body.note || "",
      aiMeta: body.aiGenerated ? JSON.stringify({ aiGenerated: true }) : null,
    },
  });

  return NextResponse.json({ annotation }, { status: 201 });
}

// GET /api/annotations?paperId=xxx — list annotations for a paper
export async function GET(req: NextRequest) {
  const paperId = req.nextUrl.searchParams.get("paperId");

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  const annotations = await prisma.annotation.findMany({
    where: { paperId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ annotations });
}

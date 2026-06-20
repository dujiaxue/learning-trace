import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/papers/[id] — get a single paper with annotations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const paper = await prisma.paper.findUnique({
    where: { id },
    include: {
      annotations: {
        orderBy: { createdAt: "asc" },
      },
      sessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  return NextResponse.json({ paper });
}

// PATCH /api/papers/[id] — update paper status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const paper = await prisma.paper.update({
    where: { id },
    data: {
      status: body.status,
      finalSummary: body.finalSummary,
    },
  });

  return NextResponse.json({ paper });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/knowledge-links?paperId=xxx — get knowledge links for a paper
export async function GET(req: NextRequest) {
  const paperId = req.nextUrl.searchParams.get("paperId");

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  // Get links where this paper is source or target
  const [outgoing, incoming] = await Promise.all([
    prisma.knowledgeLink.findMany({
      where: { sourcePaperId: paperId },
      include: { targetPaper: { select: { id: true, title: true } } },
      orderBy: { similarity: "desc" },
    }),
    prisma.knowledgeLink.findMany({
      where: { targetPaperId: paperId },
      include: { sourcePaper: { select: { id: true, title: true } } },
      orderBy: { similarity: "desc" },
    }),
  ]);

  const links = [
    ...outgoing.map((l) => ({
      id: l.id,
      concept: l.concept,
      explanation: l.explanation,
      similarity: l.similarity,
      direction: "outgoing",
      otherPaper: l.targetPaper,
    })),
    ...incoming.map((l) => ({
      id: l.id,
      concept: l.concept,
      explanation: l.explanation,
      similarity: l.similarity,
      direction: "incoming",
      otherPaper: l.sourcePaper,
    })),
  ];

  return NextResponse.json({ links });
}

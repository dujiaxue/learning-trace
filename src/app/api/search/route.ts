import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// GET /api/search?q=xxx — search across all papers, annotations, and blog posts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const userId = await getUserId(req);

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const query = q.trim();

  // Search papers by title
  const papers = await prisma.paper.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { finalSummary: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      finalSummary: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Search annotations by text content or note
  const annotations = await prisma.annotation.findMany({
    where: {
      userId,
      OR: [
        { textContent: { contains: query, mode: "insensitive" } },
        { noteContent: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      paper: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Search blog posts
  const blogPosts = await prisma.blogPost.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      paper: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    query,
    results: {
      papers,
      annotations,
      blogPosts,
    },
    total: papers.length + annotations.length + blogPosts.length,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// GET /api/blog-posts — list blog posts for a user
// GET /api/blog-posts?paperId=xxx — list blog posts for a paper
export async function GET(req: NextRequest) {
  const paperId = req.nextUrl.searchParams.get("paperId");
  const userId = await getUserId(req);

  const where = paperId ? { paperId, userId } : { userId };

  const posts = await prisma.blogPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      paper: {
        select: { id: true, title: true },
      },
    },
  });

  return NextResponse.json({ posts });
}

// POST /api/blog-posts — create or publish a blog post
export async function POST(req: NextRequest) {
  const { paperId, title, content, status } = await req.json();
  const userId = await getUserId(req);

  if (!paperId || !title || !content) {
    return NextResponse.json(
      { error: "paperId, title, content are required" },
      { status: 400 }
    );
  }

  const post = await prisma.blogPost.create({
    data: {
      paperId,
      userId,
      title,
      content,
      status: status || "draft",
    },
  });

  // If publishing, also mark paper as public
  if (status === "published") {
    await prisma.paper.update({
      where: { id: paperId },
      data: { isPublic: true },
    });
  }

  return NextResponse.json({ post }, { status: 201 });
}

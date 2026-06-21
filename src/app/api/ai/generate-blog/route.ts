import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// POST /api/ai/generate-blog — generate a blog post from a paper's annotations
export async function POST(req: NextRequest) {
  const { paperId } = await req.json();
  const userId = await getUserId(req);

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  const startTime = Date.now();

  try {
    // Fetch paper with all annotations and Feynman QAs
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        annotations: { orderBy: { createdAt: "asc" } },
        sessions: {
          include: { feynmanQAs: true },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // Build context for AI
    const annotations = paper.annotations.map((a) => ({
      type: a.type,
      page: a.pageNumber,
      text: a.textContent?.slice(0, 200),
      note: a.noteContent?.slice(0, 200),
    }));

    const feynmanQAs = paper.sessions.flatMap((s) =>
      s.feynmanQAs.map((q) => ({
        question: q.question,
        answer: q.userAnswer?.slice(0, 200),
        evaluation: q.aiEvaluation
          ? JSON.parse(q.aiEvaluation)
          : null,
      }))
    );

    const context = `论文标题：${paper.title}

标注记录（${annotations.length}条）：
${JSON.stringify(annotations, null, 2)}

费曼问答（${feynmanQAs.length}条）：
${JSON.stringify(feynmanQAs, null, 2)}

用户总结：
${paper.finalSummary || "(暂无总结)"}`;

    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.generateBlog },
        { role: "user", content: context },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - startTime;

    // Extract title from first line (assume markdown # title or first line)
    const titleMatch = response.match(/^#\s+(.+)$/m);
    const title = titleMatch
      ? titleMatch[1]
      : `${paper.title} - 学习笔记`;

    // Save as draft blog post
    const blogPost = await prisma.blogPost.create({
      data: {
        paperId,
        userId,
        title,
        content: response,
        status: "draft",
      },
    });

    // Log AI interaction
    await prisma.aILog.create({
      data: {
        paperId,
        userId,
        type: "generateBlog",
        inputContext: JSON.stringify({
          annotationCount: annotations.length,
          feynmanCount: feynmanQAs.length,
        }),
        prompt: `System: ${SYSTEM_PROMPTS.generateBlog}\nUser: ${context.slice(0, 500)}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    return NextResponse.json({ blogPost, latencyMs });
  } catch (error) {
    console.error("AI generate-blog error:", error);
    return NextResponse.json(
      { error: "Failed to generate blog post" },
      { status: 500 }
    );
  }
}

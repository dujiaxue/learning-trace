import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// POST /api/ai/knowledge-links — find concept connections between papers
export async function POST(req: NextRequest) {
  const { paperId } = await req.json();
  const userId = await getUserId(req);

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  const startTime = Date.now();

  try {
    // Get the current paper
    const currentPaper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        annotations: {
          where: { type: { in: ["note", "aha", "feynman"] } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!currentPaper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // Get all other papers by this user (excluding current)
    const otherPapers = await prisma.paper.findMany({
      where: { userId, id: { not: paperId } },
      include: {
        annotations: {
          where: { type: { in: ["note", "aha", "feynman"] } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (otherPapers.length === 0) {
      return NextResponse.json({
        links: [],
        message: "暂无其他论文可关联",
      });
    }

    const allLinks: any[] = [];

    // Compare current paper with each other paper
    for (const other of otherPapers) {
      const currentContext = {
        title: currentPaper.title,
        annotations: currentPaper.annotations.map((a) => ({
          text: a.textContent?.slice(0, 150),
          note: a.noteContent?.slice(0, 150),
        })),
        summary: currentPaper.finalSummary?.slice(0, 300),
      };

      const otherContext = {
        title: other.title,
        annotations: other.annotations.map((a) => ({
          text: a.textContent?.slice(0, 150),
          note: a.noteContent?.slice(0, 150),
        })),
        summary: other.finalSummary?.slice(0, 300),
      };

      const completion = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL.chat,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.knowledgeLink },
          {
            role: "user",
            content: `论文A：\n${JSON.stringify(currentContext, null, 2)}\n\n论文B：\n${JSON.stringify(otherContext, null, 2)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || "";

      try {
        const parsed = JSON.parse(responseText);
        if (parsed.links && Array.isArray(parsed.links)) {
          for (const link of parsed.links) {
            // Save to database
            const dbLink = await prisma.knowledgeLink.upsert({
              where: {
                sourcePaperId_targetPaperId_concept: {
                  sourcePaperId: paperId,
                  targetPaperId: other.id,
                  concept: link.concept,
                },
              },
              update: {
                explanation: link.explanation,
                similarity: link.similarity || 0.5,
              },
              create: {
                sourcePaperId: paperId,
                targetPaperId: other.id,
                concept: link.concept,
                explanation: link.explanation,
                similarity: link.similarity || 0.5,
                aiGenerated: true,
              },
            });
            allLinks.push({
              ...dbLink,
              targetPaperTitle: other.title,
            });
          }
        }
      } catch {
        // JSON parse failed, skip this pair
      }
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      links: allLinks,
      comparedWith: otherPapers.length,
      latencyMs,
    });
  } catch (error) {
    console.error("AI knowledge-links error:", error);
    return NextResponse.json(
      { error: "Failed to generate knowledge links" },
      { status: 500 }
    );
  }
}

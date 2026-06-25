import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// POST /api/ai/final-summary — 会话结束时生成"我的理解"总结
// 输入 paperId，聚合该论文全部标注、费曼问答、AI 评估，生成第一人称总结并写回 Paper.finalSummary
export async function POST(req: NextRequest) {
  const { paperId } = await req.json();
  const userId = await getUserId(req);

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  const startTime = Date.now();

  try {
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
        evaluation: q.aiEvaluation ? JSON.parse(q.aiEvaluation) : null,
      }))
    );

    const context = `论文标题：${paper.title}

标注记录（${annotations.length}条）：
${JSON.stringify(annotations, null, 2)}

费曼问答（${feynmanQAs.length}条）：
${JSON.stringify(feynmanQAs, null, 2)}`;

    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.finalSummary },
        { role: "user", content: context },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - startTime;

    // 写回 Paper.finalSummary
    await prisma.paper.update({
      where: { id: paperId },
      data: { finalSummary: response },
    });

    await prisma.aILog.create({
      data: {
        paperId,
        userId,
        type: "finalSummary",
        inputContext: JSON.stringify({
          annotationCount: annotations.length,
          feynmanCount: feynmanQAs.length,
        }),
        prompt: `System: ${SYSTEM_PROMPTS.finalSummary}\nUser: ${context.slice(0, 500)}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    return NextResponse.json({ finalSummary: response, latencyMs });
  } catch (error) {
    console.error("AI final-summary error:", error);
    return NextResponse.json({ error: "Failed to generate final summary" }, { status: 500 });
  }
}

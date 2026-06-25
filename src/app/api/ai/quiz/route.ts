import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// POST /api/ai/quiz — generate a Feynman quiz question
// 创建 FeynmanQA 记录并返回 id，供后续 evaluate 关联
export async function POST(req: NextRequest) {
  const { paperTitle, textContent, concept, paperId, trigger } = await req.json();
  const userId = await getUserId(req);

  const startTime = Date.now();

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.quiz },
        { role: "user", content: `论文标题：${paperTitle}\n段落内容：\n${textContent}\n${concept ? `针对概念：${concept}` : ""}` },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const response = completion.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - startTime;

    // 找到当前 paper 最近一个 session 作为归属（没有则创建一个）
    let sessionId: string | undefined;
    if (paperId) {
      let session = await prisma.readingSession.findFirst({
        where: { paperId, userId },
        orderBy: { startedAt: "desc" },
      });
      if (!session) {
        session = await prisma.readingSession.create({
          data: { paperId, userId, mode: "free" },
        });
      }
      sessionId = session.id;
    }

    // 创建 FeynmanQA 记录，trigger 标记是手动还是阶段自动
    let feynmanQAId: string | undefined;
    if (paperId && sessionId) {
      const qa = await prisma.feynmanQA.create({
        data: {
          sessionId,
          paperId,
          userId,
          question: response,
          context: textContent?.slice(0, 500),
          trigger: trigger || "manual",
          status: "pending",
        },
      });
      feynmanQAId = qa.id;
    }

    await prisma.aILog.create({
      data: {
        paperId,
        userId,
        type: "quiz",
        inputContext: JSON.stringify({ textContent: textContent.slice(0, 200), trigger }),
        prompt: `System: ${SYSTEM_PROMPTS.quiz}\nUser: ${textContent}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    // 返回 feynmanQAId，前端 evaluate 时回传，evaluate 才能正确 update 这条记录
    return NextResponse.json({ question: response, latencyMs, feynmanQAId });
  } catch (error) {
    console.error("AI quiz error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

// POST /api/ai/evaluate — evaluate user's Feynman answer
export async function POST(req: NextRequest) {
  const { question, userAnswer, context, paperId, userId, annotationId } = await req.json();

  const startTime = Date.now();

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.evaluate },
        { role: "user", content: `费曼问题：${question}\n\n用户的回答：${userAnswer}\n\n参考上下文：\n${context || "无"}` },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    const response = completion.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - startTime;

    // Parse evaluation score
    let score: "good" | "partial" | "misconception" = "partial";
    if (response.includes("理解良好")) score = "good";
    else if (response.includes("存在误区")) score = "misconception";

    // Update the FeynmanQA with evaluation result
    if (annotationId) {
      // annotationId here is actually the FeynmanQA id passed from frontend
      await prisma.feynmanQA.update({
        where: { id: annotationId },
        data: {
          userAnswer,
          aiEvaluation: JSON.stringify({ score, feedback: response }),
          status: "evaluated",
        },
      });
    }

    // Log AI interaction
    await prisma.aILog.create({
      data: {
        paperId,
        userId: userId || "demo-user",
        type: "evaluate",
        inputContext: JSON.stringify({ question, userAnswer: userAnswer.slice(0, 200) }),
        prompt: `System: ${SYSTEM_PROMPTS.evaluate}\nUser: Q=${question}\nA=${userAnswer}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    return NextResponse.json({ evaluation: response, score, latencyMs });
  } catch (error) {
    console.error("AI evaluate error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate answer" },
      { status: 500 }
    );
  }
}

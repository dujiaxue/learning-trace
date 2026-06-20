import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

// POST /api/ai/explain — get AI explanation for a paragraph
export async function POST(req: NextRequest) {
  const { paperTitle, pageNumber, textContent, surroundingContext, paperId, userId } = await req.json();

  const startTime = Date.now();

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.explain },
        { role: "user", content: `论文标题：${paperTitle}\n第 ${pageNumber} 页\n\n段落内容：\n${textContent}\n\n上下文：\n${surroundingContext || "无"}` },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - startTime;

    // Log the AI interaction
    await prisma.aILog.create({
      data: {
        paperId,
        userId: userId || "demo-user",
        type: "explain",
        inputContext: JSON.stringify({ pageNumber, textContent: textContent.slice(0, 200) }),
        prompt: `System: ${SYSTEM_PROMPTS.explain}\nUser: ${textContent}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    return NextResponse.json({ explanation: response, latencyMs });
  } catch (error) {
    console.error("AI explain error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

// POST /api/ai/quiz — generate a Feynman quiz question
export async function POST(req: NextRequest) {
  const { paperTitle, textContent, concept, paperId, userId } = await req.json();

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

    await prisma.aILog.create({
      data: {
        paperId,
        userId: userId || "demo-user",
        type: "quiz",
        inputContext: JSON.stringify({ textContent: textContent.slice(0, 200) }),
        prompt: `System: ${SYSTEM_PROMPTS.quiz}\nUser: ${textContent}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    return NextResponse.json({ question: response, latencyMs });
  } catch (error) {
    console.error("AI quiz error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}

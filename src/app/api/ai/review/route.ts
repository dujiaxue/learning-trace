import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// POST /api/ai/review — AI reviews a user's annotation note
export async function POST(req: NextRequest) {
  const { annotationId, paperId, textContent, noteContent } = await req.json();
  const userId = await getUserId(req);

  if (!noteContent && !textContent) {
    return NextResponse.json(
      { error: "textContent or noteContent is required" },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.review },
        {
          role: "user",
          content: `论文标注原文：\n${textContent || "(无)"}\n\n用户的笔记：\n${noteContent || "(无)"}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - startTime;

    // Update annotation with AI review in aiMeta
    if (annotationId) {
      const annotation = await prisma.annotation.findUnique({
        where: { id: annotationId },
      });
      if (annotation) {
        const existingMeta = annotation.aiMeta
          ? JSON.parse(annotation.aiMeta)
          : {};
        await prisma.annotation.update({
          where: { id: annotationId },
          data: {
            aiMeta: JSON.stringify({
              ...existingMeta,
              review: response,
              reviewedAt: new Date().toISOString(),
            }),
          },
        });
      }
    }

    // Log AI interaction
    await prisma.aILog.create({
      data: {
        paperId,
        userId,
        type: "review",
        inputContext: JSON.stringify({
          annotationId,
          textContent: (textContent || "").slice(0, 200),
          noteContent: (noteContent || "").slice(0, 200),
        }),
        prompt: `System: ${SYSTEM_PROMPTS.review}\nUser: text=${textContent}\nnote=${noteContent}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    return NextResponse.json({ review: response, latencyMs });
  } catch (error) {
    console.error("AI review error:", error);
    return NextResponse.json(
      { error: "Failed to generate review" },
      { status: 500 }
    );
  }
}

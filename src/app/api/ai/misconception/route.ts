import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

// POST /api/ai/misconception — 检测用户当前阅读段落可能存在的误区
// 可被前端"回扫阶段"自动触发，也可手动调用
export async function POST(req: NextRequest) {
  const { paperTitle, textContent, pageNumber, paperId } = await req.json();
  const userId = await getUserId(req);

  if (!textContent) {
    return NextResponse.json({ error: "textContent is required" }, { status: 400 });
  }

  const startTime = Date.now();

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.misconception },
        {
          role: "user",
          content: `论文标题：${paperTitle}\n第 ${pageNumber || "?"} 页\n\n段落内容：\n${textContent}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const response = completion.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - startTime;
    const hasMisconception = !response.includes("NO_MISCONCEPTION");

    // 若检测到误区，落一条 misconception 类型标注，便于复盘
    if (hasMisconception && paperId) {
      try {
        await prisma.annotation.create({
          data: {
            paperId,
            userId,
            type: "misconception",
            pageNumber: pageNumber || 1,
            position: JSON.stringify({ rects: [] }),
            textContent: textContent.slice(0, 500),
            noteContent: response,
            aiMeta: JSON.stringify({ aiGenerated: true, autoTriggered: true }),
          },
        });
      } catch (e) {
        console.error("[misconception] 落标注失败:", e);
      }
    }

    await prisma.aILog.create({
      data: {
        paperId,
        userId,
        type: "misconception",
        inputContext: JSON.stringify({ pageNumber, textContent: textContent.slice(0, 200) }),
        prompt: `System: ${SYSTEM_PROMPTS.misconception}\nUser: ${textContent}`,
        response,
        model: DEEPSEEK_MODEL.chat,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        latencyMs,
      },
    });

    return NextResponse.json({
      misconception: response,
      hasMisconception,
      latencyMs,
    });
  } catch (error) {
    console.error("AI misconception error:", error);
    return NextResponse.json({ error: "Failed to detect misconception" }, { status: 500 });
  }
}

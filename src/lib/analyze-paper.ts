/**
 * 论文导入即分析管线
 *
 * 流程：
 *   1. 从 Vercel Blob 拉取 PDF 二进制
 *   2. 用 pdfjs 提取页数、文本、元数据（真标题/作者）
 *   3. 调用 DeepSeek 结构分析 prompt → 划分 core/normal/skip 章节
 *   4. 把结果写回 Paper 表（pageCount / extractedText / structure / title / authors）
 *   5. 写入 AILog 记录
 *
 * 设计为"导入后异步执行"——调用方应在响应返回后用 next/server 的 after() 触发本函数。
 */
import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { deepseek, DEEPSEEK_MODEL, SYSTEM_PROMPTS } from "@/lib/ai";
import { extractPdf, type PdfExtractResult } from "@/lib/pdf-extract";

interface AnalyzeResult {
  ok: boolean;
  paperId: string;
  pageCount: number;
  title: string;
  structure: string | null;
  error?: string;
}

/**
 * 拉取 Blob 中的 PDF 内容为 Uint8Array
 */
async function fetchPdfBytes(fileUrl: string): Promise<Uint8Array> {
  const result = await get(fileUrl, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Blob 拉取失败 (status: ${result?.statusCode})`);
  }
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return chunks.reduce<Uint8Array>((acc, c) => {
    const merged = new Uint8Array(acc.length + c.length);
    merged.set(acc, 0);
    merged.set(c, acc.length);
    return merged;
  }, new Uint8Array(0));
}

/**
 * 调用 DeepSeek 结构分析；失败时返回 null，不阻断整体流程
 */
async function analyzeStructure(
  paperTitle: string,
  fullText: string
): Promise<string | null> {
  // 文本过短则跳过结构分析（扫描版 PDF）
  if (!fullText || fullText.length < 200) {
    return null;
  }
  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL.chat,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.structure },
        {
          role: "user",
          content: `论文标题：${paperTitle}\n\n论文正文（前若干字符）：\n${fullText}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });
    const resp = completion.choices[0]?.message?.content || "";
    // 简单校验：是否是合法 JSON 数组结构
    JSON.parse(resp);
    return resp;
  } catch (err) {
    console.error("[analyze-paper] 结构分析失败:", err);
    return null;
  }
}

/**
 * 主入口：对一篇已上传的 paper 跑分析管线。
 * 失败不抛错（只记日志），保证不影响上传主流程。
 */
export async function analyzePaper(paperId: string, userId: string): Promise<AnalyzeResult> {
  console.log(`[analyze-paper] start, paperId=${paperId}`);

  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true, title: true, fileUrl: true, fileName: true },
  });
  if (!paper) {
    return { ok: false, paperId, pageCount: 0, title: "", structure: null, error: "paper not found" };
  }

  let extracted: PdfExtractResult;
  try {
    const bytes = await fetchPdfBytes(paper.fileUrl);
    extracted = await extractPdf(bytes);
  } catch (err) {
    console.error("[analyze-paper] 提取失败:", err);
    return {
      ok: false,
      paperId,
      pageCount: 0,
      title: paper.title,
      structure: null,
      error: (err as Error).message,
    };
  }

  // 优先用 PDF 元数据中的真标题，回落到原文件名
  const realTitle = extracted.title || paper.title;
  const structure = await analyzeStructure(realTitle, extracted.fullText);

  // 写回 DB
  await prisma.paper.update({
    where: { id: paperId },
    data: {
      pageCount: extracted.pageCount,
      extractedText: JSON.stringify(extracted.pages),
      structure,
      authors: extracted.authors,
      title: realTitle,
    },
  });

  // 写 AILog
  await prisma.aILog.create({
    data: {
      paperId,
      userId,
      type: "structure",
      inputContext: JSON.stringify({
        pageCount: extracted.pageCount,
        textLength: extracted.fullText.length,
      }),
      prompt: `System: ${SYSTEM_PROMPTS.structure}\nUser: ${extracted.fullText.slice(0, 500)}`,
      response: structure || "(结构分析跳过或失败)",
      model: DEEPSEEK_MODEL.chat,
      latencyMs: 0,
    },
  }).catch((e) => console.error("[analyze-paper] AILog 写入失败:", e));

  console.log(
    `[analyze-paper] done, paperId=${paperId}, pages=${extracted.pageCount}, structure=${structure ? "yes" : "no"}`
  );

  return {
    ok: true,
    paperId,
    pageCount: extracted.pageCount,
    title: realTitle,
    structure,
  };
}

/**
 * 重新分析已存在的论文（用于回填线上 pageCount=0 的旧数据）。
 * 路由 /api/papers/[id]/reanalyze 调用。
 */
export async function reanalyzePaper(paperId: string, userId: string): Promise<AnalyzeResult> {
  return analyzePaper(paperId, userId);
}

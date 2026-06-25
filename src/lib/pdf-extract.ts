/**
 * 服务端 PDF 文本与元信息提取
 * 使用 pdfjs-dist 在 Node 运行时解析 PDF（无 DOM 依赖）
 *
 * 注意：pdfjs-dist 不在 Next.js 默认 serverExternalPackages 中，
 * 需在 next.config.ts 的 serverExternalPackages 中加入 'pdfjs-dist'。
 */
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface ExtractedPage {
  page: number;
  text: string;
}

export interface PdfExtractResult {
  pageCount: number;
  pages: ExtractedPage[];
  title: string | null;
  authors: string | null;
  /** 全文拼接，供 AI 结构分析使用 */
  fullText: string;
}

/**
 * 从二进制数据提取 PDF 文本与元信息。
 * @param data PDF 文件的二进制内容（Uint8Array 或 ArrayBuffer）
 */
export async function extractPdf(data: Uint8Array | ArrayBuffer): Promise<PdfExtractResult> {
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = getDocument({
    data: buffer,
    // 服务端不使用 worker（pdfjs 在 Node 环境会自动 fallback 到主线程）
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
  });

  let doc: PDFDocumentProxy;
  try {
    doc = await loadingTask.promise;
  } catch (err) {
    throw new Error(`PDF 解析失败: ${(err as Error).message}`);
  }

  const pageCount = doc.numPages;
  const pages: ExtractedPage[] = [];

  // 限制单页文本长度，防止超大 PDF 撑爆内存/token
  const MAX_CHARS_PER_PAGE = 8000;

  for (let i = 1; i <= pageCount; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CHARS_PER_PAGE);
      pages.push({ page: i, text });
      page.cleanup();
    } catch {
      // 单页失败不阻断整体提取
      pages.push({ page: i, text: "" });
    }
  }

  // 元数据（标题/作者），失败则返回 null
  let title: string | null = null;
  let authors: string | null = null;
  try {
    const meta = await doc.getMetadata();
    const info = (meta?.info || {}) as Record<string, unknown>;
    if (typeof info.Title === "string" && info.Title.trim()) {
      title = info.Title.trim();
    }
    if (typeof info.Author === "string" && info.Author.trim()) {
      authors = info.Author.trim();
    }
  } catch {
    // ignore
  }

  // 释放资源（pdfjs v6 用 loadingTask.destroy()）
  try {
    await loadingTask.destroy();
  } catch {
    // ignore
  }

  // 全文：限制总长度，避免 AI 输入过长
  const MAX_TOTAL = 40000;
  let fullText = pages.map((p) => p.text).join("\n\n");
  if (fullText.length > MAX_TOTAL) {
    fullText = fullText.slice(0, MAX_TOTAL);
  }

  return { pageCount, pages, title, authors, fullText };
}

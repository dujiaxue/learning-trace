/**
 * 服务端 PDF 文本与元信息提取
 * 使用 unpdf（基于 pdfjs-dist 的 serverless 封装）在 Node 运行时解析 PDF
 *
 * unpdf 专为 Cloudflare Workers / Vercel Edge / Node serverless 设计，
 * 不依赖 DOM API、不加载 worker，开箱即用。
 */
import { extractText, getMeta } from "unpdf";

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

  // extractText with mergePages: false → { totalPages, text: string[] }
  const { totalPages, text } = await extractText(buffer, { mergePages: false });

  const pageTexts: string[] = Array.isArray(text) ? text : [String(text || "")];
  const pages: ExtractedPage[] = pageTexts.map((t, i) => ({
    page: i + 1,
    text: (t || "").replace(/\s+/g, " ").trim().slice(0, 8000),
  }));

  // 元数据
  let title: string | null = null;
  let authors: string | null = null;
  try {
    const meta = await getMeta(buffer);
    if (meta?.info?.Title && String(meta.info.Title).trim()) {
      title = String(meta.info.Title).trim();
    }
    if (meta?.info?.Author && String(meta.info.Author).trim()) {
      authors = String(meta.info.Author).trim();
    }
  } catch {
    // 元数据提取失败不阻断
  }

  // 全文：限制总长度
  const MAX_TOTAL = 40000;
  let fullText = pages.map((p) => p.text).join("\n\n");
  if (fullText.length > MAX_TOTAL) {
    fullText = fullText.slice(0, MAX_TOTAL);
  }

  return {
    pageCount: totalPages || pages.length,
    pages,
    title,
    authors,
    fullText,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { reanalyzePaper } from "@/lib/analyze-paper";

// POST /api/papers/[id]/reanalyze — 重新跑「导入即分析」管线
// 用于回填线上 pageCount=0 / extractedText=null 的旧数据，
// 也可在 PDF 替换后重新分析。
// 注意：同步执行（不用 after），方便调试 + Vercel serverless 对 after() 支持不稳定
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId(req);

  try {
    const result = await reanalyzePaper(id, userId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reanalyze] failed:", err);
    return NextResponse.json(
      { ok: false, paperId: id, error: message },
      { status: 500 }
    );
  }
}

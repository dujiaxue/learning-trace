import { NextRequest, NextResponse, after } from "next/server";
import { getUserId } from "@/lib/auth";
import { reanalyzePaper } from "@/lib/analyze-paper";

// POST /api/papers/[id]/reanalyze — 重新跑「导入即分析」管线
// 用于回填线上 pageCount=0 / extractedText=null 的旧数据，
// 也可在 PDF 替换后重新分析。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId(req);

  // 异步执行，立即返回"已开始"
  after(() =>
    reanalyzePaper(id, userId).catch((e) =>
      console.error("[reanalyze] failed:", e)
    )
  );

  return NextResponse.json({ ok: true, paperId: id, message: "分析已在后台开始" });
}

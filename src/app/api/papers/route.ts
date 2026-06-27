import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePdf } from "@/lib/pdf-storage";
import { analyzePaper } from "@/lib/analyze-paper";

// POST /api/papers — upload a new paper
// 上传成功后立即返回，分析在响应发送后用 after() 异步执行（导入即分析）
export async function POST(req: NextRequest) {
  console.log("[upload] POST hit, code version: blob-v2-analyze");
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = (formData.get("userId") as string) || "demo-user"; // TODO: replace with auth

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Save file to Vercel Blob Storage
    let fileUrl: string;
    let fileName: string;
    try {
      const result = await savePdf(file);
      fileUrl = result.fileUrl;
      fileName = result.fileName;
    } catch (blobError) {
      const msg = blobError instanceof Error ? blobError.message : String(blobError);
      console.error("Blob upload failed:", blobError);
      return NextResponse.json(
        { error: `Blob upload failed: ${msg}` },
        { status: 500 }
      );
    }

    // Ensure user exists (upsert demo-user if needed)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: userId === "demo-user" ? "demo@learning-trace.app" : `${userId}@learning-trace.app`,
        name: userId === "demo-user" ? "Demo User" : userId,
      },
    });

    // Create paper record
    let paper;
    try {
      paper = await prisma.paper.create({
        data: {
          title: file.name.replace(/\.pdf$/i, ""),
          fileName: fileName,
          fileSize: file.size,
          fileUrl: fileUrl,
          pageCount: 0,
          userId,
          status: "reading",
        },
      });
    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      console.error("DB create failed:", dbError);
      return NextResponse.json(
        { error: `DB create failed: ${msg}` },
        { status: 500 }
      );
    }

    // Create initial reading session
    try {
      await prisma.readingSession.create({
        data: {
          paperId: paper.id,
          userId,
          mode: "free",
        },
      });
    } catch (dbError) {
      console.error("Session create failed:", dbError);
      // Paper is created, session is not critical
    }

    // 导入即分析：响应返回后再异步跑 PDF 提取 + 结构分析
    // 失败只记日志，不影响已上传的 paper
    after(() =>
      analyzePaper(paper.id, userId).catch((e) =>
        console.error("[after] analyzePaper failed:", e)
      )
    );

    return NextResponse.json({ paper }, { status: 201 });
  } catch (error) {
    console.error("Upload outer error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${(error as Error)?.message || error}` },
      { status: 500 }
    );
  }
}

// GET /api/papers — list all papers for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "demo-user";

  try {
    const papers = await prisma.paper.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { annotations: true },
        },
      },
    });

    return NextResponse.json({ papers });
  } catch (error) {
    console.error("[papers GET] error:", error);
    // 返回空列表而非 500，避免前端整页白屏
    return NextResponse.json({ papers: [], error: "db_unavailable" }, { status: 200 });
  }
}

/**
 * 数据库 seed 脚本
 * 用法：npm run db:seed
 *
 * 创建一个 demo 用户和一篇 demo 论文记录（不实际上传 PDF），
 * 用于本地开发或新环境快速验证时间线/记录页能否渲染。
 *
 * 注意：需要先配置 DATABASE_URL（指向可写的 PostgreSQL）。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "demo-user";
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: "demo@learning-trace.app",
      name: "Demo User",
    },
  });

  // demo 论文：使用占位 fileUrl，便于时间线渲染（不指向真实 Blob）
  const existing = await prisma.paper.findFirst({
    where: { userId, title: "Attention Is All You Need (demo)" },
  });
  if (!existing) {
    const paper = await prisma.paper.create({
      data: {
        userId,
        title: "Attention Is All You Need (demo)",
        authors: "Vaswani et al.",
        fileName: "demo-attention.pdf",
        fileSize: 0,
        fileUrl: "demo://placeholder",
        pageCount: 15,
        extractedText: JSON.stringify([
          { page: 1, text: "We propose a new simple network architecture, the Transformer..." },
        ]),
        structure: JSON.stringify({
          sections: [
            { title: "Abstract", page: 1, type: "core", reason: "核心贡献总览" },
            { title: "Introduction", page: 1, type: "normal", reason: "背景动机" },
            { title: "Model Architecture", page: 2, type: "core", reason: "核心方法" },
            { title: "Experiments", page: 7, type: "normal", reason: "实验验证" },
            { title: "Conclusion", page: 14, type: "skip", reason: "可略读" },
          ],
        }),
        status: "reading",
      },
    });
    await prisma.readingSession.create({
      data: { paperId: paper.id, userId, mode: "free" },
    });
    console.log("✓ seeded demo paper:", paper.id);
  } else {
    console.log("✓ demo paper already exists, skip");
  }

  console.log("Seed done.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

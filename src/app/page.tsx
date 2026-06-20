import Link from "next/link";
import { FileText, Brain, Clock, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            AI-Powered Learning Journal
          </div>
          <h1 className="text-5xl font-bold text-stone-900 tracking-tight mb-4">
            学习轨迹
          </h1>
          <p className="text-xl text-stone-600 mb-2">
            每一次阅读都是一次思维旅行
          </p>
          <p className="text-stone-500 mb-8 max-w-2xl mx-auto">
            导入 PDF → AI 辅助阅读（解释、费曼问答、误区检测）→ 生成学习记录 → 一年后回看当年的学习过程
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/timeline"
              className="px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
            >
              进入时间线
            </Link>
            <Link
              href="/blog"
              className="px-6 py-3 bg-white text-stone-700 border border-stone-300 rounded-lg font-medium hover:bg-stone-50 transition-colors"
            >
              公开博客
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<FileText className="w-5 h-5" />}
            title="PDF 智能阅读"
            desc="完整 PDF 渲染 + AI 标注叠加层，保留论文原貌"
          />
          <FeatureCard
            icon={<Brain className="w-5 h-5" />}
            title="AI 阅读伴侣"
            desc="自动解释段落、出费曼题、检测误区、捕获 Aha Moment"
          />
          <FeatureCard
            icon={<Clock className="w-5 h-5" />}
            title="阅读阶段感知"
            desc="扫描/跳读/精读/回扫，AI 行为随阶段动态切换"
          />
          <FeatureCard
            icon={<BookOpen className="w-5 h-5" />}
            title="一年后回看"
            desc="重温笔记、误区记录和 Aha Moment，重新出题检验"
          />
        </div>
      </section>

      {/* Tech stack */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">
            Tech Stack
          </h2>
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            {["Next.js 16", "TypeScript", "Tailwind CSS", "Prisma", "SQLite/PostgreSQL", "PDF.js", "DeepSeek API", "NextAuth"].map((tech) => (
              <span key={tech} className="px-3 py-1 bg-stone-100 text-stone-600 rounded-md font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 bg-white border border-stone-200 rounded-xl hover:border-orange-300 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
    </div>
  );
}

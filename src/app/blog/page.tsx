"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Clock, MessageSquare, ArrowRight } from "lucide-react";

interface Paper {
  id: string;
  title: string;
  status: string;
  pageCount: number;
  fileName: string;
  createdAt: string;
  finalSummary: string | null;
  _count: { annotations: number };
}

export default function BlogPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublicPapers() {
      try {
        const res = await fetch("/api/papers");
        const data = await res.json();
        // For now show all papers; in production filter by isPublic: true
        setPapers(data.papers || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicPapers();
  }, []);

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="font-semibold text-stone-900">学习轨迹 · 博客</span>
          </Link>
          <Link
            href="/timeline"
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            我的论文 →
          </Link>
        </div>
      </header>

      {/* Blog list */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">公开学习记录</h1>
        <p className="text-stone-500 mb-10">
          每一篇都是一次完整的学习过程——不只是结论，还有标注、问答和误区记录。
        </p>

        {loading ? (
          <div className="text-center py-20 text-stone-400">加载中...</div>
        ) : papers.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-stone-200 mb-4" />
            <p className="text-stone-400 mb-2">还没有公开的学习记录</p>
            <Link
              href="/timeline"
              className="text-sm text-orange-600 hover:underline"
            >
              去导入第一篇论文 →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {papers.map((paper) => (
              <article
                key={paper.id}
                className="bg-white border border-stone-200 rounded-xl p-6 hover:border-stone-300 transition-colors"
              >
                <Link href={`/record/${paper.id}`} className="block group">
                  <div className="flex items-center gap-2 text-xs text-stone-400 mb-3">
                    <span>{new Date(paper.createdAt).toLocaleDateString("zh-CN")}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {paper.pageCount || "?"} 页
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {paper._count.annotations} 条标注
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold text-stone-900 mb-2 group-hover:text-orange-600 transition-colors">
                    {paper.title}
                  </h2>

                  {paper.finalSummary ? (
                    <p className="text-stone-600 leading-relaxed mb-4 line-clamp-3">
                      {paper.finalSummary}
                    </p>
                  ) : (
                    <p className="text-stone-400 italic mb-4">
                      阅读中... 暂无总结
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    查看完整学习记录
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

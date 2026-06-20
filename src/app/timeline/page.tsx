"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Clock, MessageSquare, ArrowRight } from "lucide-react";
import { UploadButton } from "@/components/upload-button";

interface Paper {
  id: string;
  title: string;
  status: string;
  pageCount: number;
  fileName: string;
  createdAt: string;
  _count: { annotations: number };
}

export default function TimelinePage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPapers();
  }, []);

  async function fetchPapers() {
    try {
      const res = await fetch("/api/papers");
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (err) {
      console.error("Failed to fetch papers:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleUploaded(paper: Paper) {
    setPapers((prev) => [paper, ...prev]);
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="font-semibold text-stone-900">学习轨迹</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-sm text-stone-500 hover:text-stone-900">
              公开博客
            </Link>
            <UploadButton onUploaded={handleUploaded} />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">我的学习轨迹</h1>
          <p className="text-stone-500">每一次阅读都是一次思维旅行 · 记录过程，而不只是结论</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-400">加载中...</div>
        ) : papers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-600 mb-2">还没有学习记录</h3>
            <p className="text-sm text-stone-400 mb-6">导入一篇 PDF 论文，开始你的学习之旅</p>
            <div className="inline-block">
              <UploadButton onUploaded={handleUploaded} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {papers.map((paper) => (
              <Link
                key={paper.id}
                href={`/reader/${paper.id}`}
                className="block p-5 bg-white border border-stone-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={paper.status} />
                      <span className="text-xs text-stone-400">
                        {new Date(paper.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-stone-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {paper.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {paper.pageCount || "?"} 页
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {paper._count.annotations} 条标注
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-orange-400 transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    reading: "bg-orange-50 text-orange-600 border-orange-200",
    completed: "bg-green-50 text-green-600 border-green-200",
    archived: "bg-stone-50 text-stone-400 border-stone-200",
  };
  const labels: Record<string, string> = {
    reading: "阅读中",
    completed: "已完成",
    archived: "已归档",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.reading}`}>
      {labels[status] || status}
    </span>
  );
}

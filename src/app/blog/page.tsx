"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Clock, MessageSquare, ArrowRight, ArrowLeft, PenLine, Eye } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  paper: { id: string; title: string };
}

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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"papers" | "posts">("posts");

  useEffect(() => {
    async function fetchData() {
      try {
        const [papersRes, postsRes] = await Promise.all([
          fetch("/api/papers"),
          fetch("/api/blog-posts"),
        ]);
        const papersData = await papersRes.json();
        const postsData = await postsRes.json();
        setPapers(papersData.papers || []);
        setBlogPosts(postsData.posts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-1">学习博客</h1>
            <p className="text-sm text-stone-500">从标注到文章，学习过程的沉淀</p>
          </div>
          <Link
            href="/timeline"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回时间线
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-8 border-b border-stone-200">
          <button
            onClick={() => setView("posts")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === "posts" ? "border-orange-500 text-orange-600" : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            博客文章 ({blogPosts.length})
          </button>
          <button
            onClick={() => setView("papers")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === "papers" ? "border-orange-500 text-orange-600" : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            学习记录 ({papers.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-400">加载中...</div>
        ) : view === "posts" ? (
          blogPosts.length === 0 ? (
            <div className="text-center py-20">
              <PenLine className="w-12 h-12 mx-auto text-stone-200 mb-4" />
              <p className="text-stone-400 mb-2">还没有博客文章</p>
              <p className="text-sm text-stone-400">
                在论文阅读页点击「博客」标签，让 AI 帮你把标注转化为文章
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {blogPosts.map((post) => (
                <article
                  key={post.id}
                  className="group p-6 bg-white border border-stone-200 rounded-xl hover:border-orange-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      post.status === "published"
                        ? "bg-green-50 text-green-600"
                        : "bg-stone-100 text-stone-400"
                    }`}>
                      {post.status === "published" ? "已发布" : "草稿"}
                    </span>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(post.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    <span className="text-xs text-stone-400">·</span>
                    <span className="text-xs text-stone-400">{post.paper.title}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-stone-900 mb-2 group-hover:text-orange-600 transition-colors">
                    {post.title}
                  </h2>
                  <Link
                    href={`/record/${post.paper.id}`}
                    className="flex items-center gap-1 text-sm text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    查看完整学习记录
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </article>
              ))}
            </div>
          )
        ) : (
          /* Papers view (same as before) */
          <div className="space-y-4">
            {papers.map((paper) => (
              <Link
                key={paper.id}
                href={`/record/${paper.id}`}
                className="group block p-6 bg-white border border-stone-200 rounded-xl hover:border-orange-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={paper.status} />
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(paper.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                  <span className="text-xs text-stone-400">·</span>
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {paper._count.annotations} 标注
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

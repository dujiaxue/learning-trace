import Link from "next/link";
import { FileText, Clock, MessageSquare } from "lucide-react";

export default function BlogPage() {
  // TODO: Fetch public papers from API
  const publicPosts = [
    {
      id: "demo",
      title: "Attention Is All You Need",
      date: "2025-06-15",
      readTime: "2h 32m",
      annotations: 8,
      excerpt: "通过阅读这篇论文，我理解了 Transformer 的核心架构：Self-Attention 机制如何替代 RNN 实现并行化...",
      tags: ["Transformer", "Attention", "NLP"],
    },
  ];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="font-semibold text-stone-900">学习轨迹 · 博客</span>
          </Link>
          <Link href="/timeline" className="text-sm text-stone-500 hover:text-stone-900">
            我的学习轨迹 →
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">公开学习记录</h1>
        <p className="text-stone-500 mb-8">学习过程本身就是内容资产</p>

        <div className="space-y-6">
          {publicPosts.map((post) => (
            <article
              key={post.id}
              className="p-6 bg-white border border-stone-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <div className="text-sm text-stone-400 mb-2">{post.date}</div>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">{post.title}</h2>
              <p className="text-stone-600 leading-relaxed mb-4">{post.excerpt}</p>
              <div className="flex items-center gap-4 text-sm text-stone-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readTime}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {post.annotations} 条标注
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                {post.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

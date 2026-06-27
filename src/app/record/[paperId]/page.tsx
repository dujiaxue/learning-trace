"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, AlertCircle, Sparkles, FileText, Eye, EyeOff, BookOpen, ChevronRight, Link2, PenLine, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface RecordAnnotation {
  id: string;
  type: string;
  pageNumber: number;
  position: string;
  textContent: string;
  noteContent?: string;
  isPublic: boolean;
  createdAt: string;
}

interface RecordPaper {
  id: string;
  title: string;
  pageCount: number;
  fileName: string;
  finalSummary: string | null;
  isPublic: boolean;
  annotations: RecordAnnotation[];
}

interface KnowledgeLink {
  id: string;
  concept: string;
  explanation: string;
  similarity: number;
  otherPaper: { id: string; title: string };
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  status: string;
}

export default function RecordPage() {
  const params = useParams<{ paperId: string }>();
  const router = useRouter();
  const [paper, setPaper] = useState<RecordPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"notes" | "stats" | "links" | "blog">("notes");
  const [selectedAnnotation, setSelectedAnnotation] = useState<RecordAnnotation | null>(null);
  const [knowledgeLinks, setKnowledgeLinks] = useState<KnowledgeLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogEditing, setBlogEditing] = useState(false);
  const [blogContent, setBlogContent] = useState("");

  useEffect(() => {
    async function fetchPaper() {
      try {
        const res = await fetch(`/api/papers/${params.paperId}`);
        const data = await res.json();
        setPaper(data.paper);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (params.paperId) fetchPaper();
  }, [params.paperId]);

  // Fetch knowledge links when links tab is opened
  useEffect(() => {
    if (sidebarTab === "links" && params.paperId && knowledgeLinks.length === 0 && !linksLoading) {
      fetchKnowledgeLinks();
    }
    if (sidebarTab === "blog" && params.paperId && !blogPost && !blogLoading) {
      fetchBlogPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarTab, params.paperId]);

  async function fetchKnowledgeLinks() {
    setLinksLoading(true);
    try {
      const res = await fetch(`/api/knowledge-links?paperId=${params.paperId}`);
      const data = await res.json();
      setKnowledgeLinks(data.links || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLinksLoading(false);
    }
  }

  async function generateKnowledgeLinks() {
    setLinksLoading(true);
    try {
      const res = await fetch("/api/ai/knowledge-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: params.paperId }),
      });
      const data = await res.json();
      if (data.links) {
        // Refetch to get structured data
        await fetchKnowledgeLinks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLinksLoading(false);
    }
  }

  async function fetchBlogPost() {
    setBlogLoading(true);
    try {
      const res = await fetch(`/api/blog-posts?paperId=${params.paperId}`);
      const data = await res.json();
      if (data.posts && data.posts.length > 0) {
        setBlogPost(data.posts[0]);
        setBlogContent(data.posts[0].content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBlogLoading(false);
    }
  }

  async function generateBlog() {
    setBlogLoading(true);
    try {
      const res = await fetch("/api/ai/generate-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: params.paperId }),
      });
      const data = await res.json();
      if (data.blogPost) {
        setBlogPost(data.blogPost);
        setBlogContent(data.blogPost.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBlogLoading(false);
    }
  }

  async function publishBlog() {
    if (!blogPost) return;
    try {
      await fetch("/api/blog-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: params.paperId,
          title: blogPost.title,
          content: blogContent,
          status: "published",
        }),
      });
      setBlogPost({ ...blogPost, status: "published" });
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
        <p className="text-stone-400 mb-4">论文不存在</p>
        <button onClick={() => router.push("/timeline")} className="text-orange-600 hover:underline">
          返回时间线
        </button>
      </div>
    );
  }

  const annotations = paper.annotations || [];
  const highlights = annotations.filter((a) => a.type === "highlight");
  const notes = annotations.filter((a) => a.type === "note");
  const feynmans = annotations.filter((a) => a.type === "feynman");
  const misconceptions = annotations.filter((a) => a.type === "misconception");
  const ahas = annotations.filter((a) => a.type === "aha");

  const colors: Record<string, string> = {
    highlight: "rgba(254, 243, 199, 0.4)",
    note: "rgba(219, 234, 254, 0.4)",
    feynman: "rgba(233, 213, 255, 0.4)",
    misconception: "rgba(254, 226, 226, 0.5)",
    aha: "rgba(254, 243, 199, 0.6)",
  };

  const borderColors: Record<string, string> = {
    highlight: "#F59E0B",
    note: "#3B82F6",
    feynman: "#8B5CF6",
    misconception: "#DC2626",
    aha: "#F59E0B",
  };

  // Group annotations by page
  const annotationsByPage = annotations.reduce((acc: Record<number, RecordAnnotation[]>, ann) => {
    const page = ann.pageNumber;
    if (!acc[page]) acc[page] = [];
    acc[page].push(ann);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-stone-100">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/timeline")} className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            返回时间线
          </button>
          <div className="h-4 w-px bg-stone-200" />
          <h1 className="font-semibold text-stone-900">{paper.title}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {annotations.length} 条标注
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {paper.pageCount || "?"} 页
          </span>
        </div>
      </header>

      {/* Main content: PDF + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF viewer (read-only, baked annotations) */}
        <div className="flex-1 overflow-auto bg-stone-200 p-6 flex flex-col items-center gap-4">
          <Document file={`/api/pdf?id=${paper.id}`} loading={<div className="text-stone-400">加载中...</div>}>
            {Array.from({ length: paper.pageCount || 0 }, (_, i) => {
              const pageNum = i + 1;
              const pageAnns = annotationsByPage[pageNum] || [];
              return (
                <div key={pageNum} className="relative bg-white shadow-lg mb-4" data-page={pageNum}>
                  <Page pageNumber={pageNum} scale={1.2} />
                  {/* Baked annotations */}
                  <div className="absolute inset-0 pointer-events-none" style={{ transform: "scale(1.2)", transformOrigin: "top left" }}>
                    {pageAnns.map((ann) => {
                      const parsed = JSON.parse(ann.position || '{"rects":[]}');
                      const rects: Array<{ x: number; y: number; width: number; height: number }> = parsed.rects || [];
                      return rects.map((rect, idx: number) => (
                        <div
                          key={`${ann.id}-${idx}`}
                          className="absolute pointer-events-auto cursor-pointer hover:opacity-80"
                          style={{
                            left: rect.x,
                            top: rect.y,
                            width: rect.width,
                            height: rect.height,
                            backgroundColor: colors[ann.type] || colors.highlight,
                            borderBottom: ann.type !== "highlight" ? `2px solid ${borderColors[ann.type]}` : "none",
                          }}
                          onClick={() => setSelectedAnnotation(ann)}
                        />
                      ));
                    })}
                  </div>
                  {/* Page number */}
                  <div className="absolute bottom-2 right-2 text-xs text-stone-300 bg-white/80 px-1.5 py-0.5 rounded">
                    {pageNum}
                  </div>
                </div>
              );
            })}
          </Document>
        </div>

        {/* Sidebar */}
        <aside className="w-[360px] flex-shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setSidebarTab("notes")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                sidebarTab === "notes" ? "border-orange-500 text-orange-600" : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              标注 ({annotations.length})
            </button>
            <button
              onClick={() => setSidebarTab("links")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                sidebarTab === "links" ? "border-orange-500 text-orange-600" : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              关联
            </button>
            <button
              onClick={() => setSidebarTab("stats")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                sidebarTab === "stats" ? "border-orange-500 text-orange-600" : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              统计
            </button>
            <button
              onClick={() => setSidebarTab("blog")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                sidebarTab === "blog" ? "border-orange-500 text-orange-600" : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              博客
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === "notes" && (
              <div className="space-y-4">
                {/* Aha Moments */}
                {ahas.length > 0 && (
                  <Section title="Aha Moment" icon={<Sparkles className="w-4 h-4 text-amber-500" />} items={ahas} onSelect={setSelectedAnnotation} />
                )}
                {/* Misconceptions */}
                {misconceptions.length > 0 && (
                  <Section title="误区记录" icon={<AlertCircle className="w-4 h-4 text-red-500" />} items={misconceptions} onSelect={setSelectedAnnotation} />
                )}
                {/* Feynman QAs */}
                {feynmans.length > 0 && (
                  <Section title="费曼问答" icon={<MessageSquare className="w-4 h-4 text-purple-500" />} items={feynmans} onSelect={setSelectedAnnotation} />
                )}
                {/* Notes */}
                {notes.length > 0 && (
                  <Section title="笔记" icon={<BookOpen className="w-4 h-4 text-blue-500" />} items={notes} onSelect={setSelectedAnnotation} />
                )}
                {/* Highlights */}
                {highlights.length > 0 && (
                  <Section title="高亮" icon={<FileText className="w-4 h-4 text-yellow-500" />} items={highlights} onSelect={setSelectedAnnotation} />
                )}
                {annotations.length === 0 && (
                  <div className="text-center text-stone-400 py-12 text-sm">
                    还没有标注记录
                  </div>
                )}
              </div>
            )}

            {sidebarTab === "stats" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="总标注" value={annotations.length} icon={<MessageSquare className="w-4 h-4" />} />
                  <StatCard label="费曼问答" value={feynmans.length} icon={<MessageSquare className="w-4 h-4" />} />
                  <StatCard label="误区" value={misconceptions.length} icon={<AlertCircle className="w-4 h-4" />} />
                  <StatCard label="Aha" value={ahas.length} icon={<Sparkles className="w-4 h-4" />} />
                </div>

                {/* Final summary */}
                {paper.finalSummary && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      我的理解
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{paper.finalSummary}</p>
                  </div>
                )}

                {/* Privacy status */}
                <div className="p-3 bg-stone-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-stone-500">公开状态</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${paper.isPublic ? "text-green-600" : "text-stone-400"}`}>
                    {paper.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {paper.isPublic ? "已公开" : "仅自己可见"}
                  </span>
                </div>
              </div>
            )}

            {/* Knowledge Links Tab */}
            {sidebarTab === "links" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase">
                    <Link2 className="w-4 h-4" />
                    知识关联
                  </div>
                  <button
                    onClick={generateKnowledgeLinks}
                    disabled={linksLoading}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {linksLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {linksLoading ? "分析中..." : "AI 关联"}
                  </button>
                </div>

                {linksLoading && knowledgeLinks.length === 0 && (
                  <div className="text-center py-8 text-sm text-stone-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    正在分析跨论文概念关联...
                  </div>
                )}

                {!linksLoading && knowledgeLinks.length === 0 && (
                  <div className="text-center py-8">
                    <Link2 className="w-8 h-8 mx-auto text-stone-200 mb-3" />
                    <p className="text-sm text-stone-400 mb-1">暂无知识关联</p>
                    <p className="text-xs text-stone-400">点击「AI 关联」分析这篇论文与你其他论文的概念连接</p>
                  </div>
                )}

                {knowledgeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 border border-stone-200 rounded-lg hover:border-orange-300 transition-colors cursor-pointer"
                    onClick={() => router.push(`/record/${link.otherPaper.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">
                        {link.concept}
                      </span>
                      <span className="text-xs text-stone-300">
                        {Math.round(link.similarity * 100)}% 相关
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mb-2 leading-relaxed">
                      {link.explanation}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                      <FileText className="w-3 h-3" />
                      {link.otherPaper.title}
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Blog Tab */}
            {sidebarTab === "blog" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase">
                    <PenLine className="w-4 h-4" />
                    博客文章
                  </div>
                  {blogPost && (
                    <button
                      onClick={generateBlog}
                      disabled={blogLoading}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {blogLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      重新生成
                    </button>
                  )}
                </div>

                {blogLoading && !blogPost && (
                  <div className="text-center py-8 text-sm text-stone-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    正在将标注转化为博客文章...
                  </div>
                )}

                {!blogLoading && !blogPost && (
                  <div className="text-center py-8">
                    <PenLine className="w-8 h-8 mx-auto text-stone-200 mb-3" />
                    <p className="text-sm text-stone-400 mb-1">还没有博客文章</p>
                    <p className="text-xs text-stone-400 mb-4">AI 会基于你的标注、费曼问答和总结，生成一篇结构化博客</p>
                    <button
                      onClick={generateBlog}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors mx-auto"
                    >
                      <Sparkles className="w-3 h-3" />
                      生成博客文章
                    </button>
                  </div>
                )}

                {blogPost && (
                  <div className="space-y-3">
                    {blogPost.status === "published" && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded">
                        <Eye className="w-3 h-3" />
                        已发布到博客
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBlogEditing(!blogEditing)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          blogEditing
                            ? "bg-orange-100 text-orange-600"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        <PenLine className="w-3 h-3" />
                        {blogEditing ? "预览" : "编辑"}
                      </button>
                      {blogPost.status !== "published" && (
                        <button
                          onClick={publishBlog}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-green-500 rounded-md hover:bg-green-600 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          发布
                        </button>
                      )}
                    </div>

                    {blogEditing ? (
                      <textarea
                        value={blogContent}
                        onChange={(e) => setBlogContent(e.target.value)}
                        className="w-full h-96 p-3 text-xs font-mono border border-stone-200 rounded-md resize-none focus:outline-none focus:border-orange-400"
                      />
                    ) : (
                      <div className="p-3 bg-stone-50 rounded-lg text-sm text-stone-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {blogContent}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Annotation detail modal */}
      {selectedAnnotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedAnnotation(null)}>
          <div className="bg-white rounded-xl shadow-xl w-[480px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
              <span className="text-sm font-medium text-stone-700">
                第 {selectedAnnotation.pageNumber} 页
              </span>
              <button onClick={() => setSelectedAnnotation(null)} className="text-stone-400 hover:text-stone-600 text-sm">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {selectedAnnotation.textContent && (
                <div className="p-3 bg-stone-50 rounded-lg text-sm text-stone-600 italic">&ldquo;{selectedAnnotation.textContent}&rdquo;</div>
              )}
              {selectedAnnotation.noteContent && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-stone-700">{selectedAnnotation.noteContent}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, items, onSelect }: { title: string; icon: React.ReactNode; items: RecordAnnotation[]; onSelect: (a: RecordAnnotation) => void }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase mb-2 pb-1 border-b border-stone-100">
        {icon}
        {title} ({items.length})
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left p-2.5 rounded-lg border border-stone-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-stone-400">第 {item.pageNumber} 页</span>
              <ChevronRight className="w-3 h-3 text-stone-300" />
            </div>
            <div className="text-sm text-stone-600 line-clamp-2">
              {item.textContent || item.noteContent || "(无文字)"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="p-3 bg-stone-50 rounded-lg text-center">
      <div className="flex items-center justify-center text-stone-400 mb-1">{icon}</div>
      <div className="text-xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-400">{label}</div>
    </div>
  );
}

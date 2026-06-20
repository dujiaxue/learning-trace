"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, MessageSquare, AlertCircle, Sparkles, FileText, Eye, EyeOff, BookOpen, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function RecordPage() {
  const params = useParams<{ paperId: string }>();
  const router = useRouter();
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"notes" | "stats">("notes");
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);

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
  const highlights = annotations.filter((a: any) => a.type === "highlight");
  const notes = annotations.filter((a: any) => a.type === "note");
  const feynmans = annotations.filter((a: any) => a.type === "feynman");
  const misconceptions = annotations.filter((a: any) => a.type === "misconception");
  const ahas = annotations.filter((a: any) => a.type === "aha");

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
  const annotationsByPage = annotations.reduce((acc: Record<number, any[]>, ann: any) => {
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
          <Document file={paper.fileUrl} loading={<div className="text-stone-400">加载中...</div>}>
            {Array.from({ length: paper.pageCount || 0 }, (_, i) => {
              const pageNum = i + 1;
              const pageAnns = annotationsByPage[pageNum] || [];
              return (
                <div key={pageNum} className="relative bg-white shadow-lg mb-4" data-page={pageNum}>
                  <Page pageNumber={pageNum} scale={1.2} />
                  {/* Baked annotations */}
                  <div className="absolute inset-0 pointer-events-none" style={{ transform: "scale(1.2)", transformOrigin: "top left" }}>
                    {pageAnns.map((ann: any) => {
                      const parsed = JSON.parse(ann.position || '{"rects":[]}');
                      const rects = parsed.rects || [];
                      return rects.map((rect: any, idx: number) => (
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
              标注列表 ({annotations.length})
            </button>
            <button
              onClick={() => setSidebarTab("stats")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                sidebarTab === "stats" ? "border-orange-500 text-orange-600" : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              学习统计
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
                <div className="p-3 bg-stone-50 rounded-lg text-sm text-stone-600 italic">"{selectedAnnotation.textContent}"</div>
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

function Section({ title, icon, items, onSelect }: { title: string; icon: React.ReactNode; items: any[]; onSelect: (a: any) => void }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase mb-2 pb-1 border-b border-stone-100">
        {icon}
        {title} ({items.length})
      </div>
      <div className="space-y-1.5">
        {items.map((item: any) => (
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

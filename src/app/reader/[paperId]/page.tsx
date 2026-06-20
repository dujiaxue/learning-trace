"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, Clock, MessageSquare } from "lucide-react";
import { PdfViewer, type Annotation, type HighlightRect } from "@/components/pdf/pdf-viewer";
import { AIPanel, type AICardData } from "@/components/ai/ai-panel";

export default function ReaderPage() {
  const params = useParams<{ paperId: string }>();
  const router = useRouter();

  const [paper, setPaper] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiCards, setAiCards] = useState<AICardData[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedRects, setSelectedRects] = useState<HighlightRect[]>([]);
  const [aiStatus, setAiStatus] = useState("AI 阅读伴侣 · 正在跟随你的阅读");
  const [aiStatusIcon, setAiStatusIcon] = useState<"idle" | "thinking" | "alert" | "quiz">("idle");
  const [readingTime, setReadingTime] = useState(0);

  // Fetch paper data
  useEffect(() => {
    async function fetchPaper() {
      try {
        const res = await fetch(`/api/papers/${params.paperId}`);
        const data = await res.json();
        if (data.paper) {
          setPaper(data.paper);
          // Transform DB annotations to component format
          const transformed: Annotation[] = (data.paper.annotations || []).map((a: any) => ({
            id: a.id,
            type: a.type,
            pageNumber: a.pageNumber,
            rects: a.position ? JSON.parse(a.position).rects || [] : [],
            textContent: a.textContent || "",
            noteContent: a.noteContent || "",
            isPublic: a.isPublic || false,
            createdAt: a.createdAt,
          }));
          setAnnotations(transformed);
        }
      } catch (err) {
        console.error("Failed to fetch paper:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPaper();
  }, [params.paperId]);

  // Reading timer
  useEffect(() => {
    const timer = setInterval(() => setReadingTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // Handle text selection
  const handleTextSelect = useCallback((text: string, pageNumber: number, rects: HighlightRect[]) => {
    setSelectedText(text);
    setSelectedPage(pageNumber);
    setSelectedRects(rects);
  }, []);

  // Handle annotation click
  const handleAnnotationClick = useCallback((ann: Annotation) => {
    setAiCards((prev) => [
      ...prev,
      {
        id: `info-${ann.id}-${Date.now()}`,
        type: "info",
        title: `标注 · 第${ann.pageNumber}页`,
        body: ann.textContent
          ? `原文：${ann.textContent.slice(0, 200)}...\n\n笔记：${ann.noteContent || "无"}`
          : ann.noteContent || "无内容",
      },
    ]);
  }, []);

  // AI Explain
  const handleExplain = useCallback(async (text: string, pageNumber: number) => {
    const cardId = `explain-${Date.now()}`;
    setAiStatus("正在生成解释…");
    setAiStatusIcon("thinking");
    setAiCards((prev) => [
      ...prev,
      { id: cardId, type: "explain", title: "AI 解释", body: "", loading: true },
    ]);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperTitle: paper?.title || "",
          pageNumber,
          textContent: text,
          paperId: params.paperId,
        }),
      });
      const data = await res.json();

      setAiCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, body: data.explanation, loading: false }
            : c
        )
      );

      // Save as annotation
      await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: params.paperId,
          type: "highlight",
          pageNumber,
          position: { rects: selectedRects },
          textContent: text,
          note: `AI 解释: ${data.explanation?.slice(0, 100)}...`,
          aiGenerated: true,
        }),
      });
    } catch (err) {
      setAiCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, body: "解释生成失败，请重试", loading: false }
            : c
        )
      );
    }
    setAiStatus("AI 阅读伴侣 · 正在跟随你的阅读");
    setAiStatusIcon("idle");
    setSelectedText("");
  }, [paper, params.paperId, selectedRects]);

  // AI Quiz
  const handleQuiz = useCallback(async (text: string, pageNumber: number) => {
    const cardId = `quiz-${Date.now()}`;
    setAiStatus("正在出题…");
    setAiStatusIcon("quiz");
    setAiCards((prev) => [
      ...prev,
      { id: cardId, type: "quiz", title: "费曼问答", body: "", loading: true, quizId: cardId },
    ]);

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperTitle: paper?.title || "",
          textContent: text,
          paperId: params.paperId,
        }),
      });
      const data = await res.json();

      setAiCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, body: data.question, question: data.question, loading: false }
            : c
        )
      );
    } catch (err) {
      setAiCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, body: "出题失败，请重试", loading: false }
            : c
        )
      );
    }
    setAiStatus("正在等待你回答…");
    setAiStatusIcon("quiz");
  }, [paper, params.paperId]);

  // AI Evaluate
  const handleEvaluate = useCallback(async (quizId: string, question: string, answer: string, context?: string) => {
    const cardId = `eval-${Date.now()}`;
    setAiStatus("正在评估你的回答…");
    setAiStatusIcon("thinking");
    setAiCards((prev) =>
      prev.map((c) => (c.id === quizId ? { ...c, userAnswer: answer, body: `你的回答：${answer}` } : c))
    );
    setAiCards((prev) => [
      ...prev,
      { id: cardId, type: "evaluate", title: "AI 评估", body: "", loading: true },
    ]);

    try {
      const res = await fetch("/api/ai/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          userAnswer: answer,
          context,
          paperId: params.paperId,
          annotationId: quizId,
        }),
      });
      const data = await res.json();

      setAiCards((prev) =>
        prev.map((c) => {
          if (c.id === cardId) {
            return { ...c, body: data.evaluation, loading: false, score: data.score };
          }
          if (c.id === quizId) {
            return { ...c, score: data.score };
          }
          return c;
        })
      );

      // If misconception, add alert card
      if (data.score === "misconception") {
        setAiStatusIcon("alert");
        setAiStatus("⚠ 检测到误区，请查看评估");
      } else {
        setAiStatus("AI 阅读伴侣 · 正在跟随你的阅读");
        setAiStatusIcon("idle");
      }
    } catch (err) {
      setAiCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, body: "评估失败，请重试", loading: false }
            : c
        )
      );
    }
    setAiStatus("AI 阅读伴侣 · 正在跟随你的阅读");
    setAiStatusIcon("idle");
  }, [params.paperId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-50">
        <p className="text-stone-400 mb-4">论文未找到</p>
        <button onClick={() => router.push("/timeline")} className="text-orange-500 hover:underline">
          返回时间线
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-stone-200">
        <button
          onClick={() => router.push("/timeline")}
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft className="w-4 h-4" />
          返回时间线
        </button>
        <h1 className="text-sm font-medium text-stone-900 truncate max-w-md">{paper.title}</h1>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(readingTime)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {annotations.length} 标注
          </span>
        </div>
      </header>

      {/* Main content: PDF + AI Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <PdfViewer
            fileUrl={paper.fileUrl}
            annotations={annotations}
            onTextSelect={handleTextSelect}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationCreate={async () => {}}
          />
        </div>
        <div className="w-[400px] flex-shrink-0">
          <AIPanel
            cards={aiCards}
            onExplain={handleExplain}
            onQuiz={handleQuiz}
            onEvaluate={handleEvaluate}
            selectedText={selectedText}
            selectedPage={selectedPage}
            status={aiStatus}
            statusIcon={aiStatusIcon}
          />
        </div>
      </div>
    </div>
  );
}

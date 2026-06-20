"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Clock, MessageSquare } from "lucide-react";
import { PdfViewer, type Annotation, type HighlightRect } from "@/components/pdf/pdf-viewer";
import { AIPanel, type AICardData } from "@/components/ai/ai-panel";
import { AnnotationDetail } from "@/components/reader/annotation-detail";
import { NoteInput } from "@/components/reader/note-input";
import { SessionTracker } from "@/components/reader/session-tracker";

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
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalPages: 0,
    currentPage: 1,
    dwellTime: {} as Record<number, number>,
    totalTime: 0,
    annotationCount: 0,
    phase: "scan" as "scan" | "skim" | "deep" | "back",
  });

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setSessionStats((prev) => ({ ...prev, totalTime: prev.totalTime + 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch paper
  useEffect(() => {
    async function fetchPaper() {
      try {
        const res = await fetch(`/api/papers/${params.paperId}`);
        const data = await res.json();
        setPaper(data.paper);
        const mapped = (data.paper?.annotations || []).map((a: any) => ({
          id: a.id,
          type: a.type,
          pageNumber: a.pageNumber,
          rects: JSON.parse(a.position || '{"rects":[]}').rects || [],
          textContent: a.textContent || "",
          noteContent: a.noteContent || "",
          isPublic: a.isPublic,
          createdAt: a.createdAt,
        }));
        setAnnotations(mapped);
        setSessionStats((prev) => ({
          ...prev,
          totalPages: data.paper?.pageCount || 0,
          annotationCount: mapped.length,
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (params.paperId) fetchPaper();
  }, [params.paperId]);

  // Handle text selection on PDF
  const handleTextSelect = useCallback((text: string, pageNumber: number, rects: HighlightRect[]) => {
    setSelectedText(text);
    setSelectedPage(pageNumber);
    setSelectedRects(rects);
    setShowNoteInput(false);
  }, []);

  // AI Explain
  const handleExplain = useCallback(async () => {
    if (!selectedText || !paper) return;

    const cardId = `explain-${Date.now()}`;
    setAiCards((prev) => [...prev, { id: cardId, type: "explain", title: "AI 解释", body: "", loading: true }]);
    setAiStatus("thinking");
    setAiStatusIcon("thinking");
    setAiStatus("正在生成解释…");

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperTitle: paper.title,
          pageNumber: selectedPage,
          textContent: selectedText,
          paperId: paper.id,
        }),
      });
      const data = await res.json();

      setAiCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, body: data.explanation, loading: false } : c))
      );
      setAiStatus("idle");
      setAiStatusIcon("idle");
      setAiStatus("AI 阅读伴侣 · 正在跟随你的阅读");
    } catch (err) {
      setAiCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, body: "解释生成失败，请稍后重试", loading: false } : c))
      );
      setAiStatus("idle");
      setAiStatusIcon("idle");
    }
  }, [selectedText, selectedPage, paper]);

  // AI Quiz
  const handleQuiz = useCallback(async () => {
    if (!selectedText || !paper) return;

    const cardId = `quiz-${Date.now()}`;
    setAiCards((prev) => [...prev, { id: cardId, type: "quiz", title: "费曼问答", body: "", loading: true, quizId: cardId }]);
    setAiStatus("thinking");
    setAiStatusIcon("quiz");
    setAiStatus("正在出题…");

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperTitle: paper.title,
          textContent: selectedText,
          paperId: paper.id,
        }),
      });
      const data = await res.json();

      setAiCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, body: data.question, question: data.question, loading: false } : c))
      );
      setAiStatus("quiz");
      setAiStatus("正在等待你回答…");
    } catch (err) {
      setAiCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, body: "出题失败，请稍后重试", loading: false } : c))
      );
      setAiStatus("idle");
      setAiStatusIcon("idle");
    }
  }, [selectedText, paper]);

  // AI Evaluate
  const handleEvaluate = useCallback(async (quizId: string, question: string, answer: string, context?: string) => {
    const evalCardId = `eval-${Date.now()}`;
    setAiCards((prev) => [...prev, { id: evalCardId, type: "evaluate", title: "AI 评估", body: "", loading: true }]);
    setAiStatus("thinking");
    setAiStatus("正在评估你的回答…");

    try {
      const res = await fetch("/api/ai/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          userAnswer: answer,
          context: context || selectedText,
          paperId: paper?.id,
          annotationId: quizId,
        }),
      });
      const data = await res.json();

      setAiCards((prev) =>
        prev.map((c) => (c.id === evalCardId ? { ...c, body: data.evaluation, score: data.score, loading: false } : c))
      );
      setAiStatus("idle");
      setAiStatusIcon("idle");
      setAiStatus("AI 阅读伴侣 · 正在跟随你的阅读");
    } catch (err) {
      setAiCards((prev) =>
        prev.map((c) => (c.id === evalCardId ? { ...c, body: "评估失败", loading: false } : c))
      );
      setAiStatus("idle");
      setAiStatusIcon("idle");
    }
  }, [selectedText, paper]);

  // Create annotation
  const handleAnnotationCreate = useCallback(async (data: { type: string; pageNumber: number; rects: HighlightRect[]; textContent: string; note?: string }) => {
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: params.paperId,
          type: data.type,
          pageNumber: data.pageNumber,
          position: { rects: data.rects },
          textContent: data.textContent,
          note: data.note,
        }),
      });
      const result = await res.json();
      const newAnn: Annotation = {
        id: result.annotation.id,
        type: result.annotation.type,
        pageNumber: result.annotation.pageNumber,
        rects: JSON.parse(result.annotation.position).rects || [],
        textContent: result.annotation.textContent || "",
        noteContent: result.annotation.noteContent || "",
        isPublic: result.annotation.isPublic,
        createdAt: result.annotation.createdAt,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSessionStats((prev) => ({ ...prev, annotationCount: prev.annotationCount + 1 }));
    } catch (err) {
      console.error("Failed to create annotation:", err);
    }
  }, [params.paperId]);

  // Delete annotation
  const handleAnnotationDelete = useCallback(async (id: string) => {
    // TODO: Add DELETE /api/annotations/[id]
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setSessionStats((prev) => ({ ...prev, annotationCount: prev.annotationCount - 1 }));
  }, []);

  // Toggle public
  const handleTogglePublic = useCallback(async (id: string, isPublic: boolean) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, isPublic } : a)));
    // TODO: Add PATCH /api/annotations/[id]
  }, []);

  // Save note
  const handleSaveNote = useCallback((note: string) => {
    handleAnnotationCreate({
      type: "note",
      pageNumber: selectedPage,
      rects: selectedRects,
      textContent: selectedText,
      note,
    });
    setShowNoteInput(false);
    setSelectedText("");
  }, [handleAnnotationCreate, selectedPage, selectedRects, selectedText]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/timeline")} className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h1 className="font-semibold text-stone-900 text-sm">{paper.title}</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(sessionStats.totalTime)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {annotations.length}
          </span>
          <button
            onClick={() => router.push(`/record/${paper.id}`)}
            className="px-3 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-200"
          >
            查看学习记录 →
          </button>
        </div>
      </header>

      {/* Main: PDF + AI Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <PdfViewer
            fileUrl={paper.fileUrl}
            annotations={annotations}
            onTextSelect={handleTextSelect}
            onAnnotationClick={setSelectedAnnotation}
            onAnnotationCreate={handleAnnotationCreate}
          />

          {/* Note input overlay */}
          <NoteInput
            open={showNoteInput}
            selectedText={selectedText}
            pageNumber={selectedPage}
            onClose={() => setShowNoteInput(false)}
            onSave={handleSaveNote}
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

      {/* Session tracker */}
      <SessionTracker stats={sessionStats} />

      {/* Annotation detail modal */}
      <AnnotationDetail
        annotation={selectedAnnotation}
        onClose={() => setSelectedAnnotation(null)}
        onDelete={handleAnnotationDelete}
        onTogglePublic={handleTogglePublic}
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

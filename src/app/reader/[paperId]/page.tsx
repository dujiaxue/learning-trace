"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Clock, MessageSquare } from "lucide-react";
import { PdfViewer, type Annotation, type HighlightRect } from "@/components/pdf/pdf-viewer";
import { AIPanel, type AICardData } from "@/components/ai/ai-panel";
import { AnnotationDetail } from "@/components/reader/annotation-detail";
import { NoteInput } from "@/components/reader/note-input";
import { SessionTracker } from "@/components/reader/session-tracker";

// 阶段自动触发的冷却时间（毫秒），避免同一阶段反复弹卡片
const DEEP_AUTO_QUIZ_COOLDOWN = 60_000; // 精读 60s 后自动出题
const BACK_AUTO_MISCONCEPTION_COOLDOWN = 45_000; // 回扫 45s 后自动提示误区

export default function ReaderPage() {
  const params = useParams<{ paperId: string }>();
  const router = useRouter();

  const [paper, setPaper] = useState<{ id: string; title: string; pageCount: number; fileName: string } | null>(null);
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

  // 阶段自动触发相关 ref
  const deepPhaseStartRef = useRef<number | null>(null);
  const backPhaseStartRef = useRef<number | null>(null);
  const lastAutoQuizAtRef = useRef<number>(0);
  const lastAutoMisconceptionAtRef = useRef<number>(0);
  const autoQuizTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoMisconceptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paperRef = useRef<typeof paper>(null);
  useEffect(() => {
    paperRef.current = paper;
  }, [paper]);

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
        const mapped: Annotation[] = (data.paper?.annotations || []).map((a: {
          id: string;
          type: "highlight" | "note" | "feynman" | "misconception" | "aha";
          pageNumber: number;
          position: string;
          textContent: string;
          noteContent: string;
          isPublic: boolean;
          createdAt: string;
        }) => ({
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
    } catch {
      setAiCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, body: "解释生成失败，请稍后重试", loading: false } : c))
      );
      setAiStatus("idle");
      setAiStatusIcon("idle");
    }
  }, [selectedText, selectedPage, paper]);

  // AI Quiz —— 支持手动和阶段自动两种来源
  const handleQuiz = useCallback(async (opts?: { autoTriggered?: boolean; contextText?: string }) => {
    const textForQuiz = opts?.contextText ?? selectedText;
    if (!textForQuiz || !paper) return;

    const isAuto = !!opts?.autoTriggered;
    const cardId = `quiz-${Date.now()}`;
    setAiCards((prev) => [
      ...prev,
      {
        id: cardId,
        type: "quiz",
        title: isAuto ? "精读检测 · 自动出题" : "费曼问答",
        body: "",
        loading: true,
        quizId: cardId,
      },
    ]);
    setAiStatus("thinking");
    setAiStatusIcon("quiz");
    setAiStatus(isAuto ? "精读中检测到重点，自动出题…" : "正在出题…");

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperTitle: paper.title,
          textContent: textForQuiz,
          paperId: paper.id,
          trigger: isAuto ? "auto-phase-deep" : "manual",
        }),
      });
      const data = await res.json();

      setAiCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                body: data.question,
                question: data.question,
                loading: false,
                // 后端创建的 FeynmanQA 记录 id，evaluate 时回传
                quizId: data.feynmanQAId || cardId,
              }
            : c
        )
      );
      setAiStatus("quiz");
      setAiStatus("正在等待你回答…");
      if (isAuto) lastAutoQuizAtRef.current = Date.now();
    } catch {
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
    } catch {
      setAiCards((prev) =>
        prev.map((c) => (c.id === evalCardId ? { ...c, body: "评估失败", loading: false } : c))
      );
      setAiStatus("idle");
      setAiStatusIcon("idle");
    }
  }, [selectedText, paper]);

  // AI 误区检测 —— 回扫阶段自动触发，也可手动调用
  const handleMisconception = useCallback(async (opts?: { autoTriggered?: boolean; contextText?: string; pageNumber?: number }) => {
    const p = paperRef.current;
    const text = opts?.contextText ?? selectedText;
    if (!text || !p) return;

    const isAuto = !!opts?.autoTriggered;
    const cardId = `misc-${Date.now()}`;
    setAiCards((prev) => [
      ...prev,
      { id: cardId, type: "alert", title: isAuto ? "回扫提示 · 误区检测" : "误区检测", body: "", loading: true },
    ]);
    setAiStatusIcon("alert");
    setAiStatus(isAuto ? "检测到回扫，正在检查误区…" : "正在检测误区…");

    try {
      const res = await fetch("/api/ai/misconception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperTitle: p.title,
          textContent: text,
          pageNumber: opts?.pageNumber ?? selectedPage,
          paperId: p.id,
        }),
      });
      const data = await res.json();
      // 若 AI 判定无误区，则给一条轻提示后撤卡片
      const body = data.hasMisconception
        ? data.misconception
        : "✓ 这段没有常见误区，继续放心阅读";
      setAiCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, body, loading: false } : c)));
      setAiStatusIcon("idle");
      setAiStatus("AI 阅读伴侣 · 正在跟随你的阅读");
      if (isAuto) lastAutoMisconceptionAtRef.current = Date.now();
    } catch {
      setAiCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, body: "误区检测失败", loading: false } : c))
      );
      setAiStatusIcon("idle");
      setAiStatus("AI 阅读伴侣 · 正在跟随你的阅读");
    }
  }, [selectedText, selectedPage]);

  // 会话结束总结 —— 离开页面时触发（仅当有标注或阅读时长 > 60s）
  useEffect(() => {
    const paperId = paperRef.current?.id;
    return () => {
      if (!paperId) return;
      const stats = sessionStats;
      const worth = stats.annotationCount > 0 || stats.totalTime > 60;
      if (!worth) return;
      // 用 sendBeacon 不可靠（要等 AI 返回写库），改用 fetch + keepalive
      try {
        fetch("/api/ai/final-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paperId }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // ignore
      }
    };
    // 仅在 unmount 时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper?.id]);

  // 阶段驱动 AI 自动触发：deep 持续 → 自动出题；back 持续 → 自动提示误区
  useEffect(() => {
    const phase = sessionStats.phase;
    const now = Date.now();

    // 清理对方的定时器
    if (phase !== "deep") {
      if (autoQuizTimerRef.current) {
        clearTimeout(autoQuizTimerRef.current);
        autoQuizTimerRef.current = null;
      }
      deepPhaseStartRef.current = null;
    }
    if (phase !== "back") {
      if (autoMisconceptionTimerRef.current) {
        clearTimeout(autoMisconceptionTimerRef.current);
        autoMisconceptionTimerRef.current = null;
      }
      backPhaseStartRef.current = null;
    }

    if (phase === "deep" && deepPhaseStartRef.current === null) {
      deepPhaseStartRef.current = now;
      // 冷却内不再弹
      if (now - lastAutoQuizAtRef.current > DEEP_AUTO_QUIZ_COOLDOWN) {
        // 用当前选中文字或最近标注文本作为出题上下文
        const ctx = selectedText || annotations[annotations.length - 1]?.textContent || "";
        if (ctx) {
          autoQuizTimerRef.current = setTimeout(() => {
            handleQuiz({ autoTriggered: true, contextText: ctx });
          }, 8000); // 进入精读 8s 后再出题，避免误判
        }
      }
    }

    if (phase === "back" && backPhaseStartRef.current === null) {
      backPhaseStartRef.current = now;
      if (now - lastAutoMisconceptionAtRef.current > BACK_AUTO_MISCONCEPTION_COOLDOWN) {
        const ctx = selectedText || annotations[annotations.length - 1]?.textContent || "";
        if (ctx) {
          autoMisconceptionTimerRef.current = setTimeout(() => {
            handleMisconception({
              autoTriggered: true,
              contextText: ctx,
              pageNumber: sessionStats.currentPage,
            });
          }, 5000);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStats.phase]);

  // 滚动相位检测：监听 PDF 滚动容器，更新 sessionStats.phase
  // （SessionTracker 组件内部也有检测但不回传，这里在 reader 层独立维护一份）
  useEffect(() => {
    let lastScrollTop = 0;
    let lastScrollTime = Date.now();

    function findScrollContainer(): HTMLElement | null {
      // PdfViewer 内部 overflow-auto 容器
      const candidates = document.querySelectorAll(".flex-1.overflow-auto");
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i] as HTMLElement;
        if (el.scrollHeight > el.clientHeight + 50) return el;
      }
      return null;
    }

    function onScroll() {
      const container = findScrollContainer();
      if (!container) return;
      const now = Date.now();
      const dt = (now - lastScrollTime) / 1000;
      const scrollTop = container.scrollTop;
      const scrollDelta = Math.abs(scrollTop - lastScrollTop);
      const speed = scrollDelta / Math.max(dt, 0.1);

      setSessionStats((prev) => {
        let phase = prev.phase;
        if (scrollTop < lastScrollTop - 80) {
          phase = "back";
        } else if (speed > 800) {
          phase = "scan";
        } else if (speed > 200) {
          phase = "skim";
        } else if (speed > 10) {
          phase = "deep";
        }
        // 更新当前页（按滚动位置估算）
        const totalPages = prev.totalPages || 1;
        const ratio = scrollTop / Math.max(container.scrollHeight - container.clientHeight, 1);
        const currentPage = Math.min(totalPages, Math.max(1, Math.ceil(ratio * totalPages)));
        return phase === prev.phase && currentPage === prev.currentPage
          ? prev
          : { ...prev, phase, currentPage };
      });

      lastScrollTop = scrollTop;
      lastScrollTime = now;
    }

    // 延迟绑定，等 PdfViewer 渲染完
    const bindTimer = setTimeout(() => {
      const container = findScrollContainer();
      if (container) {
        container.addEventListener("scroll", onScroll, { passive: true });
      }
    }, 1500);

    return () => {
      clearTimeout(bindTimer);
      const container = findScrollContainer();
      if (container) container.removeEventListener("scroll", onScroll);
    };
  }, [paper?.id]);

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
            fileUrl={`/api/pdf?id=${paper.id}`}
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
            onQuiz={(text, _pageNumber) => handleQuiz({ contextText: text })}
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

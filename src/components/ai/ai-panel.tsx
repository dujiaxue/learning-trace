"use client";

import { useState } from "react";
import { Sparkles, HelpCircle, AlertCircle, Loader2, Send, Check } from "lucide-react";

export type AICardType = "explain" | "quiz" | "evaluate" | "alert" | "aha" | "info";

export interface AICardData {
  id: string;
  type: AICardType;
  title: string;
  body: string;
  loading?: boolean;
  // For quiz cards
  quizId?: string;
  question?: string;
  userAnswer?: string;
  score?: "good" | "partial" | "misconception";
}

interface AIPanelProps {
  cards: AICardData[];
  onExplain: (text: string, pageNumber: number) => void;
  onQuiz: (text: string, pageNumber: number) => void;
  onEvaluate: (quizId: string, question: string, answer: string, context?: string) => void;
  selectedText: string;
  selectedPage: number;
  status: string;
  statusIcon: "idle" | "thinking" | "alert" | "quiz";
}

export function AIPanel({
  cards,
  onExplain,
  onQuiz,
  onEvaluate,
  selectedText,
  selectedPage,
  status,
  statusIcon,
}: AIPanelProps) {
  const [quizAnswer, setQuizAnswer] = useState<Record<string, string>>({});

  const icons: Record<AICardType, React.ReactNode> = {
    explain: <Sparkles className="w-4 h-4 text-orange-500" />,
    quiz: <HelpCircle className="w-4 h-4 text-purple-500" />,
    evaluate: <Check className="w-4 h-4 text-green-500" />,
    alert: <AlertCircle className="w-4 h-4 text-red-500" />,
    aha: <Sparkles className="w-4 h-4 text-yellow-500" />,
    info: <Sparkles className="w-4 h-4 text-stone-400" />,
  };

  const borders: Record<AICardType, string> = {
    explain: "border-orange-200 bg-orange-50/50",
    quiz: "border-purple-200 bg-purple-50/50",
    evaluate: "border-green-200 bg-green-50/50",
    alert: "border-red-200 bg-red-50/50",
    aha: "border-yellow-300 bg-yellow-50/50",
    info: "border-stone-200 bg-stone-50/50",
  };

  const statusDots: Record<string, string> = {
    idle: "bg-green-400",
    thinking: "bg-orange-400 animate-pulse",
    alert: "bg-red-400 animate-pulse",
    quiz: "bg-purple-400 animate-pulse",
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-stone-200">
      {/* AI Status Bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200 bg-stone-50">
        <span className={`w-2 h-2 rounded-full ${statusDots[statusIcon]}`} />
        <span className="text-sm font-medium text-stone-600">{status}</span>
      </div>

      {/* Selected text toolbar */}
      {selectedText && (
        <div className="p-3 border-b border-stone-200 bg-orange-50/30">
          <div className="text-xs text-stone-400 mb-1">已选中第 {selectedPage} 页文字：</div>
          <div className="text-sm text-stone-700 line-clamp-3 italic mb-2">
            &ldquo;{selectedText.slice(0, 120)}{selectedText.length > 120 ? "..." : ""}&rdquo;
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onExplain(selectedText, selectedPage)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              AI 解释
            </button>
            <button
              onClick={() => onQuiz(selectedText, selectedPage)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50 transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              费曼出题
            </button>
          </div>
        </div>
      )}

      {/* AI Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {cards.length === 0 && !selectedText && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Sparkles className="w-8 h-8 text-stone-300 mb-3" />
            <p className="text-sm text-stone-400 mb-1">AI 阅读伴侣</p>
            <p className="text-xs text-stone-400">
              选中 PDF 中的文字，我会帮你解释或出题考你。
            </p>
          </div>
        )}

        {cards.map((card) => (
          <div key={card.id} className={`p-3 border rounded-lg ${borders[card.type]}`}>
            <div className="flex items-center gap-2 mb-2">
              {icons[card.type]}
              <span className="text-sm font-medium text-stone-700">{card.title}</span>
            </div>

            {card.loading ? (
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                AI 思考中...
              </div>
            ) : (
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
                {card.body}
              </p>
            )}

            {/* Quiz answer input */}
            {card.type === "quiz" && !card.loading && card.quizId && !card.score && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={quizAnswer[card.quizId] || ""}
                  onChange={(e) =>
                    setQuizAnswer((prev) => ({ ...prev, [card.quizId!]: e.target.value }))
                  }
                  placeholder="用你自己的话回答..."
                  className="w-full p-2 text-sm border border-stone-200 rounded-md resize-none focus:outline-none focus:border-purple-400"
                  rows={3}
                />
                <button
                  onClick={() => {
                    const answer = card.quizId ? quizAnswer[card.quizId] : "";
                    if (answer && answer.trim()) {
                      onEvaluate(card.quizId!, card.question || card.body, answer, selectedText);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-500 rounded-md hover:bg-purple-600"
                >
                  <Send className="w-3 h-3" />
                  提交回答
                </button>
              </div>
            )}

            {/* Score badge */}
            {card.score && (
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    card.score === "good"
                      ? "bg-green-100 text-green-700"
                      : card.score === "partial"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {card.score === "good" && "✓ 理解良好"}
                  {card.score === "partial" && "△ 部分理解"}
                  {card.score === "misconception" && "✗ 存在误区"}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Trash2, Eye, EyeOff, Clock } from "lucide-react";
import type { Annotation } from "@/components/pdf/pdf-viewer";

interface AnnotationDetailProps {
  annotation: Annotation | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string, isPublic: boolean) => void;
}

export function AnnotationDetail({ annotation, onClose, onDelete, onTogglePublic }: AnnotationDetailProps) {
  if (!annotation) return null;

  const typeLabels: Record<string, string> = {
    highlight: "高亮标注",
    note: "笔记",
    feynman: "费曼问答",
    misconception: "误区记录",
    aha: "Aha Moment",
  };

  const typeColors: Record<string, string> = {
    highlight: "bg-yellow-50 text-yellow-700 border-yellow-200",
    note: "bg-blue-50 text-blue-700 border-blue-200",
    feynman: "bg-purple-50 text-purple-700 border-purple-200",
    misconception: "bg-red-50 text-red-700 border-red-200",
    aha: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-[480px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${typeColors[annotation.type]}`}>
              {typeLabels[annotation.type]}
            </span>
            <span className="text-xs text-stone-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              第 {annotation.pageNumber} 页 · {new Date(annotation.createdAt).toLocaleString("zh-CN")}
            </span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Highlighted text */}
          {annotation.textContent && (
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase mb-1">标注文字</div>
              <div className="p-3 bg-stone-50 rounded-lg text-sm text-stone-600 leading-relaxed italic">
                "{annotation.textContent}"
              </div>
            </div>
          )}

          {/* Note content */}
          {annotation.noteContent && (
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase mb-1">笔记</div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-stone-700 leading-relaxed">
                {annotation.noteContent}
              </div>
            </div>
          )}

          {/* Feynman Q&A (if applicable) */}
          {annotation.type === "feynman" && (
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase mb-1">费曼问答</div>
              <div className="p-3 bg-purple-50 rounded-lg text-sm text-stone-700 leading-relaxed">
                费曼问答记录将在这里显示
              </div>
            </div>
          )}

          {/* Misconception detail */}
          {annotation.type === "misconception" && (
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase mb-1">误区详情</div>
              <div className="p-3 bg-red-50 rounded-lg text-sm text-stone-700 leading-relaxed">
                {annotation.noteContent || "曾在此处产生误解，回看时需注意。"}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 bg-stone-50">
          <button
            onClick={() => onTogglePublic(annotation.id, !annotation.isPublic)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              annotation.isPublic
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {annotation.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {annotation.isPublic ? "已公开" : "仅自己可见"}
          </button>
          <button
            onClick={() => {
              onDelete(annotation.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

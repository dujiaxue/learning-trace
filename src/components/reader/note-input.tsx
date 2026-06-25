"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";

interface NoteInputProps {
  open: boolean;
  selectedText: string;
  pageNumber: number;
  onClose: () => void;
  onSave: (note: string) => void;
}

export function NoteInput({ open, selectedText, pageNumber, onClose, onSave }: NoteInputProps) {
  const [note, setNote] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // open 从 false→true 时清空笔记（替代 effect 中的 setState）
  if (open && open !== prevOpen) {
    setPrevOpen(open);
    setNote("");
  } else if (!open && open !== prevOpen) {
    setPrevOpen(open);
  }

  if (!open) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">
            笔记 · 第 {pageNumber} 页
          </span>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected text preview */}
      {selectedText && (
        <div className="mb-3 p-2 bg-stone-50 rounded text-xs text-stone-500 italic line-clamp-2">
          "{selectedText}"
        </div>
      )}

      {/* Note input */}
      <textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="写下你的想法..."
        className="w-full p-2.5 text-sm border border-stone-200 rounded-lg resize-none focus:outline-none focus:border-blue-400"
        rows={3}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            if (note.trim()) onSave(note.trim());
          }
        }}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-stone-400">⌘+Enter 保存</span>
        <button
          onClick={() => note.trim() && onSave(note.trim())}
          disabled={!note.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3 h-3" />
          保存笔记
        </button>
      </div>
    </div>
  );
}

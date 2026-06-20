"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Highlighter, MessageSquare, X, Loader2, Send } from "lucide-react";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  type: "highlight" | "note" | "feynman" | "misconception" | "aha";
  pageNumber: number;
  rects: HighlightRect[];
  textContent: string;
  noteContent?: string;
  isPublic: boolean;
  createdAt: string;
}

interface PdfViewerProps {
  fileUrl: string;
  annotations: Annotation[];
  onTextSelect: (text: string, pageNumber: number, rects: HighlightRect[]) => void;
  onAnnotationClick: (annotation: Annotation) => void;
  onAnnotationCreate: (data: { type: string; pageNumber: number; rects: HighlightRect[]; textContent: string; note?: string }) => Promise<void>;
}

export function PdfViewer({
  fileUrl,
  annotations,
  onTextSelect,
  onAnnotationClick,
  onAnnotationCreate,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageRefs, setPageRefs] = useState<Record<number, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error("PDF load error:", err);
    setError(err.message || "Failed to load PDF");
    setLoading(false);
  }

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    // Find which page the selection is on
    let pageNumber = 0;
    let pageElement: HTMLElement | null = null;
    for (let p = 1; p <= numPages; p++) {
      const ref = pageRefs[p];
      if (ref && ref.contains(selection.anchorNode)) {
        pageNumber = p;
        pageElement = ref;
        break;
      }
    }

    if (!pageNumber || !pageElement) return;

    // Get selection rects relative to the page
    const range = selection.getRangeAt(0);
    const pageRect = pageElement.getBoundingClientRect();
    const clientRects = range.getClientRects();

    const rects: HighlightRect[] = [];
    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      rects.push({
        x: (r.left - pageRect.left) / scale,
        y: (r.top - pageRect.top) / scale,
        width: r.width / scale,
        height: r.height / scale,
      });
    }

    if (rects.length > 0) {
      onTextSelect(text, pageNumber, rects);
    }
  }, [numPages, pageRefs, scale, onTextSelect]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  // Group annotations by page
  const annotationsByPage = annotations.reduce<Record<number, Annotation[]>>((acc, ann) => {
    if (!acc[ann.pageNumber]) acc[ann.pageNumber] = [];
    acc[ann.pageNumber].push(ann);
    return acc;
  }, {});

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

  return (
    <div className="flex flex-col h-full bg-stone-100">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-stone-200">
        <div className="flex items-center gap-3 text-sm text-stone-600">
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            className="px-2 py-1 rounded hover:bg-stone-100"
          >
            −
          </button>
          <span className="font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            className="px-2 py-1 rounded hover:bg-stone-100"
          >
            +
          </button>
        </div>
        <div className="text-sm text-stone-500">
          {currentPage} / {numPages || "?"} 页
        </div>
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex flex-col items-center gap-4 p-4"
      >
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-red-500 mb-2">PDF 加载失败</p>
            <p className="text-sm text-stone-400">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
            <p className="text-sm text-stone-400">加载 PDF 中...</p>
          </div>
        )}

        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          error={null}
        >
          {Array.from(new Array(numPages), (_, index) => {
            const pageNum = index + 1;
            const pageAnnotations = annotationsByPage[pageNum] || [];

            return (
              <div
                key={`page-${pageNum}`}
                ref={(el) => {
                  setPageRefs((prev) => ({ ...prev, [pageNum]: el }));
                }}
                className="relative bg-white shadow-md"
                data-page-number={pageNum}
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  onLoadSuccess={() => {
                    if (pageNum === 1) setCurrentPage(1);
                  }}
                />

                {/* Annotation overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                >
                  {pageAnnotations.map((ann) =>
                    ann.rects.map((rect, i) => (
                      <div
                        key={`${ann.id}-${i}`}
                        className="absolute pointer-events-auto cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                          left: rect.x,
                          top: rect.y,
                          width: rect.width,
                          height: rect.height,
                          backgroundColor: colors[ann.type] || colors.highlight,
                          borderBottom: ann.type !== "highlight" ? `2px solid ${borderColors[ann.type]}` : "none",
                        }}
                        onClick={() => onAnnotationClick(ann)}
                      />
                    ))
                  )}
                </div>

                {/* Page number badge */}
                <div className="absolute bottom-2 right-2 text-xs text-stone-300 bg-white/80 px-1.5 py-0.5 rounded">
                  {pageNum}
                </div>
              </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, FileText, MessageSquare, AlertCircle, Sparkles, BookOpen } from "lucide-react";

export interface SessionStats {
  totalPages: number;
  currentPage: number;
  dwellTime: Record<number, number>; // page → seconds
  totalTime: number; // total seconds
  annotationCount: number;
  phase: "scan" | "skim" | "deep" | "back";
}

interface SessionTrackerProps {
  stats: SessionStats;
  onPhaseChange?: (phase: SessionStats["phase"]) => void;
}

export function SessionTracker({ stats }: SessionTrackerProps) {
  const phaseLabels = {
    scan: { label: "一扫 · 扫描中", color: "text-blue-600 bg-blue-50" },
    skim: { label: "二扫 · 跳读结构", color: "text-purple-600 bg-purple-50" },
    deep: { label: "精读 · 深入理解", color: "text-orange-600 bg-orange-50" },
    back: { label: "回扫 · 对照回看", color: "text-green-600 bg-green-50" },
  };

  const phase = phaseLabels[stats.phase];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-white border border-stone-200 rounded-xl shadow-md px-5 py-2.5 text-sm">
      {/* Phase indicator */}
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${phase.color}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {phase.label}
      </div>

      <div className="h-4 w-px bg-stone-200" />

      {/* Reading time */}
      <div className="flex items-center gap-1.5 text-stone-600">
        <Clock className="w-3.5 h-3.5 text-stone-400" />
        <span className="font-mono">{formatTime(stats.totalTime)}</span>
      </div>

      <div className="h-4 w-px bg-stone-200" />

      {/* Page */}
      <div className="flex items-center gap-1.5 text-stone-600">
        <FileText className="w-3.5 h-3.5 text-stone-400" />
        <span>{stats.currentPage} / {stats.totalPages || "?"}</span>
      </div>

      <div className="h-4 w-px bg-stone-200" />

      {/* Annotations */}
      <div className="flex items-center gap-1.5 text-stone-600">
        <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
        <span>{stats.annotationCount} 标注</span>
      </div>

      {/* Reading path minimap */}
      {stats.totalPages > 0 && (
        <>
          <div className="h-4 w-px bg-stone-200" />
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(stats.totalPages, 15) }, (_, i) => {
              const pageNum = i + 1;
              const dwell = stats.dwellTime[pageNum] || 0;
              const isCurrent = pageNum === stats.currentPage;
              return (
                <div
                  key={i}
                  className={`w-1.5 rounded-sm transition-all ${
                    isCurrent
                      ? "bg-orange-500 h-5"
                      : dwell > 30
                      ? "bg-orange-400 h-4"
                      : dwell > 5
                      ? "bg-orange-300 h-3"
                      : "bg-stone-200 h-2"
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Hook for tracking reading session
 */
export function useSessionTracker(totalPages: number) {
  const [stats, setStats] = useState<SessionStats>({
    totalPages,
    currentPage: 1,
    dwellTime: {},
    totalTime: 0,
    annotationCount: 0,
    phase: "scan",
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const pageDwellStart = useRef<number>(Date.now());

  // Timer for total reading time
  useEffect(() => {
    const timer = setInterval(() => {
      setStats((prev) => ({ ...prev, totalTime: prev.totalTime + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track current page via scroll
  useEffect(() => {
    function handleScroll() {
      const container = scrollContainerRef.current;
      if (!container) return;

      const now = Date.now();
      const dt = (now - lastScrollTime.current) / 1000;

      // Detect phase from scroll speed
      const scrollTop = container.scrollTop;
      const scrollDelta = Math.abs(scrollTop - lastScrollTop.current);
      const speed = scrollDelta / Math.max(dt, 0.1);

      setStats((prev) => {
        // Update dwell time for current page
        const dwellTime = { ...prev.dwellTime };
        dwellTime[prev.currentPage] = (dwellTime[prev.currentPage] || 0) + dt;

        // Determine phase
        let phase = prev.phase;
        if (scrollTop < lastScrollTop.current - 80) {
          phase = "back";
        } else if (speed > 800) {
          phase = "scan";
        } else if (speed > 200) {
          phase = "skim";
        } else if (speed > 10) {
          phase = "deep";
        }

        return { ...prev, dwellTime, phase };
      });

      lastScrollTop.current = scrollTop;
      lastScrollTime.current = now;
    }

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  function setCurrentPage(page: number) {
    // Record dwell time for the page we're leaving
    const now = Date.now();
    const dwell = (now - pageDwellStart.current) / 1000;
    pageDwellStart.current = now;

    setStats((prev) => ({
      ...prev,
      currentPage: page,
      dwellTime: {
        ...prev.dwellTime,
        [prev.currentPage]: (prev.dwellTime[prev.currentPage] || 0) + dwell,
      },
    }));
  }

  function setAnnotationCount(count: number) {
    setStats((prev) => ({ ...prev, annotationCount: count }));
  }

  return { stats, scrollContainerRef, setCurrentPage, setAnnotationCount };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Core type definitions for Learning Trace
 */

// Annotation types on PDF
export type AnnotationType = "highlight" | "note" | "feynman" | "misconception" | "aha";

// Reading phase detected by scroll behavior
export type ReadingPhase = "scan" | "skim" | "deep" | "back";

// Learning mode selected by user
export type LearningMode = "quick" | "deep" | "free";

// Position info for an annotation on the PDF
export interface AnnotationPosition {
  rects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

// Paper structure section
export interface PaperSection {
  title: string;
  page: number;
  type: "core" | "normal" | "skip";
  reason?: string;
}

// Reading path data point
export interface ReadingPathPoint {
  page: number;
  dwellTime: number; // seconds
  phase: ReadingPhase;
  timestamp: number; // ms since session start
}

// Feynman QA evaluation
export interface FeynmanEvaluation {
  score: "good" | "partial" | "misconception";
  feedback: string;
  correctParts?: string[];
  gaps?: string[];
}

// AI request/response types
export interface AIExplainRequest {
  paperTitle: string;
  pageNumber: number;
  textContent: string;
  surroundingContext?: string;
}

export interface AIQuizRequest {
  paperTitle: string;
  textContent: string;
  concept?: string;
}

export interface AIEvaluateRequest {
  question: string;
  userAnswer: string;
  context?: string;
}

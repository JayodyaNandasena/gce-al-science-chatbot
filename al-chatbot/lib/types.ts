// // ─── Domain types ─────────────────────────────────────────────────────────────
//
// export type Subject = "biology" | "chemistry" | "physics";
//
// export interface MarkingPoint {
//     point: string;
//     marks: number;
// }
//
// // A sub-question within a structured (passage-based) question
// export interface SubQuestion {
//     id: string;
//     question: string;
//     total_marks: number;
//     marking_points: MarkingPoint[];
// }
//
// // Unified Question type — covers both standalone and structured questions.
// //
// // Standalone:   question + total_marks + marking_points are present; no passage/questions.
// // Structured:   passage + questions[] are present; question/total_marks/marking_points absent.
// //
// // Use isStructured(q) to discriminate.
//
// export interface Question {
//     id: string;
//     topics: string[];
//     diagram_reference?: string;
//
//     // ── Standalone fields ──
//     question?: string;
//     total_marks?: number;
//     marking_points?: MarkingPoint[];
//
//     // ── Structured fields ──
//     passage?: string;
//     questions?: SubQuestion[];
// }
//
// // Type guard
// export function isStructured(q: Question): q is Question & { passage: string; questions: SubQuestion[] } {
//     return Array.isArray(q.questions) && q.questions.length > 0;
// }
//
// // ─── Evaluation types (what the UI receives after stream is parsed) ───────────
//
// export interface PointEvaluation {
//     point: string;
//     awarded: boolean;
//     marksAwarded: number;
//     reason: string;
// }
//
// export interface EvaluationResult {
//     marksAwarded: number;
//     totalMarks: number;
//     percentage: number;
//     feedback: string;
//     pointsEvaluation: PointEvaluation[];
// }

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Subject = "biology" | "chemistry" | "physics";

export interface MarkingPoint {
    point: string;
    marks: number;
}

// A sub-question within a structured (passage-based) question
export interface SubQuestion {
    id: string;
    question: string;
    total_marks: number;
    marking_points: MarkingPoint[];
    diagram_reference?: string;
}

// Unified Question type — covers both standalone and structured questions.
//
// Standalone:   question + total_marks + marking_points are present; no passage/questions.
// Structured:   passage + questions[] are present; question/total_marks/marking_points absent.
//
// Use isStructured(q) to discriminate.

export interface Question {
    id: string;
    topics: string[];
    diagram_reference?: string;

    // ── Standalone fields ──
    question?: string;
    total_marks?: number;
    marking_points?: MarkingPoint[];

    // ── Structured fields ──
    passage?: string;
    questions?: SubQuestion[];
}

// Type guard
export function isStructured(q: Question): q is Question & { passage: string; questions: SubQuestion[] } {
    return Array.isArray(q.questions) && q.questions.length > 0;
}

// ─── Evaluation types (what the UI receives after stream is parsed) ───────────

export interface PointEvaluation {
    point: string;
    awarded: boolean;
    marksAwarded: number;
    reason: string;
}

export interface EvaluationResult {
    marksAwarded: number;
    totalMarks: number;
    percentage: number;
    feedback: string;
    pointsEvaluation: PointEvaluation[];
}
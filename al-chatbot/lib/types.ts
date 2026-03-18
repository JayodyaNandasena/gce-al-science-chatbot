// Domain types

export type Subject = "biology" | "chemistry" | "physics";

export interface MarkingPoint {
    point: string;
    marks: number;
}

// A sub-question within a structured question
export interface SubQuestion {
    id: string;
    question: string;
    total_marks: number;
    marking_points: MarkingPoint[];
    diagram_reference?: string;
}

// Unified Question type — covers both standalone and structured questions.

export interface Question {
    id: string;
    topics: string[];
    diagram_reference?: string;

    // Standalone fields
    question?: string;
    total_marks?: number;
    marking_points?: MarkingPoint[];

    // Structured fields
    passage?: string;
    questions?: SubQuestion[];
}

// Type guard
export function isStructured(q: Question): q is Question & { passage: string; questions: SubQuestion[] } {
    return Array.isArray(q.questions) && q.questions.length > 0;
}

// Evaluation types

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
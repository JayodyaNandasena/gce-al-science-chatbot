"use client";

import {useRef, useState} from "react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {ChevronDown, ChevronLeft, ChevronRight, ImageIcon, Loader2, Paperclip, Type, Upload, X} from "lucide-react";
import MathText from "@/components/quiz/MathText";
import {QUIZ_SUBJECTS, type QuizSubject} from "@/components/quiz/subject-config";
import type {EvaluationResult, Question} from "@/lib/types";

// ─── Parse LLM response ───────────────────────────────────────────────────────

interface RawBreakdownItem {
    point: string;
    awarded: number;
    comment: string;
}

interface RawEvaluation {
    totalMarks: number;
    maxMarks: number;
    breakdown: RawBreakdownItem[];
    finalFeedback: string;
}

function parseRawEvaluation(raw: string, fallbackTotal: number): EvaluationResult {
    let clean = raw.replace(/```json|```/g, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.slice(firstBrace, lastBrace + 1);
    }
    const parsed: RawEvaluation = JSON.parse(clean);
    const maxMarks = parsed.maxMarks ?? fallbackTotal;
    return {
        marksAwarded: parsed.totalMarks ?? 0,
        totalMarks: maxMarks,
        percentage: maxMarks ? Math.round((parsed.totalMarks / maxMarks) * 100) : 0,
        feedback: parsed.finalFeedback ?? "",
        pointsEvaluation: (parsed.breakdown ?? []).map((b) => ({
            point: b.point, awarded: b.awarded > 0, marksAwarded: b.awarded, reason: b.comment,
        })),
    };
}

function scoreLabel(pct: number) {
    if (pct === 100) return "Full marks!";
    if (pct >= 80) return "Excellent";
    if (pct >= 60) return "Good";
    if (pct >= 40) return "Partial";
    return "Needs work";
}

function scoreColors(pct: number) {
    if (pct >= 80) return {
        bar: "#10b981", text: "#065f46", bg: "#ecfdf5", border: "#a7f3d0",
        badge: "#d1fae5", badgeText: "#065f46"
    };
    if (pct >= 50) return {
        bar: "#f59e0b", text: "#92400e", bg: "#fffbeb", border: "#fde68a",
        badge: "#fef3c7", badgeText: "#92400e"
    };
    return {
        bar: "#ef4444", text: "#991b1b", bg: "#fef2f2", border: "#fecaca",
        badge: "#fee2e2", badgeText: "#991b1b"
    };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    question: Question;
    subject: QuizSubject;
    config: (typeof QUIZ_SUBJECTS)[QuizSubject];
    onScored: (awarded: number, total: number) => void;
    onNext?: () => void;
    onPrev?: () => void;
}

export default function QuestionCard({question, subject, config, onScored, onNext, onPrev}: Props) {
    // ── Input mode ────────────────────────────────────────────────────────────
    const [inputMode, setInputMode] = useState<"text" | "image">("text");

    // ── Text answer state ─────────────────────────────────────────────────────
    const [answer, setAnswer] = useState("");

    // ── Image answer state ────────────────────────────────────────────────────
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Shared state ──────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [streamBuffer, setStreamBuffer] = useState("");
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scored, setScored] = useState(false);
    const [correctAnswerOpen, setCorrectAnswerOpen] = useState(false);

    // ── Image picker ──────────────────────────────────────────────────────────

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    }

    function clearImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function switchMode(mode: "text" | "image") {
        setInputMode(mode);
        if (mode === "text") clearImage();
        else setAnswer("");
    }

    // ── Stream reader ─────────────────────────────────────────────────────────

    async function readStream(res: Response) {
        if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, {stream: true});

            if (chunk.includes("tokens-ended")) {
                const jsonPart = (buffer + chunk).split("tokens-ended")[0];
                const evaluation = parseRawEvaluation(jsonPart, question.total_marks);
                setResult(evaluation);
                setStreamBuffer("");
                if (!scored) {
                    onScored(evaluation.marksAwarded, evaluation.totalMarks);
                    setScored(true);
                }
                break;
            }

            buffer += chunk;
            setStreamBuffer(buffer);
        }
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    async function handleSubmit() {
        if (loading) return;
        if (inputMode === "text" && !answer.trim()) return;
        if (inputMode === "image" && !imageFile) return;

        setLoading(true);
        setError(null);
        setStreamBuffer("");
        setResult(null);
        setCorrectAnswerOpen(false);

        try {
            let res: Response;

            if (inputMode === "image" && imageFile) {
                const form = new FormData();
                form.append("question", question.question);
                form.append("markingPoints", JSON.stringify(question.marking_points));
                form.append("totalMarks", String(question.total_marks));
                form.append("subject", subject);
                form.append("image", imageFile);
                res = await fetch("/api/evaluate", {method: "POST", body: form});
            } else {
                res = await fetch("/api/evaluate", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        question: question.question,
                        userAnswer: answer,
                        markingPoints: question.marking_points,
                        totalMarks: question.total_marks,
                        subject,
                    }),
                });
            }

            await readStream(res);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const canSubmit = inputMode === "text" ? answer.trim().length > 0 : imageFile !== null;
    const pct = result?.percentage ?? 0;
    const sc = scoreColors(pct);
    const card: React.CSSProperties = {
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden"
    };

    // marking_points is always Array<{ point: string; marks: number }>
    const markingPoints = (question.marking_points ?? []) as Array<{ point: string; marks: number }>;

    return (
        <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>

            {/* ── Question ── */}
            <div style={{...card, borderWidth: "2px", borderColor: "#e5e7eb"}}>
                <div style={{padding: "24px"}}>
                    <div style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "16px"
                    }}>
                        <div style={{display: "flex", flexWrap: "wrap", gap: "6px"}}>
                            {question.topics.map((t) => (
                                <span key={t} className={`${config.badgeBg} ${config.textColor}`} style={{
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    padding: "3px 12px",
                                    borderRadius: "9999px"
                                }}>{t}</span>
                            ))}
                        </div>
                        <span style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            background: "#f9fafb",
                            padding: "3px 12px",
                            borderRadius: "9999px",
                            border: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                        }}>
                            {question.total_marks} mark{question.total_marks > 1 ? "s" : ""}
                        </span>
                    </div>
                    <MathText text={question.question}
                              style={{fontSize: "17px", fontWeight: 600, color: "#111827", lineHeight: 1.7}}/>
                    {question.diagram_reference && (
                        <div style={{marginTop: "16px"}}>
                            <p style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}>
                                <Paperclip style={{width: "12px", height: "12px"}}/>
                                Diagram
                            </p>
                            <img
                                src={`/${subject}/${question.diagram_reference}`}
                                alt={`Diagram for: ${question.question}`}
                                style={{
                                    maxWidth: "100%",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb",
                                    background: "#f9fafb",
                                    display: "block"
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Answer input ── */}
            <div style={card}>
                <div style={{padding: "24px"}}>

                    {/* Input mode toggle */}
                    {!result && (
                        <div style={{display: "flex", gap: "8px", marginBottom: "16px"}}>
                            <span style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                alignSelf: "center",
                                marginRight: "4px"
                            }}>
                                Answer via:
                            </span>
                            <button
                                onClick={() => switchMode("text")}
                                style={{
                                    display: "flex", alignItems: "center", gap: "6px",
                                    padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
                                    border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                                    background: inputMode === "text" ? undefined : "#fff",
                                    borderColor: inputMode === "text" ? "transparent" : "#e5e7eb",
                                    color: inputMode === "text" ? "#fff" : "#6b7280",
                                }}
                                className={inputMode === "text" ? `bg-gradient-to-r ${config.gradient}` : ""}
                            >
                                <Type style={{width: "13px", height: "13px"}}/>
                                Text
                            </button>
                            <button
                                onClick={() => switchMode("image")}
                                style={{
                                    display: "flex", alignItems: "center", gap: "6px",
                                    padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
                                    border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                                    background: inputMode === "image" ? undefined : "#fff",
                                    borderColor: inputMode === "image" ? "transparent" : "#e5e7eb",
                                    color: inputMode === "image" ? "#fff" : "#6b7280",
                                }}
                                className={inputMode === "image" ? `bg-gradient-to-r ${config.gradient}` : ""}
                            >
                                <ImageIcon style={{width: "13px", height: "13px"}}/>
                                Image
                            </button>
                        </div>
                    )}

                    {/* ── Text input ── */}
                    {inputMode === "text" && (
                        <>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "8px"
                            }}>
                                Your Answer
                            </label>
                            <Textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                disabled={!!result || loading}
                                placeholder="Type your answer here…"
                                rows={5}
                                style={{resize: "none", fontSize: "15px"}}
                                className={`${config.borderColor} ${config.focusBorder}`}
                            />
                        </>
                    )}

                    {/* ── Image input ── */}
                    {inputMode === "image" && !result && (
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "8px"
                            }}>
                                Your Handwritten Answer
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                style={{display: "none"}}
                                onChange={handleImageChange}
                            />
                            {!imagePreview ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        width: "100%", padding: "32px 16px", borderRadius: "10px",
                                        border: "2px dashed #d1d5db", background: "#f9fafb",
                                        cursor: "pointer", display: "flex", flexDirection: "column",
                                        alignItems: "center", gap: "10px", transition: "all 0.15s",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.borderColor = "#9ca3af";
                                        (e.currentTarget as HTMLElement).style.background = "#f3f4f6";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
                                        (e.currentTarget as HTMLElement).style.background = "#f9fafb";
                                    }}
                                >
                                    <div style={{
                                        width: "44px", height: "44px", borderRadius: "50%",
                                        background: "#e5e7eb", display: "flex",
                                        alignItems: "center", justifyContent: "center"
                                    }}>
                                        <Upload style={{width: "20px", height: "20px", color: "#9ca3af"}}/>
                                    </div>
                                    <div style={{textAlign: "center"}}>
                                        <p style={{fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "2px"}}>
                                            Upload or take a photo
                                        </p>
                                        <p style={{fontSize: "12px", color: "#9ca3af"}}>
                                            JPG, PNG, WEBP · handwritten answers, calculations, diagrams
                                        </p>
                                    </div>
                                </button>
                            ) : (
                                <div style={{position: "relative", borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb"}}>
                                    <img
                                        src={imagePreview}
                                        alt="Your answer"
                                        style={{width: "100%", maxHeight: "320px", objectFit: "contain", background: "#f9fafb", display: "block"}}
                                    />
                                    <button
                                        onClick={clearImage}
                                        style={{
                                            position: "absolute", top: "8px", right: "8px",
                                            width: "28px", height: "28px", borderRadius: "50%",
                                            background: "rgba(0,0,0,0.55)", border: "none",
                                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                                        }}
                                    >
                                        <X style={{width: "14px", height: "14px", color: "#fff"}}/>
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            position: "absolute", bottom: "8px", right: "8px",
                                            fontSize: "11px", fontWeight: 500, color: "#fff",
                                            background: "rgba(0,0,0,0.55)", border: "none",
                                            padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
                                        }}
                                    >
                                        Replace
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Show submitted image after result */}
                    {inputMode === "image" && result && imagePreview && (
                        <div style={{marginBottom: "12px"}}>
                            <p style={{
                                fontSize: "11px", fontWeight: 600, color: "#6b7280",
                                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px"
                            }}>
                                Your Answer (Image)
                            </p>
                            <img
                                src={imagePreview}
                                alt="Submitted answer"
                                style={{
                                    width: "100%", maxHeight: "240px", objectFit: "contain",
                                    borderRadius: "8px", border: "1px solid #e5e7eb", background: "#f9fafb"
                                }}
                            />
                        </div>
                    )}

                    {/* Submit button */}
                    {!result && (
                        <div style={{marginTop: "14px"}}>
                            <Button
                                onClick={handleSubmit}
                                disabled={!canSubmit || loading}
                                className={`bg-gradient-to-r ${config.gradient} text-white hover:opacity-90 disabled:opacity-40`}
                            >
                                {loading
                                    ? <><Loader2 style={{width: "15px", height: "15px", marginRight: "8px"}} className="animate-spin"/>Evaluating…</>
                                    : inputMode === "image" ? "Evaluate Image →" : "Submit Answer →"
                                }
                            </Button>
                        </div>
                    )}

                    {error && <p style={{marginTop: "10px", fontSize: "12px", color: "#ef4444"}}>{error}</p>}
                </div>
            </div>

            {/* ── Stream preview ── */}
            {streamBuffer && !result && (
                <div style={card}>
                    <div style={{padding: "16px 20px"}}>
                        <p className={config.mutedText} style={{
                            fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
                            letterSpacing: "0.08em", marginBottom: "8px",
                            display: "flex", alignItems: "center", gap: "8px"
                        }}>
                            <span className={config.progressColor}
                                  style={{display: "inline-block", width: "6px", height: "6px", borderRadius: "50%"}}/>
                            {inputMode === "image" ? "Reading image & evaluating…" : "Thinking…"}
                        </p>
                        <pre style={{
                            fontSize: "11px", color: "#9ca3af", whiteSpace: "pre-wrap",
                            fontFamily: "monospace", lineHeight: 1.5, maxHeight: "96px", overflow: "hidden"
                        }}>{streamBuffer}</pre>
                    </div>
                </div>
            )}

            {/* ── Results ── */}
            {result && (
                <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>

                    {/* Score banner */}
                    <div style={{...card, border: `2px solid ${sc.border}`, background: sc.bg}}>
                        <div style={{padding: "24px"}}>
                            <div style={{
                                display: "flex", alignItems: "center",
                                justifyContent: "space-between", marginBottom: "12px"
                            }}>
                                <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                                    <span style={{fontSize: "32px", fontWeight: 700, color: "#111827"}}>
                                        {result.marksAwarded}/{result.totalMarks}
                                    </span>
                                    <span style={{fontSize: "13px", color: "#6b7280"}}>marks</span>
                                    <span style={{
                                        fontSize: "12px", fontWeight: 500,
                                        padding: "2px 10px", borderRadius: "9999px",
                                        background: sc.badge, color: sc.badgeText
                                    }}>{scoreLabel(pct)}</span>
                                </div>
                                <span style={{fontSize: "26px", fontWeight: 700, color: sc.text}}>{pct}%</span>
                            </div>
                            <div style={{height: "8px", borderRadius: "9999px", background: "#e5e7eb", overflow: "hidden"}}>
                                <div style={{
                                    height: "100%", borderRadius: "9999px", background: sc.bar,
                                    width: `${pct}%`, transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)"
                                }}/>
                            </div>
                        </div>
                    </div>

                    {/* AI Feedback */}
                    <div style={card}>
                        <div style={{padding: "24px"}}>
                            <p className={config.textColor} style={{
                                fontSize: "12px", fontWeight: 600, textTransform: "uppercase",
                                letterSpacing: "0.08em", marginBottom: "10px"
                            }}>AI Feedback</p>
                            <p style={{fontSize: "15px", color: "#374151", lineHeight: 1.7}}>{result.feedback}</p>
                        </div>
                    </div>

                    {/* Marking breakdown */}
                    <div style={card}>
                        <div style={{padding: "24px"}}>
                            <p className={config.textColor} style={{
                                fontSize: "12px", fontWeight: 600, textTransform: "uppercase",
                                letterSpacing: "0.08em", marginBottom: "14px"
                            }}>Marking Scheme Breakdown</p>
                            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                                {result.pointsEvaluation.map((pe, i) => (
                                    <div key={i} style={{
                                        display: "flex", gap: "12px", alignItems: "flex-start",
                                        padding: "12px", borderRadius: "10px",
                                        background: pe.awarded ? "#ecfdf5" : "#fef2f2",
                                        border: `1px solid ${pe.awarded ? "#a7f3d0" : "#fecaca"}`
                                    }}>
                                        <span style={{fontSize: "16px", flexShrink: 0, marginTop: "1px"}}>
                                            {pe.awarded ? "✅" : "❌"}
                                        </span>
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div style={{
                                                display: "flex", justifyContent: "space-between",
                                                gap: "8px", marginBottom: "4px"
                                            }}>
                                                <MathText text={pe.point} style={{
                                                    fontSize: "14px", fontWeight: 500,
                                                    color: "#111827", lineHeight: 1.5
                                                }}/>
                                                <span style={{
                                                    fontSize: "12px", fontWeight: 700, flexShrink: 0,
                                                    color: pe.awarded ? "#065f46" : "#9ca3af"
                                                }}>
                                                    {pe.marksAwarded > 0 ? `+${pe.marksAwarded}` : "0"}
                                                </span>
                                            </div>
                                            <p style={{fontSize: "13px", color: "#6b7280", lineHeight: 1.5}}>{pe.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Correct Answer ── */}
                    <div style={card}>
                        <button
                            onClick={() => setCorrectAnswerOpen((v) => !v)}
                            style={{
                                width: "100%", display: "flex", alignItems: "center",
                                justifyContent: "space-between", padding: "14px 20px",
                                background: "none", border: "none", cursor: "pointer",
                            }}
                        >
                            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                {/* Bookmark icon */}
                                <div style={{
                                    width: "28px", height: "28px", borderRadius: "8px",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: "#f0fdf4", flexShrink: 0,
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                         stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                                <span style={{
                                    fontSize: "13px", fontWeight: 600, color: "#111827",
                                    letterSpacing: "0.01em"
                                }}>
                                    Correct Answer
                                </span>
                                <span style={{
                                    fontSize: "11px", fontWeight: 500, color: "#6b7280",
                                    background: "#f3f4f6", padding: "2px 8px", borderRadius: "9999px",
                                    border: "1px solid #e5e7eb"
                                }}>
                                    {markingPoints.length} point{markingPoints.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <ChevronDown style={{
                                width: "16px", height: "16px", color: "#9ca3af",
                                transition: "transform 0.2s",
                                transform: correctAnswerOpen ? "rotate(180deg)" : "rotate(0deg)"
                            }}/>
                        </button>

                        {correctAnswerOpen && (
                            <div style={{borderTop: "1px solid #e5e7eb"}}>
                                {/* Header row */}
                                <div style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "10px 20px", background: "#f9fafb",
                                    borderBottom: "1px solid #e5e7eb"
                                }}>
                                    <span style={{fontSize: "11px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em"}}>
                                        Marking point
                                    </span>
                                    <span style={{fontSize: "11px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em"}}>
                                        Marks
                                    </span>
                                </div>

                                {/* Points list */}
                                <div style={{padding: "8px 0"}}>
                                    {markingPoints.map((mp, i) => (
                                        <div key={i} style={{
                                            display: "flex", alignItems: "flex-start",
                                            justifyContent: "space-between", gap: "16px",
                                            padding: "10px 20px",
                                            borderBottom: i < markingPoints.length - 1 ? "1px solid #f3f4f6" : "none",
                                        }}>
                                            <div style={{display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0}}>
                                                {/* Point number bubble */}
                                                <span style={{
                                                    minWidth: "22px", height: "22px", borderRadius: "50%",
                                                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "11px", fontWeight: 700, color: "#16a34a",
                                                    flexShrink: 0, marginTop: "1px",
                                                }}>
                                                    {i + 1}
                                                </span>
                                                <MathText
                                                    text={mp.point}
                                                    style={{fontSize: "14px", color: "#1f2937", lineHeight: 1.6}}
                                                />
                                            </div>
                                            {/* Mark pill */}
                                            <span style={{
                                                fontSize: "12px", fontWeight: 700, flexShrink: 0,
                                                background: "#f0fdf4", color: "#16a34a",
                                                border: "1px solid #bbf7d0",
                                                padding: "2px 10px", borderRadius: "9999px",
                                                whiteSpace: "nowrap", marginTop: "2px",
                                            }}>
                                                {mp.marks} mark{mp.marks !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer total */}
                                <div style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "10px 20px", background: "#f9fafb",
                                    borderTop: "1px solid #e5e7eb"
                                }}>
                                    <span style={{fontSize: "12px", fontWeight: 600, color: "#374151"}}>Total</span>
                                    <span style={{fontSize: "13px", fontWeight: 700, color: "#111827"}}>
                                        {question.total_marks} mark{question.total_marks !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div style={{display: "flex", gap: "12px", paddingTop: "4px"}}>
                        {onPrev && (
                            <Button variant="outline" onClick={onPrev}
                                    className={`flex-1 ${config.borderColor} ${config.hoverBorder} ${config.textColor}`}>
                                <ChevronLeft style={{width: "16px", height: "16px", marginRight: "4px"}}/> Previous
                            </Button>
                        )}
                        {onNext && result && (
                            <Button onClick={onNext}
                                    className={`flex-1 bg-gradient-to-r ${config.gradient} text-white hover:opacity-90`}>
                                Next Question <ChevronRight style={{width: "16px", height: "16px", marginLeft: "4px"}}/>
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
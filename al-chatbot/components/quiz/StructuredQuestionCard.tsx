// "use client";
//
// import {useRef, useState} from "react";
// import {Button} from "@/components/ui/button";
// import {Textarea} from "@/components/ui/textarea";
// import {ChevronDown, ChevronLeft, ChevronRight, ImageIcon, Loader2, Type, Upload, X} from "lucide-react";
// import {QUIZ_SUBJECTS, type QuizSubject} from "@/components/quiz/subject-config";
// import type {EvaluationResult, Question, SubQuestion} from "@/lib/types";
//
// // ─── Parse helpers (identical to QuestionCard) ────────────────────────────────
//
// interface RawBreakdownItem {
//     point: string;
//     awarded: number;
//     comment: string;
// }
//
// interface RawEvaluation {
//     totalMarks: number;
//     maxMarks: number;
//     breakdown: RawBreakdownItem[];
//     finalFeedback: string;
// }
//
// function parseRawEvaluation(raw: string, fallbackTotal: number): EvaluationResult {
//     let clean = raw.replace(/```json|```/g, "").trim();
//     const firstBrace = clean.indexOf("{");
//     const lastBrace = clean.lastIndexOf("}");
//     if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
//         clean = clean.slice(firstBrace, lastBrace + 1);
//     }
//     const parsed: RawEvaluation = JSON.parse(clean);
//     const maxMarks = parsed.maxMarks ?? fallbackTotal;
//     return {
//         marksAwarded: parsed.totalMarks ?? 0,
//         totalMarks: maxMarks,
//         percentage: maxMarks ? Math.round((parsed.totalMarks / maxMarks) * 100) : 0,
//         feedback: parsed.finalFeedback ?? "",
//         pointsEvaluation: (parsed.breakdown ?? []).map((b) => ({
//             point: b.point, awarded: b.awarded > 0, marksAwarded: b.awarded, reason: b.comment,
//         })),
//     };
// }
//
// function scoreLabel(pct: number) {
//     if (pct === 100) return "Full marks!";
//     if (pct >= 80) return "Excellent";
//     if (pct >= 60) return "Good";
//     if (pct >= 40) return "Partial";
//     return "Needs work";
// }
//
// function scoreColors(pct: number) {
//     if (pct >= 80) return {
//         bar: "#10b981",
//         text: "#065f46",
//         bg: "#ecfdf5",
//         border: "#a7f3d0",
//         badge: "#d1fae5",
//         badgeText: "#065f46"
//     };
//     if (pct >= 50) return {
//         bar: "#f59e0b",
//         text: "#92400e",
//         bg: "#fffbeb",
//         border: "#fde68a",
//         badge: "#fef3c7",
//         badgeText: "#92400e"
//     };
//     return {bar: "#ef4444", text: "#991b1b", bg: "#fef2f2", border: "#fecaca", badge: "#fee2e2", badgeText: "#991b1b"};
// }
//
// // ─── Per-sub-question state ───────────────────────────────────────────────────
//
// interface SubState {
//     inputMode: "text" | "image";
//     answer: string;
//     imageFile: File | null;
//     imagePreview: string | null;
//     loading: boolean;
//     streamBuffer: string;
//     result: EvaluationResult | null;
//     error: string | null;
//     scored: boolean;
//     modelOpen: boolean;
// }
//
// function defaultSubState(): SubState {
//     return {
//         inputMode: "text",
//         answer: "",
//         imageFile: null,
//         imagePreview: null,
//         loading: false,
//         streamBuffer: "",
//         result: null,
//         error: null,
//         scored: false,
//         modelOpen: false
//     };
// }
//
// // ─── Props ────────────────────────────────────────────────────────────────────
//
// interface Props {
//     question: Question & { passage: string; questions: SubQuestion[] };
//     subject: QuizSubject;
//     config: (typeof QUIZ_SUBJECTS)[QuizSubject];
//     onScored: (awarded: number, total: number) => void;
//     onNext?: () => void;
//     onPrev?: () => void;
// }
//
// const card: React.CSSProperties = {
//     background: "#fff",
//     borderRadius: "14px",
//     border: "1px solid #e5e7eb",
//     boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
//     overflow: "hidden"
// };
//
// export default function StructuredQuestionCard({question, subject, config, onScored, onNext, onPrev}: Props) {
//     const [subStates, setSubStates] = useState<SubState[]>(() =>
//         question.questions.map(() => defaultSubState())
//     );
//     const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
//
//     function updateSub(idx: number, patch: Partial<SubState>) {
//         setSubStates((prev) => prev.map((s, i) => i === idx ? {...s, ...patch} : s));
//     }
//
//     function handleImageChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
//         const file = e.target.files?.[0];
//         if (!file) return;
//         const reader = new FileReader();
//         reader.onload = (ev) => updateSub(idx, {imageFile: file, imagePreview: ev.target?.result as string});
//         reader.readAsDataURL(file);
//     }
//
//     function clearImage(idx: number) {
//         updateSub(idx, {imageFile: null, imagePreview: null});
//         const ref = fileInputRefs.current[idx];
//         if (ref) ref.value = "";
//     }
//
//     async function readStream(res: Response, idx: number, totalMarks: number) {
//         if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);
//         const reader = res.body.getReader();
//         const decoder = new TextDecoder();
//         let buffer = "";
//         while (true) {
//             const {done, value} = await reader.read();
//             if (done) break;
//             const chunk = decoder.decode(value, {stream: true});
//             if (chunk.includes("tokens-ended")) {
//                 const jsonPart = (buffer + chunk).split("tokens-ended")[0];
//                 const evaluation = parseRawEvaluation(jsonPart, totalMarks);
//                 updateSub(idx, {result: evaluation, streamBuffer: "", loading: false});
//                 if (!subStates[idx].scored) {
//                     onScored(evaluation.marksAwarded, evaluation.totalMarks);
//                     updateSub(idx, {scored: true});
//                 }
//                 break;
//             }
//             buffer += chunk;
//             updateSub(idx, {streamBuffer: buffer});
//         }
//     }
//
//     async function handleSubmit(idx: number) {
//         const sub = question.questions[idx];
//         const state = subStates[idx];
//         if (state.loading) return;
//         if (state.inputMode === "text" && !state.answer.trim()) return;
//         if (state.inputMode === "image" && !state.imageFile) return;
//
//         updateSub(idx, {loading: true, error: null, streamBuffer: "", result: null, modelOpen: false});
//
//         try {
//             let res: Response;
//             // Prepend the passage to the question text so the LLM has full context
//             const fullQuestion = `${question.passage}\n\n${sub.question}`;
//
//             if (state.inputMode === "image" && state.imageFile) {
//                 const form = new FormData();
//                 form.append("question", fullQuestion);
//                 form.append("markingPoints", JSON.stringify(sub.marking_points));
//                 form.append("totalMarks", String(sub.total_marks));
//                 form.append("subject", subject);
//                 form.append("image", state.imageFile);
//                 res = await fetch("/api/evaluate", {method: "POST", body: form});
//             } else {
//                 res = await fetch("/api/evaluate", {
//                     method: "POST",
//                     headers: {"Content-Type": "application/json"},
//                     body: JSON.stringify({
//                         question: fullQuestion,
//                         userAnswer: state.answer,
//                         markingPoints: sub.marking_points,
//                         totalMarks: sub.total_marks,
//                         subject,
//                     }),
//                 });
//             }
//             await readStream(res, idx, sub.total_marks);
//         } catch (e: unknown) {
//             updateSub(idx, {error: e instanceof Error ? e.message : "Something went wrong", loading: false});
//         }
//     }
//
//     return (
//         <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
//
//             {/* ── Passage card ── */}
//             <div style={{...card, borderLeft: "4px solid", borderLeftColor: config.activeDot as string}}>
//                 <div style={{padding: "20px 24px"}}>
//                     <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px"}}>
//             <span className={`${config.badgeBg} ${config.textColor}`}
//                   style={{
//                       fontSize: "11px",
//                       fontWeight: 600,
//                       padding: "3px 10px",
//                       borderRadius: "9999px",
//                       textTransform: "uppercase",
//                       letterSpacing: "0.06em"
//                   }}>
//               Passage
//             </span>
//                         <div style={{display: "flex", flexWrap: "wrap", gap: "6px"}}>
//                             {question.topics.map((t) => (
//                                 <span key={t} style={{
//                                     fontSize: "11px",
//                                     color: "#9ca3af",
//                                     padding: "2px 8px",
//                                     borderRadius: "9999px",
//                                     border: "1px solid #e5e7eb"
//                                 }}>{t}</span>
//                             ))}
//                         </div>
//                     </div>
//                     {/* Passage text — preserve line breaks */}
//                     <p style={{
//                         fontSize: "14px",
//                         color: "#374151",
//                         lineHeight: 1.8,
//                         whiteSpace: "pre-wrap",
//                         fontFamily: "inherit"
//                     }}>
//                         {question.passage}
//                     </p>
//                 </div>
//             </div>
//
//             {/* ── Sub-questions ── */}
//             {question.questions.map((sub, idx) => {
//                 const state = subStates[idx];
//                 const pct = state.result?.percentage ?? 0;
//                 const sc = scoreColors(pct);
//                 const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"][idx] ?? `${idx + 1}`;
//                 const canSubmit = state.inputMode === "text" ? state.answer.trim().length > 0 : state.imageFile !== null;
//
//                 return (
//                     <div key={sub.id} style={{...card}}>
//                         <div style={{padding: "24px"}}>
//
//                             {/* Sub-question header */}
//                             <div style={{
//                                 display: "flex",
//                                 alignItems: "flex-start",
//                                 justifyContent: "space-between",
//                                 gap: "12px",
//                                 marginBottom: "16px"
//                             }}>
//                                 <div style={{display: "flex", alignItems: "flex-start", gap: "10px"}}>
//                   <span className={`${config.badgeBg} ${config.textColor}`}
//                         style={{
//                             fontSize: "12px",
//                             fontWeight: 700,
//                             padding: "3px 10px",
//                             borderRadius: "9999px",
//                             flexShrink: 0
//                         }}>
//                     ({roman})
//                   </span>
//                                     <p style={{fontSize: "16px", fontWeight: 600, color: "#111827", lineHeight: 1.6}}>
//                                         {sub.question}
//                                     </p>
//                                 </div>
//                                 <span style={{
//                                     fontSize: "13px",
//                                     color: "#6b7280",
//                                     background: "#f9fafb",
//                                     padding: "3px 12px",
//                                     borderRadius: "9999px",
//                                     border: "1px solid #e5e7eb",
//                                     whiteSpace: "nowrap",
//                                     flexShrink: 0
//                                 }}>
//                   {sub.total_marks} mark{sub.total_marks > 1 ? "s" : ""}
//                 </span>
//                             </div>
//
//                             {/* Input mode toggle */}
//                             {!state.result && (
//                                 <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px"}}>
//                                     <span style={{
//                                         fontSize: "11px",
//                                         fontWeight: 600,
//                                         color: "#6b7280",
//                                         textTransform: "uppercase",
//                                         letterSpacing: "0.08em"
//                                     }}>Answer via:</span>
//                                     {(["text", "image"] as const).map((mode) => (
//                                         <button key={mode}
//                                                 onClick={() => updateSub(idx, {
//                                                     inputMode: mode,
//                                                     answer: "",
//                                                     imageFile: null,
//                                                     imagePreview: null
//                                                 })}
//                                                 style={{
//                                                     display: "flex",
//                                                     alignItems: "center",
//                                                     gap: "6px",
//                                                     padding: "5px 12px",
//                                                     borderRadius: "8px",
//                                                     fontSize: "13px",
//                                                     fontWeight: 500,
//                                                     border: "1px solid",
//                                                     cursor: "pointer",
//                                                     transition: "all 0.15s",
//                                                     background: state.inputMode === mode ? undefined : "#fff",
//                                                     borderColor: state.inputMode === mode ? "transparent" : "#e5e7eb",
//                                                     color: state.inputMode === mode ? "#fff" : "#6b7280"
//                                                 }}
//                                                 className={state.inputMode === mode ? `bg-gradient-to-r ${config.gradient}` : ""}
//                                         >
//                                             {mode === "text" ? <Type style={{width: "13px", height: "13px"}}/> :
//                                                 <ImageIcon style={{width: "13px", height: "13px"}}/>}
//                                             {mode.charAt(0).toUpperCase() + mode.slice(1)}
//                                         </button>
//                                     ))}
//                                 </div>
//                             )}
//
//                             {/* Text input */}
//                             {state.inputMode === "text" && !state.result && (
//                                 <>
//                                     <label style={{
//                                         display: "block",
//                                         fontSize: "11px",
//                                         fontWeight: 600,
//                                         color: "#6b7280",
//                                         textTransform: "uppercase",
//                                         letterSpacing: "0.08em",
//                                         marginBottom: "8px"
//                                     }}>Your Answer</label>
//                                     <Textarea value={state.answer}
//                                               onChange={(e) => updateSub(idx, {answer: e.target.value})}
//                                               disabled={state.loading} placeholder="Type your answer here…" rows={3}
//                                               style={{resize: "none", fontSize: "15px"}}
//                                               className={`${config.borderColor} ${config.focusBorder}`}/>
//                                 </>
//                             )}
//
//                             {/* Image input */}
//                             {state.inputMode === "image" && !state.result && (
//                                 <div>
//                                     <label style={{
//                                         display: "block",
//                                         fontSize: "11px",
//                                         fontWeight: 600,
//                                         color: "#6b7280",
//                                         textTransform: "uppercase",
//                                         letterSpacing: "0.08em",
//                                         marginBottom: "8px"
//                                     }}>Your Handwritten Answer</label>
//                                     <input ref={(el) => {
//                                         fileInputRefs.current[idx] = el;
//                                     }} type="file" accept="image/*" capture="environment" style={{display: "none"}}
//                                            onChange={(e) => handleImageChange(idx, e)}/>
//                                     {!state.imagePreview ? (
//                                         <button onClick={() => fileInputRefs.current[idx]?.click()}
//                                                 style={{
//                                                     width: "100%",
//                                                     padding: "24px 16px",
//                                                     borderRadius: "10px",
//                                                     border: "2px dashed #d1d5db",
//                                                     background: "#f9fafb",
//                                                     cursor: "pointer",
//                                                     display: "flex",
//                                                     flexDirection: "column",
//                                                     alignItems: "center",
//                                                     gap: "8px"
//                                                 }}
//                                                 onMouseEnter={(e) => {
//                                                     (e.currentTarget as HTMLElement).style.borderColor = "#9ca3af";
//                                                 }}
//                                                 onMouseLeave={(e) => {
//                                                     (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
//                                                 }}>
//                                             <Upload style={{width: "20px", height: "20px", color: "#9ca3af"}}/>
//                                             <p style={{fontSize: "13px", fontWeight: 500, color: "#374151"}}>Upload or
//                                                 take a photo</p>
//                                             <p style={{fontSize: "11px", color: "#9ca3af"}}>Handwritten answers,
//                                                 calculations, diagrams</p>
//                                         </button>
//                                     ) : (
//                                         <div style={{
//                                             position: "relative",
//                                             borderRadius: "10px",
//                                             overflow: "hidden",
//                                             border: "1px solid #e5e7eb"
//                                         }}>
//                                             <img src={state.imagePreview} alt="Your answer" style={{
//                                                 width: "100%",
//                                                 maxHeight: "280px",
//                                                 objectFit: "contain",
//                                                 background: "#f9fafb",
//                                                 display: "block"
//                                             }}/>
//                                             <button onClick={() => clearImage(idx)} style={{
//                                                 position: "absolute",
//                                                 top: "8px",
//                                                 right: "8px",
//                                                 width: "28px",
//                                                 height: "28px",
//                                                 borderRadius: "50%",
//                                                 background: "rgba(0,0,0,0.55)",
//                                                 border: "none",
//                                                 display: "flex",
//                                                 alignItems: "center",
//                                                 justifyContent: "center",
//                                                 cursor: "pointer"
//                                             }}>
//                                                 <X style={{width: "14px", height: "14px", color: "#fff"}}/>
//                                             </button>
//                                             <button onClick={() => fileInputRefs.current[idx]?.click()} style={{
//                                                 position: "absolute",
//                                                 bottom: "8px",
//                                                 right: "8px",
//                                                 fontSize: "11px",
//                                                 fontWeight: 500,
//                                                 color: "#fff",
//                                                 background: "rgba(0,0,0,0.55)",
//                                                 border: "none",
//                                                 padding: "4px 10px",
//                                                 borderRadius: "6px",
//                                                 cursor: "pointer"
//                                             }}>Replace
//                                             </button>
//                                         </div>
//                                     )}
//                                 </div>
//                             )}
//
//                             {/* Image after result */}
//                             {state.inputMode === "image" && state.result && state.imagePreview && (
//                                 <div style={{marginBottom: "16px"}}>
//                                     <p style={{
//                                         fontSize: "11px",
//                                         fontWeight: 600,
//                                         color: "#6b7280",
//                                         textTransform: "uppercase",
//                                         letterSpacing: "0.08em",
//                                         marginBottom: "8px"
//                                     }}>Your Answer (Image)</p>
//                                     <img src={state.imagePreview} alt="Submitted" style={{
//                                         width: "100%",
//                                         maxHeight: "200px",
//                                         objectFit: "contain",
//                                         borderRadius: "8px",
//                                         border: "1px solid #e5e7eb",
//                                         background: "#f9fafb"
//                                     }}/>
//                                 </div>
//                             )}
//
//                             {/* Submit */}
//                             {!state.result && (
//                                 <div style={{marginTop: "12px"}}>
//                                     <Button onClick={() => handleSubmit(idx)} disabled={!canSubmit || state.loading}
//                                             className={`bg-gradient-to-r ${config.gradient} text-white hover:opacity-90 disabled:opacity-40`}>
//                                         {state.loading ? <><Loader2
//                                             style={{width: "15px", height: "15px", marginRight: "8px"}}
//                                             className="animate-spin"/>Evaluating…</> : state.inputMode === "image" ? "Evaluate Image →" : "Submit Answer →"}
//                                     </Button>
//                                 </div>
//                             )}
//
//                             {state.error &&
//                                 <p style={{marginTop: "10px", fontSize: "12px", color: "#ef4444"}}>{state.error}</p>}
//
//                             {/* Stream preview */}
//                             {state.streamBuffer && !state.result && (
//                                 <div style={{
//                                     marginTop: "12px",
//                                     padding: "12px 16px",
//                                     background: "#f9fafb",
//                                     borderRadius: "8px",
//                                     border: "1px solid #e5e7eb"
//                                 }}>
//                                     <p className={config.mutedText} style={{
//                                         fontSize: "11px",
//                                         fontWeight: 600,
//                                         textTransform: "uppercase",
//                                         letterSpacing: "0.08em",
//                                         marginBottom: "6px"
//                                     }}>Thinking…</p>
//                                     <pre style={{
//                                         fontSize: "11px",
//                                         color: "#9ca3af",
//                                         whiteSpace: "pre-wrap",
//                                         fontFamily: "monospace",
//                                         lineHeight: 1.5,
//                                         maxHeight: "80px",
//                                         overflow: "hidden"
//                                     }}>{state.streamBuffer}</pre>
//                                 </div>
//                             )}
//
//                             {/* Results */}
//                             {state.result && (
//                                 <div style={{display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px"}}>
//
//                                     {/* Score banner */}
//                                     <div style={{
//                                         padding: "16px 20px",
//                                         borderRadius: "10px",
//                                         border: `2px solid ${sc.border}`,
//                                         background: sc.bg
//                                     }}>
//                                         <div style={{
//                                             display: "flex",
//                                             alignItems: "center",
//                                             justifyContent: "space-between",
//                                             marginBottom: "10px"
//                                         }}>
//                                             <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
//                                                 <span style={{
//                                                     fontSize: "26px",
//                                                     fontWeight: 700,
//                                                     color: "#111827"
//                                                 }}>{state.result.marksAwarded}/{state.result.totalMarks}</span>
//                                                 <span style={{fontSize: "13px", color: "#6b7280"}}>marks</span>
//                                                 <span style={{
//                                                     fontSize: "12px",
//                                                     fontWeight: 500,
//                                                     padding: "2px 10px",
//                                                     borderRadius: "9999px",
//                                                     background: sc.badge,
//                                                     color: sc.badgeText
//                                                 }}>{scoreLabel(pct)}</span>
//                                             </div>
//                                             <span style={{
//                                                 fontSize: "20px",
//                                                 fontWeight: 700,
//                                                 color: sc.text
//                                             }}>{pct}%</span>
//                                         </div>
//                                         <div style={{
//                                             height: "6px",
//                                             borderRadius: "9999px",
//                                             background: "#e5e7eb",
//                                             overflow: "hidden"
//                                         }}>
//                                             <div style={{
//                                                 height: "100%",
//                                                 borderRadius: "9999px",
//                                                 background: sc.bar,
//                                                 width: `${pct}%`,
//                                                 transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)"
//                                             }}/>
//                                         </div>
//                                     </div>
//
//                                     {/* Feedback */}
//                                     <div style={{
//                                         padding: "16px 20px",
//                                         background: "#f9fafb",
//                                         borderRadius: "10px",
//                                         border: "1px solid #e5e7eb"
//                                     }}>
//                                         <p className={config.textColor} style={{
//                                             fontSize: "11px",
//                                             fontWeight: 600,
//                                             textTransform: "uppercase",
//                                             letterSpacing: "0.08em",
//                                             marginBottom: "8px"
//                                         }}>AI Feedback</p>
//                                         <p style={{
//                                             fontSize: "14px",
//                                             color: "#374151",
//                                             lineHeight: 1.7
//                                         }}>{state.result.feedback}</p>
//                                     </div>
//
//                                     {/* Breakdown */}
//                                     <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
//                                         {state.result.pointsEvaluation.map((pe, i) => (
//                                             <div key={i} style={{
//                                                 display: "flex",
//                                                 gap: "10px",
//                                                 alignItems: "flex-start",
//                                                 padding: "10px 14px",
//                                                 borderRadius: "8px",
//                                                 background: pe.awarded ? "#ecfdf5" : "#fef2f2",
//                                                 border: `1px solid ${pe.awarded ? "#a7f3d0" : "#fecaca"}`
//                                             }}>
//                                                 <span style={{
//                                                     flexShrink: 0,
//                                                     marginTop: "1px"
//                                                 }}>{pe.awarded ? "✅" : "❌"}</span>
//                                                 <div style={{flex: 1}}>
//                                                     <div style={{
//                                                         display: "flex",
//                                                         justifyContent: "space-between",
//                                                         gap: "8px",
//                                                         marginBottom: "3px"
//                                                     }}>
//                                                         <p style={{
//                                                             fontSize: "13px",
//                                                             fontWeight: 500,
//                                                             color: "#111827",
//                                                             lineHeight: 1.4
//                                                         }}>{pe.point}</p>
//                                                         <span style={{
//                                                             fontSize: "12px",
//                                                             fontWeight: 700,
//                                                             flexShrink: 0,
//                                                             color: pe.awarded ? "#065f46" : "#9ca3af"
//                                                         }}>{pe.marksAwarded > 0 ? `+${pe.marksAwarded}` : "0"}</span>
//                                                     </div>
//                                                     <p style={{
//                                                         fontSize: "12px",
//                                                         color: "#6b7280",
//                                                         lineHeight: 1.4
//                                                     }}>{pe.reason}</p>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//
//                                     {/* Model answer */}
//                                     <div
//                                         style={{borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden"}}>
//                                         <button onClick={() => updateSub(idx, {modelOpen: !state.modelOpen})}
//                                                 className={config.textColor}
//                                                 style={{
//                                                     width: "100%",
//                                                     display: "flex",
//                                                     alignItems: "center",
//                                                     justifyContent: "space-between",
//                                                     padding: "12px 16px",
//                                                     background: "none",
//                                                     border: "none",
//                                                     cursor: "pointer",
//                                                     fontSize: "11px",
//                                                     fontWeight: 600,
//                                                     textTransform: "uppercase",
//                                                     letterSpacing: "0.08em"
//                                                 }}>
//                                             <span>Model Answer</span>
//                                             <ChevronDown style={{
//                                                 width: "15px",
//                                                 height: "15px",
//                                                 transition: "transform 0.2s",
//                                                 transform: state.modelOpen ? "rotate(180deg)" : "rotate(0deg)"
//                                             }}/>
//                                         </button>
//                                         {state.modelOpen && (
//                                             <div style={{padding: "0 16px 16px", borderTop: "1px solid #e5e7eb"}}>
//                                                 <p className={config.textColor}
//                                                    style={{fontSize: "14px", lineHeight: 1.6, paddingTop: "14px"}}>
//                                                     {state.result.pointsEvaluation.map((pe) => pe.point).join(". ")}.
//                                                 </p>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 );
//             })}
//
//             {/* ── Navigation ── */}
//             <div style={{display: "flex", gap: "12px", paddingTop: "4px"}}>
//                 {onPrev && (
//                     <Button variant="outline" onClick={onPrev}
//                             className={`flex-1 ${config.borderColor} ${config.hoverBorder} ${config.textColor}`}>
//                         <ChevronLeft style={{width: "16px", height: "16px", marginRight: "4px"}}/> Previous
//                     </Button>
//                 )}
//                 {onNext && (
//                     <Button onClick={onNext}
//                             className={`flex-1 bg-gradient-to-r ${config.gradient} text-white hover:opacity-90`}>
//                         Next Question <ChevronRight style={{width: "16px", height: "16px", marginLeft: "4px"}}/>
//                     </Button>
//                 )}
//             </div>
//         </div>
//     );
// }

"use client";

import {useRef, useState} from "react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {ChevronDown, ChevronLeft, ChevronRight, ImageIcon, Loader2, Paperclip, Type, Upload, X} from "lucide-react";
import {QUIZ_SUBJECTS, type QuizSubject} from "@/components/quiz/subject-config";
import type {EvaluationResult, Question, SubQuestion} from "@/lib/types";
import MathText from "@/components/quiz/MathText";

// ─── Parse helpers (identical to QuestionCard) ────────────────────────────────

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
        bar: "#10b981",
        text: "#065f46",
        bg: "#ecfdf5",
        border: "#a7f3d0",
        badge: "#d1fae5",
        badgeText: "#065f46"
    };
    if (pct >= 50) return {
        bar: "#f59e0b",
        text: "#92400e",
        bg: "#fffbeb",
        border: "#fde68a",
        badge: "#fef3c7",
        badgeText: "#92400e"
    };
    return {bar: "#ef4444", text: "#991b1b", bg: "#fef2f2", border: "#fecaca", badge: "#fee2e2", badgeText: "#991b1b"};
}

// ─── Per-sub-question state ───────────────────────────────────────────────────

interface SubState {
    inputMode: "text" | "image";
    answer: string;
    imageFile: File | null;
    imagePreview: string | null;
    loading: boolean;
    streamBuffer: string;
    result: EvaluationResult | null;
    error: string | null;
    scored: boolean;
    modelOpen: boolean;
}

function defaultSubState(): SubState {
    return {
        inputMode: "text",
        answer: "",
        imageFile: null,
        imagePreview: null,
        loading: false,
        streamBuffer: "",
        result: null,
        error: null,
        scored: false,
        modelOpen: false
    };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    question: Question & { passage: string; questions: SubQuestion[] };
    subject: QuizSubject;
    config: (typeof QUIZ_SUBJECTS)[QuizSubject];
    onScored: (awarded: number, total: number) => void;
    onNext?: () => void;
    onPrev?: () => void;
}

const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    overflow: "hidden"
};

export default function StructuredQuestionCard({question, subject, config, onScored, onNext, onPrev}: Props) {
    const [subStates, setSubStates] = useState<SubState[]>(() =>
        question.questions.map(() => defaultSubState())
    );
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    function updateSub(idx: number, patch: Partial<SubState>) {
        setSubStates((prev) => prev.map((s, i) => i === idx ? {...s, ...patch} : s));
    }

    function handleImageChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => updateSub(idx, {imageFile: file, imagePreview: ev.target?.result as string});
        reader.readAsDataURL(file);
    }

    function clearImage(idx: number) {
        updateSub(idx, {imageFile: null, imagePreview: null});
        const ref = fileInputRefs.current[idx];
        if (ref) ref.value = "";
    }

    async function readStream(res: Response, idx: number, totalMarks: number) {
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
                const evaluation = parseRawEvaluation(jsonPart, totalMarks);
                updateSub(idx, {result: evaluation, streamBuffer: "", loading: false});
                if (!subStates[idx].scored) {
                    onScored(evaluation.marksAwarded, evaluation.totalMarks);
                    updateSub(idx, {scored: true});
                }
                break;
            }
            buffer += chunk;
            updateSub(idx, {streamBuffer: buffer});
        }
    }

    async function handleSubmit(idx: number) {
        const sub = question.questions[idx];
        const state = subStates[idx];
        if (state.loading) return;
        if (state.inputMode === "text" && !state.answer.trim()) return;
        if (state.inputMode === "image" && !state.imageFile) return;

        updateSub(idx, {loading: true, error: null, streamBuffer: "", result: null, modelOpen: false});

        try {
            let res: Response;
            // Prepend the passage to the question text so the LLM has full context
            const fullQuestion = `${question.passage}\n\n${sub.question}`;

            if (state.inputMode === "image" && state.imageFile) {
                const form = new FormData();
                form.append("question", fullQuestion);
                form.append("markingPoints", JSON.stringify(sub.marking_points));
                form.append("totalMarks", String(sub.total_marks));
                form.append("subject", subject);
                form.append("image", state.imageFile);
                res = await fetch("/api/evaluate", {method: "POST", body: form});
            } else {
                res = await fetch("/api/evaluate", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        question: fullQuestion,
                        userAnswer: state.answer,
                        markingPoints: sub.marking_points,
                        totalMarks: sub.total_marks,
                        subject,
                    }),
                });
            }
            await readStream(res, idx, sub.total_marks);
        } catch (e: unknown) {
            updateSub(idx, {error: e instanceof Error ? e.message : "Something went wrong", loading: false});
        }
    }

    return (
        <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>

            {/* ── Passage card ── */}
            <div style={{...card, borderLeft: "4px solid", borderLeftColor: config.activeDot as string}}>
                <div style={{padding: "20px 24px"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px"}}>
            <span className={`${config.badgeBg} ${config.textColor}`}
                  style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: "9999px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em"
                  }}>
              Passage
            </span>
                        <div style={{display: "flex", flexWrap: "wrap", gap: "6px"}}>
                            {question.topics.map((t) => (
                                <span key={t} style={{
                                    fontSize: "11px",
                                    color: "#9ca3af",
                                    padding: "2px 8px",
                                    borderRadius: "9999px",
                                    border: "1px solid #e5e7eb"
                                }}>{t}</span>
                            ))}
                        </div>
                    </div>
                    {/* Passage text — preserve line breaks */}
                    <MathText block text={question.passage} style={{
                        fontSize: "14px",
                        color: "#374151",
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit"
                    }}/>
                    {question.diagram_reference && (
                        <div style={{ marginTop: "16px" }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Paperclip style={{ width: "12px", height: "12px" }} />
                                Diagram
                            </p>
                            <img
                                src={`/${subject}/${question.diagram_reference}`}
                                alt={`Diagram for: ${question.question}`}
                                style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#f9fafb", display: "block" }}
                            />
                        </div>
                    )}
            </div>
        </div>

{/* ── Sub-questions ── */
}
{
    question.questions.map((sub, idx) => {
        const state = subStates[idx];
        const pct = state.result?.percentage ?? 0;
        const sc = scoreColors(pct);
        const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"][idx] ?? `${idx + 1}`;
        const canSubmit = state.inputMode === "text" ? state.answer.trim().length > 0 : state.imageFile !== null;

        return (
            <div key={sub.id} style={{...card}}>
                <div style={{padding: "24px"}}>

                    {/* Sub-question header */}
                    <div style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "16px"
                    }}>
                        <div style={{display: "flex", alignItems: "flex-start", gap: "10px"}}>
                  <span className={`${config.badgeBg} ${config.textColor}`}
                        style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "9999px",
                            flexShrink: 0
                        }}>
                    ({roman})
                  </span>
                            <MathText text={sub.question} style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "#111827",
                                lineHeight: 1.6
                            }}/>
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
                  {sub.total_marks} mark{sub.total_marks > 1 ? "s" : ""}
                </span>
                    </div>

                    {/* Sub-question diagram reference */}

                    {sub.diagram_reference && (
                        <div style={{ marginTop: "16px" }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Paperclip style={{ width: "12px", height: "12px" }} />
                                Diagram
                            </p>
                            <img
                                src={`/${subject}/${sub.diagram_reference}`}
                                alt={`Diagram for: ${question.question}`}
                                style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#f9fafb", display: "block" }}
                            />
                        </div>
                    )}

                    {/* Input mode toggle */}
                    {!state.result && (
                        <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px"}}>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em"
                                    }}>Answer via:</span>
                            {(["text", "image"] as const).map((mode) => (
                                <button key={mode}
                                        onClick={() => updateSub(idx, {
                                            inputMode: mode,
                                            answer: "",
                                            imageFile: null,
                                            imagePreview: null
                                        })}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "5px 12px",
                                            borderRadius: "8px",
                                            fontSize: "13px",
                                            fontWeight: 500,
                                            border: "1px solid",
                                            cursor: "pointer",
                                            transition: "all 0.15s",
                                            background: state.inputMode === mode ? undefined : "#fff",
                                            borderColor: state.inputMode === mode ? "transparent" : "#e5e7eb",
                                            color: state.inputMode === mode ? "#fff" : "#6b7280"
                                        }}
                                        className={state.inputMode === mode ? `bg-gradient-to-r ${config.gradient}` : ""}
                                >
                                    {mode === "text" ? <Type style={{width: "13px", height: "13px"}}/> :
                                        <ImageIcon style={{width: "13px", height: "13px"}}/>}
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Text input */}
                    {state.inputMode === "text" && !state.result && (
                        <>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "8px"
                            }}>Your Answer</label>
                            <Textarea value={state.answer}
                                      onChange={(e) => updateSub(idx, {answer: e.target.value})}
                                      disabled={state.loading} placeholder="Type your answer here…" rows={3}
                                      style={{resize: "none", fontSize: "15px"}}
                                      className={`${config.borderColor} ${config.focusBorder}`}/>
                        </>
                    )}

                    {/* Image input */}
                    {state.inputMode === "image" && !state.result && (
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "8px"
                            }}>Your Handwritten Answer</label>
                            <input ref={(el) => {
                                fileInputRefs.current[idx] = el;
                            }} type="file" accept="image/*" capture="environment" style={{display: "none"}}
                                   onChange={(e) => handleImageChange(idx, e)}/>
                            {!state.imagePreview ? (
                                <button onClick={() => fileInputRefs.current[idx]?.click()}
                                        style={{
                                            width: "100%",
                                            padding: "24px 16px",
                                            borderRadius: "10px",
                                            border: "2px dashed #d1d5db",
                                            background: "#f9fafb",
                                            cursor: "pointer",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = "#9ca3af";
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
                                        }}>
                                    <Upload style={{width: "20px", height: "20px", color: "#9ca3af"}}/>
                                    <p style={{fontSize: "13px", fontWeight: 500, color: "#374151"}}>Upload or
                                        take a photo</p>
                                    <p style={{fontSize: "11px", color: "#9ca3af"}}>Handwritten answers,
                                        calculations, diagrams</p>
                                </button>
                            ) : (
                                <div style={{
                                    position: "relative",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                    border: "1px solid #e5e7eb"
                                }}>
                                    <img src={state.imagePreview} alt="Your answer" style={{
                                        width: "100%",
                                        maxHeight: "280px",
                                        objectFit: "contain",
                                        background: "#f9fafb",
                                        display: "block"
                                    }}/>
                                    <button onClick={() => clearImage(idx)} style={{
                                        position: "absolute",
                                        top: "8px",
                                        right: "8px",
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "50%",
                                        background: "rgba(0,0,0,0.55)",
                                        border: "none",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer"
                                    }}>
                                        <X style={{width: "14px", height: "14px", color: "#fff"}}/>
                                    </button>
                                    <button onClick={() => fileInputRefs.current[idx]?.click()} style={{
                                        position: "absolute",
                                        bottom: "8px",
                                        right: "8px",
                                        fontSize: "11px",
                                        fontWeight: 500,
                                        color: "#fff",
                                        background: "rgba(0,0,0,0.55)",
                                        border: "none",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        cursor: "pointer"
                                    }}>Replace
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Image after result */}
                    {state.inputMode === "image" && state.result && state.imagePreview && (
                        <div style={{marginBottom: "16px"}}>
                            <p style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "8px"
                            }}>Your Answer (Image)</p>
                            <img src={state.imagePreview} alt="Submitted" style={{
                                width: "100%",
                                maxHeight: "200px",
                                objectFit: "contain",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                background: "#f9fafb"
                            }}/>
                        </div>
                    )}

                    {/* Submit */}
                    {!state.result && (
                        <div style={{marginTop: "12px"}}>
                            <Button onClick={() => handleSubmit(idx)} disabled={!canSubmit || state.loading}
                                    className={`bg-gradient-to-r ${config.gradient} text-white hover:opacity-90 disabled:opacity-40`}>
                                {state.loading ? <><Loader2
                                    style={{width: "15px", height: "15px", marginRight: "8px"}}
                                    className="animate-spin"/>Evaluating…</> : state.inputMode === "image" ? "Evaluate Image →" : "Submit Answer →"}
                            </Button>
                        </div>
                    )}

                    {state.error &&
                        <p style={{marginTop: "10px", fontSize: "12px", color: "#ef4444"}}>{state.error}</p>}

                    {/* Stream preview */}
                    {state.streamBuffer && !state.result && (
                        <div style={{
                            marginTop: "12px",
                            padding: "12px 16px",
                            background: "#f9fafb",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb"
                        }}>
                            <p className={config.mutedText} style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "6px"
                            }}>Thinking…</p>
                            <pre style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                                whiteSpace: "pre-wrap",
                                fontFamily: "monospace",
                                lineHeight: 1.5,
                                maxHeight: "80px",
                                overflow: "hidden"
                            }}>{state.streamBuffer}</pre>
                        </div>
                    )}

                    {/* Results */}
                    {state.result && (
                        <div style={{display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px"}}>

                            {/* Score banner */}
                            <div style={{
                                padding: "16px 20px",
                                borderRadius: "10px",
                                border: `2px solid ${sc.border}`,
                                background: sc.bg
                            }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "10px"
                                }}>
                                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                                <span style={{
                                                    fontSize: "26px",
                                                    fontWeight: 700,
                                                    color: "#111827"
                                                }}>{state.result.marksAwarded}/{state.result.totalMarks}</span>
                                        <span style={{fontSize: "13px", color: "#6b7280"}}>marks</span>
                                        <span style={{
                                            fontSize: "12px",
                                            fontWeight: 500,
                                            padding: "2px 10px",
                                            borderRadius: "9999px",
                                            background: sc.badge,
                                            color: sc.badgeText
                                        }}>{scoreLabel(pct)}</span>
                                    </div>
                                    <span style={{
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: sc.text
                                    }}>{pct}%</span>
                                </div>
                                <div style={{
                                    height: "6px",
                                    borderRadius: "9999px",
                                    background: "#e5e7eb",
                                    overflow: "hidden"
                                }}>
                                    <div style={{
                                        height: "100%",
                                        borderRadius: "9999px",
                                        background: sc.bar,
                                        width: `${pct}%`,
                                        transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)"
                                    }}/>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div style={{
                                padding: "16px 20px",
                                background: "#f9fafb",
                                borderRadius: "10px",
                                border: "1px solid #e5e7eb"
                            }}>
                                <p className={config.textColor} style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    marginBottom: "8px"
                                }}>AI Feedback</p>
                                <p style={{
                                    fontSize: "14px",
                                    color: "#374151",
                                    lineHeight: 1.7
                                }}>{state.result.feedback}</p>
                            </div>

                            {/* Breakdown */}
                            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                                {state.result.pointsEvaluation.map((pe, i) => (
                                    <div key={i} style={{
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "flex-start",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        background: pe.awarded ? "#ecfdf5" : "#fef2f2",
                                        border: `1px solid ${pe.awarded ? "#a7f3d0" : "#fecaca"}`
                                    }}>
                                                <span style={{
                                                    flexShrink: 0,
                                                    marginTop: "1px"
                                                }}>{pe.awarded ? "✅" : "❌"}</span>
                                        <div style={{flex: 1}}>
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                gap: "8px",
                                                marginBottom: "3px"
                                            }}>
                                                <MathText text={pe.point} style={{
                                                    fontSize: "13px",
                                                    fontWeight: 500,
                                                    color: "#111827",
                                                    lineHeight: 1.4
                                                }}/>
                                                <span style={{
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                    color: pe.awarded ? "#065f46" : "#9ca3af"
                                                }}>{pe.marksAwarded > 0 ? `+${pe.marksAwarded}` : "0"}</span>
                                            </div>
                                            <p style={{
                                                fontSize: "12px",
                                                color: "#6b7280",
                                                lineHeight: 1.4
                                            }}>{pe.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Model answer */}
                            <div
                                style={{borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden"}}>
                                <button onClick={() => updateSub(idx, {modelOpen: !state.modelOpen})}
                                        className={config.textColor}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "12px 16px",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.08em"
                                        }}>
                                    <span>Model Answer</span>
                                    <ChevronDown style={{
                                        width: "15px",
                                        height: "15px",
                                        transition: "transform 0.2s",
                                        transform: state.modelOpen ? "rotate(180deg)" : "rotate(0deg)"
                                    }}/>
                                </button>
                                {state.modelOpen && (
                                    <div style={{padding: "0 16px 16px", borderTop: "1px solid #e5e7eb"}}>
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "6px",
                                            paddingTop: "14px"
                                        }}>
                                            {state.result.pointsEvaluation.map((pe, i) => (
                                                <MathText key={i} text={`• ${pe.point}`}
                                                          className={config.textColor} style={{
                                                    fontSize: "14px",
                                                    lineHeight: 1.6,
                                                    display: "block"
                                                }}/>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    })
}

{/* ── Navigation ── */
}
    <div style={{display: "flex", gap: "12px", paddingTop: "4px"}}>
        {onPrev && (
            <Button variant="outline" onClick={onPrev}
                    className={`flex-1 ${config.borderColor} ${config.hoverBorder} ${config.textColor}`}>
                <ChevronLeft style={{width: "16px", height: "16px", marginRight: "4px"}}/> Previous
            </Button>
        )}
        {onNext && (
            <Button onClick={onNext}
                    className={`flex-1 bg-gradient-to-r ${config.gradient} text-white hover:opacity-90`}>
                Next Question <ChevronRight style={{width: "16px", height: "16px", marginLeft: "4px"}}/>
            </Button>
        )}
    </div>
</div>
)

}
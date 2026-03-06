"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Atom, Inbox as InboxIcon, MousePointerClick} from "lucide-react";
import {QUIZ_SUBJECTS, type QuizSubject} from "@/components/quiz/subject-config";
import SubjectSelector from "@/components/quiz/SubjectSelector";
import TopicSelector, {type TopicSelection} from "@/components/quiz/TopicSelector";
import QuestionCard from "@/components/quiz/QuestionCard";
import StructuredQuestionCard from "@/components/quiz/StructuredQuestionCard";
import type {Question} from "@/lib/types";
import {isStructured} from "@/lib/types";
import {UserMenu} from "@/components/user-menu.js";

export default function QuizPage() {
    const [subject, setSubject] = useState<QuizSubject | null>(null);
    const [selection, setSelection] = useState<TopicSelection | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [sessionScore, setSessionScore] = useState({awarded: 0, total: 0});
    const [answeredCount, setAnsweredCount] = useState(0);
    const [loadingQ, setLoadingQ] = useState(false);

    // Fetch all questions for the subject once
    useEffect(() => {
        if (!subject) return;
        setLoadingQ(true);
        setSelection(null);
        setQuestions([]);
        fetch(`/api/questions?subject=${subject}`)
            .then((r) => r.json())
            .then((data: Question[]) => setQuestions(data))
            .finally(() => setLoadingQ(false));
    }, [subject]);

    // Reset question index & session when selection changes
    useEffect(() => {
        setCurrentIdx(0);
        setSessionScore({awarded: 0, total: 0});
        setAnsweredCount(0);
    }, [selection]);

    const config = subject ? QUIZ_SUBJECTS[subject] : null;
    const Icon = config?.icon;

    // Filter by topic + optionally subtopic
    const filteredQuestions = selection
        ? questions.filter((q) => {
            const topicMatch = q.topics[0] === selection.topic;
            const subtopicMatch = selection.subtopic ? q.topics[1] === selection.subtopic : true;
            return topicMatch && subtopicMatch;
        })
        : [];

    const currentQuestion = filteredQuestions[currentIdx] ?? null;

    function handleScored(awarded: number, total: number) {
        setSessionScore((prev) => ({awarded: prev.awarded + awarded, total: prev.total + total}));
        setAnsweredCount((c) => c + 1);
    }

    function handleNext() {
        setCurrentIdx((i) => Math.min(i + 1, filteredQuestions.length - 1));
    }

    function handlePrev() {
        setCurrentIdx((i) => Math.max(i - 1, 0));
    }

    // ── No subject ───────────────────────────────────────────────────────────────
    if (!subject) {
        return (
            <div style={{minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f9fafb"}}>
                <Header subject={null} config={null} onSubjectChange={setSubject}/>
                <SubjectSelector onSelect={(s) => {
                    setSubject(s);
                }}/>
            </div>
        );
    }

    // ── Subject selected ─────────────────────────────────────────────────────────
    return (
        <div style={{minHeight: "100vh", display: "flex", flexDirection: "column"}}
             className={`bg-gradient-to-br ${config!.bgGradient}`}>

            {/* Sticky header + score strip */}
            <div style={{position: "sticky", top: 0, zIndex: 10}}>
                <Header subject={subject} config={config} onSubjectChange={(s) => {
                    setSubject(s);
                    setSelection(null);
                }}/>

                {answeredCount > 0 && (
                    <div style={{
                        background: "#fff",
                        borderBottom: "1px solid #e5e7eb",
                        padding: "8px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "13px"
                    }}>
                        <span style={{color: "#6b7280", whiteSpace: "nowrap"}}>{answeredCount} answered</span>
                        <span style={{color: "#d1d5db"}}>·</span>
                        <span className={`font-semibold ${config!.textColor}`} style={{whiteSpace: "nowrap"}}>
              {sessionScore.awarded}/{sessionScore.total} marks
            </span>
                        <div style={{
                            flex: 1,
                            height: "6px",
                            borderRadius: "9999px",
                            background: "#f3f4f6",
                            overflow: "hidden"
                        }}>
                            <div
                                className={config!.progressColor}
                                style={{
                                    height: "100%",
                                    borderRadius: "9999px",
                                    transition: "width 0.5s",
                                    width: sessionScore.total ? `${Math.round((sessionScore.awarded / sessionScore.total) * 100)}%` : "0%"
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Main content */}
            <div style={{flex: 1, overflowY: "auto"}}>
                <div style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    padding: "24px 24px 48px",
                    display: "flex",
                    gap: "28px",
                    alignItems: "flex-start"
                }}>

                    {/* ── Left panel: back + topic selector ── */}
                    <div style={{width: "460px", flexShrink: 0}}>
                        <div style={{
                            background: "#fff",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb",
                            padding: "16px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                        }}>
                            <p style={{fontSize: "12px", fontWeight: 600, color: "#111827", marginBottom: "14px"}}>
                                Select a topic to practice
                            </p>
                            {loadingQ ? (
                                <p style={{fontSize: "13px", color: "#9ca3af"}}>Loading…</p>
                            ) : (
                                <TopicSelector
                                    subject={subject}
                                    config={config!}
                                    selected={selection}
                                    onSelect={setSelection}
                                />
                            )}
                        </div>
                    </div>

                    {/* ── Right panel: questions ── */}
                    <div style={{flex: 1, minWidth: 0}}>
                        {!selection ? (
                            // Prompt to pick a topic
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "320px",
                                background: "#fff",
                                borderRadius: "12px",
                                border: "1px dashed #e5e7eb",
                                gap: "8px"
                            }}>
                                <MousePointerClick style={{width: "28px", height: "28px", color: "#9ca3af"}}/>
                                <p style={{fontSize: "14px", fontWeight: 500, color: "#6b7280"}}>Select a topic to
                                    begin</p>
                                <p style={{fontSize: "12px", color: "#9ca3af"}}>Choose a topic or subtopic from the
                                    left</p>
                            </div>
                        ) : filteredQuestions.length === 0 ? (
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "320px",
                                background: "#fff",
                                borderRadius: "12px",
                                border: "1px dashed #e5e7eb",
                                gap: "8px"
                            }}>
                                <InboxIcon style={{width: "28px", height: "28px", color: "#9ca3af"}}/>
                                <p style={{fontSize: "14px", fontWeight: 500, color: "#6b7280"}}>No questions yet</p>
                                <p style={{fontSize: "12px", color: "#9ca3af"}}>
                                    No questions found for{" "}
                                    <strong>{selection.subtopic ?? selection.topic}</strong>
                                </p>
                            </div>
                        ) : (
                            <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                                {/* Progress row */}
                                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                                    <div>
                                        <p style={{fontSize: "13px", color: "#6b7280"}}>
                                            Question{" "}
                                            <span
                                                className={`font-semibold ${config!.textColor}`}>{currentIdx + 1}</span>
                                            {" "}of {filteredQuestions.length}
                                        </p>
                                        <p style={{fontSize: "11px", color: "#9ca3af", marginTop: "2px"}}>
                                            {selection.subtopic ?? selection.topic}
                                        </p>
                                    </div>
                                    {/* Dot navigator */}
                                    <div style={{
                                        display: "flex",
                                        gap: "5px",
                                        flexWrap: "wrap",
                                        justifyContent: "flex-end",
                                        maxWidth: "180px"
                                    }}>
                                        {filteredQuestions.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentIdx(i)}
                                                style={{
                                                    width: "8px",
                                                    height: "8px",
                                                    borderRadius: "50%",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    padding: 0,
                                                    transition: "all 0.2s",
                                                    background: i === currentIdx ? config!.activeDot : "#d1d5db",
                                                    transform: i === currentIdx ? "scale(1.4)" : "scale(1)"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {currentQuestion && (
                                    isStructured(currentQuestion) ? (
                                        <StructuredQuestionCard
                                            key={`${currentQuestion.id}-${selection.topic}-${selection.subtopic}`}
                                            question={currentQuestion}
                                            subject={subject}
                                            config={config!}
                                            onScored={handleScored}
                                            onNext={currentIdx < filteredQuestions.length - 1 ? handleNext : undefined}
                                            onPrev={currentIdx > 0 ? handlePrev : undefined}
                                        />
                                    ) : (
                                        <QuestionCard
                                            key={`${currentQuestion.id}-${selection.topic}-${selection.subtopic}`}
                                            question={currentQuestion as any}
                                            subject={subject}
                                            config={config!}
                                            onScored={handleScored}
                                            onNext={currentIdx < filteredQuestions.length - 1 ? handleNext : undefined}
                                            onPrev={currentIdx > 0 ? handlePrev : undefined}
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

function Header({subject, config, onSubjectChange}: {
    subject: QuizSubject | null;
    config: (typeof QUIZ_SUBJECTS)[QuizSubject] | null;
    onSubjectChange: (s: QuizSubject) => void;
}) {
    return (
        <header style={{background: "#fff", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px"}}>

                {/* SciLearn logo — same as home/chat pages */}
                <div style={{display: "flex", alignItems: "center", gap: "10px", flexShrink: 0}}>
                    <div style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #059669, #0d9488)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 6px rgba(5,150,105,0.25)",
                    }}>
                        <Atom style={{width: "17px", height: "17px", color: "#fff"}} strokeWidth={2} />
                    </div>
                    <div>
                        <h1 style={{fontSize: "15px", fontWeight: 600, color: "#111827", lineHeight: 1.2}}>
                            {config ? `${config.name} Practice` : "SciLearn"}
                        </h1>
                        <p style={{fontSize: "12px", color: "#9ca3af", marginTop: "1px"}}>
                            GCE A/L examquestions with AI evaluation
                        </p>
                    </div>
                </div>

                <div style={{flex: 1}} />

                {/* Subject buttons + UserMenu */}
                <nav style={{display: "flex", alignItems: "center", gap: "8px", flexShrink: 0}}>
                    {(Object.entries(QUIZ_SUBJECTS) as [QuizSubject, (typeof QUIZ_SUBJECTS)[QuizSubject]][]).map(([key, cfg]) => {
                        const SubjectIcon = cfg.icon;
                        const isActive = subject === key;
                        return (
                            <Button key={key} variant={isActive ? "default" : "outline"} size="sm"
                                    onClick={() => onSubjectChange(key)}
                                    className={isActive ? `bg-gradient-to-r ${cfg.gradient} text-white border-0 hover:opacity-90` : ""}>
                                <SubjectIcon style={{width: "16px", height: "16px", marginRight: "6px"}}/>
                                <span className="hidden sm:inline">{cfg.name}</span>
                            </Button>
                        );
                    })}

                    <div style={{width: "1px", height: "20px", background: "#e5e7eb", margin: "0 2px"}} />

                    <UserMenu />
                </nav>
            </div>
        </header>
    );
}
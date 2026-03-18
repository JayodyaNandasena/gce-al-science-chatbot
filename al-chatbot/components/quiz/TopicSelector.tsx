"use client";

import {QUIZ_SUBJECTS, type QuizSubject} from "@/components/quiz/subject-config";
import {SUBJECT_TOPICS} from "@/components/quiz/subject-topics";
import {ChevronRight} from "lucide-react";

export interface TopicSelection {
    topic: string;
    subtopic: string | null;
}

interface Props {
    subject: QuizSubject;
    config: (typeof QUIZ_SUBJECTS)[QuizSubject];
    selected: TopicSelection | null;
    onSelect: (sel: TopicSelection) => void;
    hideAllSubtopics?: boolean;
}

export default function TopicSelector({subject, config, selected, onSelect, hideAllSubtopics = false}: Props) {
    const tree = SUBJECT_TOPICS[subject] ?? {};
    const topics = Object.keys(tree);

    const activeTopic = selected?.topic ?? null;
    const activeSubtopic = selected?.subtopic ?? null;

    return (
        <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>

            {/* ── Topic list ── */}
            <p style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "4px"
            }}>
                Topic
            </p>

            {topics.map((topic) => {
                const isActive = activeTopic === topic;
                return (
                    <div key={topic}>
                        <button
                            onClick={() => onSelect({topic, subtopic: null})}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: isActive ? 600 : 400,
                                textAlign: "left",
                                cursor: "pointer",
                                border: "1px solid",
                                borderColor: isActive ? "transparent" : "#e5e7eb",
                                transition: "all 0.15s",
                                background: isActive ? undefined : "#fff",
                                color: isActive ? "#fff" : "#374151",
                            }}
                            className={isActive ? `bg-gradient-to-r ${config.gradient}` : ""}
                        >
                            <span style={{flex: 1, lineHeight: 1.3}}>{topic}</span>
                            {tree[topic].length > 0 && (
                                <ChevronRight
                                    style={{
                                        width: "13px", height: "13px", flexShrink: 0,
                                        opacity: isActive ? 1 : 0.4,
                                        transform: isActive ? "rotate(90deg)" : "none",
                                        transition: "transform 0.15s"
                                    }}
                                />
                            )}
                        </button>

                        {/* ── Subtopics inline below active topic ── */}
                        {isActive && tree[activeTopic]?.length > 0 && (
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                marginTop: "4px",
                                marginLeft: "20px",
                                paddingLeft: "12px",
                                borderLeft: "2px solid #e5e7eb"
                            }}>

                                {!hideAllSubtopics && (
                                    <button
                                        onClick={() => onSelect({topic: activeTopic, subtopic: null})}
                                        style={{
                                            padding: "6px 12px", borderRadius: "8px", fontSize: "12px",
                                            textAlign: "left", cursor: "pointer", border: "1px solid",
                                            fontWeight: activeSubtopic === null ? 600 : 400,
                                            borderColor: activeSubtopic === null ? "transparent" : "#e5e7eb",
                                            background: activeSubtopic === null ? "#dbeafe" : "#f9fafb",
                                            color: activeSubtopic === null ? "#1d4ed8" : "#6b7280",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        All subtopics
                                    </button>
                                )}

                                {tree[activeTopic].map((subtopic) => {
                                    const isActiveSub = activeSubtopic === subtopic;
                                    return (
                                        <button
                                            key={subtopic}
                                            onClick={() => onSelect({topic: activeTopic, subtopic})}
                                            style={{
                                                padding: "6px 12px", borderRadius: "8px", fontSize: "12px",
                                                textAlign: "left", cursor: "pointer", border: "1px solid",
                                                fontWeight: isActiveSub ? 600 : 400,
                                                borderColor: isActiveSub ? "transparent" : "#e5e7eb",
                                                background: isActiveSub ? "#dbeafe" : "#f9fafb",
                                                color: isActiveSub ? "#1d4ed8" : "#6b7280",
                                                transition: "all 0.15s",
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {subtopic}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
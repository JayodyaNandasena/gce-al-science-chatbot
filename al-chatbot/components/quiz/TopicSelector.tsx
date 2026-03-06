// "use client";
//
// import { QUIZ_SUBJECTS, type QuizSubject } from "@/components/quiz/subject-config";
// import { SUBJECT_TOPICS } from "@/components/quiz/subject-topics";
// import { ChevronRight } from "lucide-react";
//
// export interface TopicSelection {
//     topic: string;
//     subtopic: string | null; // null = all subtopics under this topic
// }
//
// interface Props {
//     subject: QuizSubject;
//     config: (typeof QUIZ_SUBJECTS)[QuizSubject];
//     selected: TopicSelection | null;
//     onSelect: (sel: TopicSelection) => void;
// }
//
// export default function TopicSelector({ subject, config, selected, onSelect }: Props) {
//     const tree = SUBJECT_TOPICS[subject] ?? {};
//     const topics = Object.keys(tree);
//
//     const activeTopic = selected?.topic ?? null;
//     const activeSubtopic = selected?.subtopic ?? null;
//
//     return (
//         <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
//
//             {/* ── Topic column ── */}
//             <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "220px", maxWidth: "240px" }}>
//                 <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
//                     Topic
//                 </p>
//                 {topics.map((topic) => {
//                     const isActive = activeTopic === topic;
//                     return (
//                         <button
//                             key={topic}
//                             onClick={() => onSelect({ topic, subtopic: null })}
//                             style={{
//                                 display: "flex", alignItems: "center", justifyContent: "space-between",
//                                 padding: "8px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: isActive ? 600 : 400,
//                                 textAlign: "left", cursor: "pointer", border: "1px solid",
//                                 borderColor: isActive ? "transparent" : "#e5e7eb",
//                                 transition: "all 0.15s",
//                                 background: isActive ? undefined : "#fff",
//                                 color: isActive ? "#fff" : "#374151",
//                             }}
//                             className={isActive ? `bg-gradient-to-r ${config.gradient}` : ""}
//                         >
//                             <span style={{ flex: 1, lineHeight: 1.3 }}>{topic}</span>
//                             {tree[topic].length > 0 && (
//                                 <ChevronRight style={{ width: "13px", height: "13px", flexShrink: 0, opacity: isActive ? 1 : 0.4 }} />
//                             )}
//                         </button>
//                     );
//                 })}
//             </div>
//
//             {/* ── Subtopic column — only when active topic has subtopics ── */}
//             {activeTopic && tree[activeTopic]?.length > 0 && (
//                 <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
//                     <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
//                         Subtopic
//                     </p>
//
//                     {/* "All subtopics" option */}
//                     <button
//                         onClick={() => onSelect({ topic: activeTopic, subtopic: null })}
//                         style={{
//                             padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
//                             textAlign: "left", cursor: "pointer", border: "1px solid",
//                             fontWeight: activeSubtopic === null ? 600 : 400,
//                             borderColor: activeSubtopic === null ? "transparent" : "#e5e7eb",
//                             background: activeSubtopic === null ? undefined : "#fff",
//                             color: activeSubtopic === null ? "#fff" : "#374151",
//                             transition: "all 0.15s",
//                         }}
//                         className={activeSubtopic === null ? `bg-gradient-to-r ${config.gradient}` : ""}
//                     >
//                         All subtopics
//                     </button>
//
//                     {tree[activeTopic].map((subtopic) => {
//                         const isActive = activeSubtopic === subtopic;
//                         return (
//                             <button
//                                 key={subtopic}
//                                 onClick={() => onSelect({ topic: activeTopic, subtopic })}
//                                 style={{
//                                     padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
//                                     textAlign: "left", cursor: "pointer", border: "1px solid",
//                                     fontWeight: isActive ? 600 : 400,
//                                     borderColor: isActive ? "transparent" : "#e5e7eb",
//                                     background: isActive ? undefined : "#fff",
//                                     color: isActive ? "#fff" : "#374151",
//                                     transition: "all 0.15s",
//                                     lineHeight: 1.3,
//                                 }}
//                                 className={isActive ? `bg-gradient-to-r ${config.gradient}` : ""}
//                             >
//                                 {subtopic}
//                             </button>
//                         );
//                     })}
//                 </div>
//             )}
//         </div>
//     );
// }

"use client";

import { QUIZ_SUBJECTS, type QuizSubject } from "@/components/quiz/subject-config";
import { SUBJECT_TOPICS } from "@/components/quiz/subject-topics";
import { ChevronRight } from "lucide-react";

export interface TopicSelection {
    topic: string;
    subtopic: string | null; // null = all subtopics under this topic
}

interface Props {
    subject: QuizSubject;
    config: (typeof QUIZ_SUBJECTS)[QuizSubject];
    selected: TopicSelection | null;
    onSelect: (sel: TopicSelection) => void;
}

export default function TopicSelector({ subject, config, selected, onSelect }: Props) {
    const tree = SUBJECT_TOPICS[subject] ?? {};
    const topics = Object.keys(tree);

    const activeTopic = selected?.topic ?? null;
    const activeSubtopic = selected?.subtopic ?? null;

    return (
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

            {/* ── Topic column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "220px", maxWidth: "240px" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                    Topic
                </p>
                {topics.map((topic) => {
                    const isActive = activeTopic === topic;
                    return (
                        <button
                            key={topic}
                            onClick={() => onSelect({ topic, subtopic: null })}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "8px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: isActive ? 600 : 400,
                                textAlign: "left", cursor: "pointer", border: "1px solid",
                                borderColor: isActive ? "transparent" : "#e5e7eb",
                                transition: "all 0.15s",
                                background: isActive ? undefined : "#fff",
                                color: isActive ? "#fff" : "#374151",
                            }}
                            className={isActive ? `bg-gradient-to-r ${config.gradient}` : ""}
                        >
                            <span style={{ flex: 1, lineHeight: 1.3 }}>{topic}</span>
                            {tree[topic].length > 0 && (
                                <ChevronRight style={{ width: "13px", height: "13px", flexShrink: 0, opacity: isActive ? 1 : 0.4 }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Subtopic column — only when active topic has subtopics ── */}
            {activeTopic && tree[activeTopic]?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                        Subtopic
                    </p>

                    {/* "All subtopics" option */}
                    <button
                        onClick={() => onSelect({ topic: activeTopic, subtopic: null })}
                        style={{
                            padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
                            textAlign: "left", cursor: "pointer", border: "1px solid",
                            fontWeight: activeSubtopic === null ? 600 : 400,
                            borderColor: activeSubtopic === null ? "transparent" : "#e5e7eb",
                            background: activeSubtopic === null ? undefined : "#fff",
                            color: activeSubtopic === null ? "#fff" : "#374151",
                            transition: "all 0.15s",
                        }}
                        className={activeSubtopic === null ? `bg-gradient-to-r ${config.gradient}` : ""}
                    >
                        All subtopics
                    </button>

                    {tree[activeTopic].map((subtopic) => {
                        const isActive = activeSubtopic === subtopic;
                        return (
                            <button
                                key={subtopic}
                                onClick={() => onSelect({ topic: activeTopic, subtopic })}
                                style={{
                                    padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
                                    textAlign: "left", cursor: "pointer", border: "1px solid",
                                    fontWeight: isActive ? 600 : 400,
                                    borderColor: isActive ? "transparent" : "#e5e7eb",
                                    background: isActive ? undefined : "#fff",
                                    color: isActive ? "#fff" : "#374151",
                                    transition: "all 0.15s",
                                    lineHeight: 1.3,
                                }}
                                className={isActive ? `bg-gradient-to-r ${config.gradient}` : ""}
                            >
                                {subtopic}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
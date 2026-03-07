"use client";

import { QUIZ_SUBJECTS, type QuizSubject } from "@/components/quiz/subject-config";

interface Props {
    onSelect: (subject: QuizSubject) => void;
}

const DESCRIPTIONS: Record<QuizSubject, string> = {
    biology: "Cells, genetics, ecology & more",
    chemistry: "Atoms, bonds, reactions & energy",
    physics: "Mechanics, waves, electricity & nuclear",
};

export default function SubjectSelector({ onSelect }: Props) {
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", background: "#f9fafb" }}>
            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>
                    GCE A/L Science Practice
                </p>
                <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
                    Choose your subject
                </h1>
                <p style={{ fontSize: "14px", color: "#6b7280", maxWidth: "360px", margin: "0 auto" }}>
                    Answer past paper questions and receive instant AI feedback
                </p>
            </div>

            {/* Cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", width: "100%", maxWidth: "640px" }}>
                {(Object.entries(QUIZ_SUBJECTS) as [QuizSubject, (typeof QUIZ_SUBJECTS)[QuizSubject]][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                        <button
                            key={key}
                            onClick={() => onSelect(key)}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                            style={{ position: "relative", borderRadius: "16px", background: "#ffffff", padding: "24px", textAlign: "left", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", transition: "box-shadow 0.2s, transform 0.2s", border: "2px solid #e5e7eb" }}
                        >
                            <div className={`bg-gradient-to-br ${config.gradient}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "12px", marginBottom: "16px" }}>
                                <Icon style={{ width: "20px", height: "20px", color: "#fff" }} />
                            </div>
                            <h2 className={config.textColor} style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>{config.name}</h2>
                            <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>{DESCRIPTIONS[key]}</p>
                            <span className={config.textColor} style={{ position: "absolute", bottom: "16px", right: "16px", fontSize: "12px", fontWeight: 500 }}>Start →</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
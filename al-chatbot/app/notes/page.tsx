"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button.js";
import {Atom, BookOpen, Download, Loader2, Zap} from "lucide-react";
import {QUIZ_SUBJECTS, type QuizSubject} from "@/components/quiz/subject-config.js";
import SubjectSelector from "@/components/quiz/SubjectSelector.js";
import TopicSelector, {type TopicSelection} from "@/components/quiz/TopicSelector.js";
import {UserMenu} from "@/components/user-menu.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type NoteMode = "normal" | "revision";

interface TopicNotes {
    normal: string[];
    revision: string[];
}

/**
 * The JSON can be either shape — both are handled:
 *
 * A) Flat object:
 *    { "Introduction to Biology": { normal: [...], revision: [...] } }
 *
 * B) Array of single-key objects (your current format):
 *    [
 *      { "Introduction to Biology": { normal: [...], revision: [...] } },
 *      { "Chemical and cellular basis of life": {
 *          "Biological molecules & water": { normal: [...], revision: [...] }
 *      }}
 *    ]
 *
 * Keys are matched case-insensitively and punctuation-tolerantly, so
 * "Biological molecules & water" will match "Biological Molecules and Water" etc.
 */
type RawTopicEntry = TopicNotes | Record<string, TopicNotes>;
type SubjectNotesJSON =
    | Record<string, RawTopicEntry>
    | Array<Record<string, RawTopicEntry>>;

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Strip to lowercase letters+digits only — used for fuzzy key matching. */
function norm(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Exact match first, then normalised fallback. */
function findKey(obj: Record<string, unknown>, target: string): string | undefined {
    if (target in obj) return target;
    const t = norm(target);
    return Object.keys(obj).find((k) => norm(k) === t);
}

/**
 * Collapse [ {"A": ...}, {"B": ...} ] → { "A": ..., "B": ... }
 * so the rest of the code works the same regardless of JSON shape.
 */
function flatten(data: SubjectNotesJSON): Record<string, RawTopicEntry> {
    if (!Array.isArray(data)) return data;
    return Object.assign({}, ...data);
}

function getNotes(
    data: SubjectNotesJSON,
    topic: string,
    subtopic?: string | null
): TopicNotes | null {
    const flat = flatten(data);

    if (process.env.NODE_ENV !== "production") {
        console.log("[getNotes] topic:", JSON.stringify(topic), "| subtopic:", JSON.stringify(subtopic));
        console.log("[getNotes] available top-level keys:", Object.keys(flat));
    }

    const topicKey = findKey(flat as Record<string, unknown>, topic);
    if (!topicKey) {
        console.warn("[getNotes] ✗ no match for topic:", topic,
            "\n  wanted norm:", norm(topic),
            "\n  available norms:", Object.keys(flat).map((k) => `"${k}" → "${norm(k)}"`));
        return null;
    }

    const entry = flat[topicKey] as any;

    // Case A: direct notes on this topic (no subtopics layer)
    if (Array.isArray(entry?.normal)) {
        return entry as TopicNotes;
    }

    // Case B: this topic contains subtopics
    if (!subtopic) {
        console.warn("[getNotes] topic has subtopics but no subtopic provided");
        return null;
    }

    if (process.env.NODE_ENV !== "production") {
        console.log("[getNotes] available subtopic keys:", Object.keys(entry));
    }

    const subKey = findKey(entry as Record<string, unknown>, subtopic);
    if (!subKey) {
        console.warn("[getNotes] ✗ no match for subtopic:", subtopic,
            "\n  wanted norm:", norm(subtopic),
            "\n  available norms:", Object.keys(entry).map((k) => `"${k}" → "${norm(k)}"`));
        return null;
    }

    return entry[subKey] as TopicNotes;
}

// ── NoteItem ──────────────────────────────────────────────────────────────────

function NoteItem({html, index, mode}: { html: string; index: number; mode: NoteMode }) {
    const markStyle =
        mode === "revision"
            ? "background:#fef08a;border-radius:3px;padding:0 2px;"
            : "background:#bbf7d0;border-radius:3px;padding:0 2px;";

    const processed = html.replace(/<mark>(.*?)<\/mark>/g, `<mark style="${markStyle}">$1</mark>`);

    if (mode === "normal") {
        return (
            <p
                style={{margin: 0, padding: "4px 0", lineHeight: 1.8, fontSize: "14.5px", color: "#1f2937"}}
                dangerouslySetInnerHTML={{__html: processed}}
            />
        );
    }

    return (
        <div style={{
            display: "flex", gap: "12px", alignItems: "flex-start",
            padding: "10px 14px", borderRadius: "8px",
            background: index % 2 === 0 ? "rgba(255,255,255,0.7)" : "rgba(249,250,251,0.6)",
            border: "1px solid rgba(229,231,235,0.6)", lineHeight: 1.65, fontSize: "14px", color: "#1f2937",
        }}>
            <span style={{
                flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%",
                background: "#fef3c7", color: "#92400e", fontSize: "11px", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", marginTop: "2px",
            }}>
                {index + 1}
            </span>
            <span dangerouslySetInnerHTML={{__html: processed}}/>
        </div>
    );
}

// ── NotesPanel ────────────────────────────────────────────────────────────────

function NotesPanel({
                        notes, mode, onModeChange, topicLabel, subjectName, subject, topic, subtopic,
                    }: {
    notes: TopicNotes;
    mode: NoteMode;
    onModeChange: (m: NoteMode) => void;
    topicLabel: string;
    subjectName: string;
    subject: string;
    topic: string;
    subtopic?: string | null;
}) {
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const items = notes[mode];

    async function handleDownload() {
        setDownloading(true);
        setDownloadError(null);
        try {
            const params = new URLSearchParams({subject, topic, mode});
            if (subtopic) params.set("subtopic", subtopic);
            const res = await fetch(`/api/notes/pdf?${params}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({error: "Unknown error"}));
                throw new Error(err.error ?? "PDF generation failed");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const cd = res.headers.get("Content-Disposition") ?? "";
            const match = cd.match(/filename="?([^"]+)"?/);
            a.download = match?.[1] ?? `${subject}_${topic}_${mode}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setDownloadError(e.message ?? "Failed to download PDF");
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            overflow: "hidden"
        }}>

            {/* Header bar */}
            <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                background: "linear-gradient(to right, #f9fafb, white)"
            }}>
                <div style={{flex: 1, minWidth: 0}}>
                    <p style={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        marginBottom: "2px",
                        fontWeight: 500
                    }}>{subjectName}</p>
                    <h2 style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#111827",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}>
                        {topicLabel}
                    </h2>
                </div>

                {/* Mode toggle */}
                <div style={{display: "flex", background: "#f3f4f6", borderRadius: "10px", padding: "3px", gap: "2px"}}>
                    {(["normal", "revision"] as NoteMode[]).map((m) => (
                        <button key={m} onClick={() => onModeChange(m)} style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "6px 12px", borderRadius: "7px", border: "none",
                            cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.2s",
                            background: mode === m ? "white" : "transparent",
                            color: mode === m ? "#111827" : "#6b7280",
                            boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                        }}>
                            {m === "normal"
                                ? <><BookOpen style={{width: "14px", height: "14px"}}/> Full Notes</>
                                : <><Zap style={{width: "14px", height: "14px"}}/> Revision</>}
                        </button>
                    ))}
                </div>

                {/* Download */}
                <button onClick={handleDownload} disabled={downloading} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", borderRadius: "8px", border: "1px solid #e5e7eb",
                    background: downloading ? "#f9fafb" : "white",
                    color: downloading ? "#9ca3af" : "#374151",
                    fontSize: "13px", fontWeight: 600,
                    cursor: downloading ? "not-allowed" : "pointer",
                    transition: "all 0.2s", whiteSpace: "nowrap",
                }}>
                    {downloading
                        ? <Loader2 style={{width: "14px", height: "14px", animation: "spin 1s linear infinite"}}/>
                        : <Download style={{width: "14px", height: "14px"}}/>}
                    {downloading ? "Generating…" : "Download PDF"}
                </button>
            </div>

            {/* Download error */}
            {downloadError && (
                <div style={{
                    padding: "8px 20px",
                    background: "#fef2f2",
                    borderBottom: "1px solid #fecaca",
                    fontSize: "12px",
                    color: "#991b1b"
                }}>
                    ⚠ {downloadError}
                </div>
            )}

            {/* Mode info bar */}
            <div style={{
                padding: "8px 20px",
                background: mode === "revision" ? "#fffbeb" : "#f0fdf4",
                borderBottom: `1px solid ${mode === "revision" ? "#fde68a" : "#bbf7d0"}`,
                display: "flex", alignItems: "center", gap: "8px",
                fontSize: "12px", color: mode === "revision" ? "#92400e" : "#065f46", fontWeight: 500,
            }}>
                {mode === "revision"
                    ? <><Zap style={{width: "13px", height: "13px", flexShrink: 0}}/> Revision mode — condensed key
                        points for fast review</>
                    : <><BookOpen style={{width: "13px", height: "13px", flexShrink: 0}}/> Full notes — complete
                        explanations with highlighted key terms</>}
                <span style={{marginLeft: "auto", opacity: 0.7}}>{items.length} points</span>
            </div>

            {/* Notes body */}
            <div style={{
                padding: "20px 24px",
                ...(mode === "normal" ? {} : {display: "flex", flexDirection: "column" as const, gap: "6px"}),
            }}>
                {items.map((item, i) => (
                    <NoteItem key={i} html={item} index={i} mode={mode}/>
                ))}
            </div>
        </div>
    );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            textAlign: "center",
            padding: "48px"
        }}>
            <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <BookOpen style={{width: "26px", height: "26px", color: "#d1d5db"}}/>
            </div>
            <div>
                <p style={{fontSize: "15px", fontWeight: 600, color: "#6b7280", margin: 0}}>Select a topic to start
                    reading</p>
                <p style={{fontSize: "13px", color: "#9ca3af", marginTop: "4px"}}>Choose a topic from the panel on the
                    left</p>
            </div>
        </div>
    );
}

function NoNotes({topicLabel}: { topicLabel: string }) {
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            textAlign: "center",
            padding: "48px"
        }}>
            <p style={{fontSize: "15px", fontWeight: 600, color: "#6b7280"}}>No notes found for <em>{topicLabel}</em>
            </p>
            <p style={{fontSize: "13px", color: "#9ca3af"}}>
                Open the browser console — it will show exactly which keys were tried vs what's in the JSON.
            </p>
        </div>
    );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({subject, config, onSubjectChange}: {
    subject: QuizSubject | null;
    config: (typeof QUIZ_SUBJECTS)[QuizSubject] | null;
    onSubjectChange: (s: QuizSubject) => void;
}) {
    return (
        <header
            style={{background: "#fff", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px"}}>
                <div style={{display: "flex", alignItems: "center", gap: "10px", flexShrink: 0}}>
                    <div style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #059669, #0d9488)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 6px rgba(5,150,105,0.25)"
                    }}>
                        <Atom style={{width: "17px", height: "17px", color: "#fff"}} strokeWidth={2}/>
                    </div>
                    <div>
                        <h1 style={{fontSize: "15px", fontWeight: 600, color: "#111827", lineHeight: 1.2}}>
                            {config ? `${config.name} Notes` : "SciLearn"}
                        </h1>
                        <p style={{fontSize: "12px", color: "#9ca3af", marginTop: "1px"}}>GCE A/L revision notes</p>
                    </div>
                </div>
                <div style={{flex: 1}}/>
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
                    <div style={{width: "1px", height: "20px", background: "#e5e7eb", margin: "0 2px"}}/>
                    <UserMenu/>
                </nav>
            </div>
        </header>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotesPage() {
    const [subject, setSubject] = useState<QuizSubject | null>(null);
    const [selection, setSelection] = useState<TopicSelection | null>(null);
    const [notesData, setNotesData] = useState<SubjectNotesJSON | null>(null);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [mode, setMode] = useState<NoteMode>("normal");

    useEffect(() => {
        if (!subject) return;
        setLoadingNotes(true);
        setSelection(null);
        setNotesData(null);
        fetch(`/api/notes?subject=${subject}`)
            .then((r) => r.json())
            .then((data: SubjectNotesJSON) => {
                if (process.env.NODE_ENV !== "production") {
                    const flat = Array.isArray(data) ? Object.assign({}, ...data) : data;
                    console.log("[NotesPage] loaded — top-level keys:", Object.keys(flat));
                }
                setNotesData(data);
            })
            .catch((err) => {
                console.error("[NotesPage] failed to load notes:", err);
                setNotesData(null);
            })
            .finally(() => setLoadingNotes(false));
    }, [subject]);

    useEffect(() => {
        setMode("normal");
    }, [selection]);

    const config = subject ? QUIZ_SUBJECTS[subject] : null;

    const currentNotes =
        selection && notesData
            ? getNotes(notesData, selection.topic, selection.subtopic)
            : null;

    const topicLabel = selection
        ? selection.subtopic ? `${selection.topic} › ${selection.subtopic}` : selection.topic
        : "";

    if (!subject) {
        return (
            <div style={{minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f9fafb"}}>
                <Header subject={null} config={null} onSubjectChange={setSubject}/>
                <SubjectSelector onSelect={(s) => setSubject(s)}/>
            </div>
        );
    }

    return (
        <div style={{height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden"}}
             className={`bg-gradient-to-br ${config!.bgGradient}`}>

            <div style={{flexShrink: 0, zIndex: 10}}>
                <Header subject={subject} config={config}
                        onSubjectChange={(s) => {
                            setSubject(s);
                            setSelection(null);
                        }}/>
            </div>

            <div style={{flex: 1, display: "flex", overflow: "hidden"}}>
                <div style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    padding: "24px",
                    display: "flex",
                    gap: "28px",
                    width: "100%",
                    overflow: "hidden"
                }}>

                    {/* Left: topic selector */}
                    <div className="w-[350px] shrink-0" style={{overflowY: "auto", maxHeight: "100%"}}>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <p className="text-xs font-semibold text-gray-900 mb-3">Select a topic to read</p>
                            {loadingNotes ? (
                                <p className="text-sm text-gray-400">Loading…</p>
                            ) : (
                                <TopicSelector subject={subject} config={config!} selected={selection}
                                               onSelect={setSelection} hideAllSubtopics/>
                            )}
                        </div>
                    </div>

                    {/* Right: notes */}
                    <div style={{flex: 1, minWidth: 0, overflowY: "auto"}}>
                        {!selection ? (
                            <EmptyState/>
                        ) : !currentNotes ? (
                            <NoNotes topicLabel={topicLabel}/>
                        ) : (
                            <NotesPanel
                                notes={currentNotes}
                                mode={mode}
                                onModeChange={setMode}
                                topicLabel={topicLabel}
                                subjectName={config!.name}
                                subject={subject}
                                topic={selection.topic}
                                subtopic={selection.subtopic}
                            />
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
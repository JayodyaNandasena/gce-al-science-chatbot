"use client";

import Link from "next/link";
import {ArrowRight, Atom, BookOpenCheck, Dna, FlaskConical, MessageCircle} from "lucide-react";
import {UserMenu} from "@/components/user-menu.js";

const SUBJECTS = [
    {
        key: "biology",
        name: "Biology",
        icon: Dna,
        desc: "Cell biology, genetics, ecology",
        gradient: "from-emerald-50 to-teal-50",
        border: "#d1fae5",
        iconBg: "#ecfdf5",
        iconColor: "#059669",
    },
    {
        key: "chemistry",
        name: "Chemistry",
        icon: FlaskConical,
        desc: "Reactions, bonding, organic chem",
        gradient: "from-violet-50 to-purple-50",
        border: "#ede9fe",
        iconBg: "#f5f3ff",
        iconColor: "#7c3aed",
    },
    {
        key: "physics",
        name: "Physics",
        icon: Atom,
        desc: "Mechanics, waves, electromagnetism",
        gradient: "from-blue-50 to-indigo-50",
        border: "#dbeafe",
        iconBg: "#eff6ff",
        iconColor: "#2563eb",
    },
];

export default function HomePage() {
    return (
        <>
            <style>{`
                .home-root {
                    font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
                    display: flex;
                    flex-direction: column;
                    height: 100dvh;
                    background: #f8f9fb;
                    overflow: hidden;
                }

                /* NAV */
                .home-nav {
                    flex-shrink: 0;
                    height: 60px;
                    border-bottom: 1px solid #e8eaed;
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    padding: 0 36px;
                    justify-content: space-between;
                }
                .home-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .home-logo-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #059669, #0d9488);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 6px rgba(5,150,105,0.25);
                }
                .home-logo-text {
                    font-weight: 600;
                    font-size: 17px;
                    color: #111827;
                    letter-spacing: -0.3px;
                }

                /* MAIN */
                .home-main {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 28px 36px;
                    overflow: hidden;
                }
                .home-inner {
                    width: 100%;
                    max-width: 880px;
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                }

                /* HERO */
                .home-hero { text-align: center; }
                .home-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 11.5px;
                    font-weight: 600;
                    letter-spacing: 0.09em;
                    text-transform: uppercase;
                    color: #9ca3af;
                    margin-bottom: 14px;
                }
                .home-eyebrow-dot {
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    background: #d1d5db;
                    flex-shrink: 0;
                }
                .home-title {
                    font-size: 42px;
                    font-weight: 700;
                    line-height: 1.12;
                    color: #0f172a;
                    margin: 0 0 12px;
                    letter-spacing: -1px;
                }
                .home-title-accent {
                    background: linear-gradient(135deg, #059669, #0d9488, #2563eb);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .home-subtitle {
                    font-size: 16px;
                    color: #6b7280;
                    line-height: 1.65;
                    max-width: 440px;
                    margin: 0 auto;
                    font-weight: 400;
                }

                /* SUBJECTS */
                .home-subjects {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                .subject-pill {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    padding: 15px 18px;
                    border-radius: 14px;
                    border: 1px solid;
                    background: white;
                    transition: box-shadow 0.15s, transform 0.15s;
                }
                .subject-pill:hover {
                    box-shadow: 0 4px 16px rgba(0,0,0,0.07);
                    transform: translateY(-1px);
                }
                .subject-pill-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .subject-pill-name {
                    font-size: 14.5px;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 2px;
                    letter-spacing: -0.2px;
                }
                .subject-pill-desc {
                    font-size: 12.5px;
                    color: #9ca3af;
                    line-height: 1.4;
                }

                /* CARDS */
                .home-cards {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .feature-card {
                    background: #ffffff;
                    border: 1px solid #e8eaed;
                    border-radius: 16px;
                    padding: 24px 26px;
                    text-decoration: none;
                    display: block;
                    transition: box-shadow 0.2s, transform 0.2s;
                }
                .feature-card:hover {
                    box-shadow: 0 8px 32px rgba(0,0,0,0.09);
                    transform: translateY(-2px);
                }
                .feature-card-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 15px;
                    margin-bottom: 18px;
                }
                .feature-card-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .feature-card-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 4px;
                    letter-spacing: -0.2px;
                }
                .feature-card-desc {
                    font-size: 13.5px;
                    color: #9ca3af;
                    line-height: 1.5;
                }
                .feature-card-badges {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 7px;
                    margin-bottom: 18px;
                }
                .feature-badge {
                    font-size: 12.5px;
                    padding: 4px 11px;
                    border-radius: 7px;
                    font-weight: 500;
                    font-family: inherit;
                }
                .feature-badge-filled {
                    background: #f3f4f6;
                    color: #374151;
                }
                .feature-badge-outline {
                    background: transparent;
                    border: 1px solid #e5e7eb;
                    color: #6b7280;
                }
                .feature-card-cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    transition: gap 0.15s;
                    font-family: inherit;
                }
                .feature-card:hover .feature-card-cta { gap: 10px; }

                /* FOOTER */
                .home-footer {
                    flex-shrink: 0;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-top: 1px solid #f1f3f5;
                }
                .home-footer p {
                    font-size: 12px;
                    color: #d1d5db;
                    letter-spacing: 0.02em;
                    font-family: inherit;
                }
            `}</style>

            <div className="home-root">

                {/* NAV */}
                <header className="home-nav">
                    <div className="home-logo">
                        <div className="home-logo-icon">
                            <Atom size={17} color="white" strokeWidth={2}/>
                        </div>
                        <span className="home-logo-text">SciLearn</span>
                    </div>
                    <UserMenu/>
                </header>

                {/* MAIN */}
                <main className="home-main">
                    <div className="home-inner">

                        {/* HERO */}
                        <section className="home-hero">
                            <div className="home-eyebrow">
                                <span>GCE Advanced Level</span>
                                <span className="home-eyebrow-dot"/>
                                <span>Biology</span>
                                <span className="home-eyebrow-dot"/>
                                <span>Chemistry</span>
                                <span className="home-eyebrow-dot"/>
                                <span>Physics</span>
                            </div>
                            <h1 className="home-title">
                                Master GCE A/L Science{" "}
                                <span className="home-title-accent">with AI</span>
                            </h1>
                            <p className="home-subtitle">
                                Ask questions about the syllabus or practise with past-paper questions — graded
                                instantly by AI.
                            </p>
                        </section>

                        {/* SUBJECTS */}
                        <div className="home-subjects">
                            {SUBJECTS.map(({key, name, icon: Icon, desc, border, iconBg, iconColor}) => (
                                <div key={key} className="subject-pill" style={{borderColor: border}}>
                                    <div className="subject-pill-icon" style={{background: iconBg}}>
                                        <Icon size={19} color={iconColor} strokeWidth={2}/>
                                    </div>
                                    <div>
                                        <div className="subject-pill-name">{name}</div>
                                        <div className="subject-pill-desc">{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CARDS */}
                        <div className="home-cards">

                            <Link href="/chat" className="feature-card">
                                <div className="feature-card-header">
                                    <div className="feature-card-icon"
                                         style={{background: "linear-gradient(135deg,#059669,#0d9488)"}}>
                                        <MessageCircle size={21} color="white" strokeWidth={2}/>
                                    </div>
                                    <div>
                                        <div className="feature-card-title">Ask the chatbot</div>
                                        <div className="feature-card-desc">Get explanations, examples and textbook
                                            references.
                                        </div>
                                    </div>
                                </div>
                                <div className="feature-card-badges">
                                    {["Explain osmosis", "What is Hess's law?", "Derive v² = u² + 2as"].map(eg => (
                                        <span key={eg} className="feature-badge feature-badge-filled">{eg}</span>
                                    ))}
                                </div>
                                <div className="feature-card-cta" style={{color: "#059669"}}>
                                    Start chatting <ArrowRight size={15}/>
                                </div>
                            </Link>

                            <Link href="/quiz" className="feature-card">
                                <div className="feature-card-header">
                                    <div className="feature-card-icon"
                                         style={{background: "linear-gradient(135deg,#2563eb,#0d9488)"}}>
                                        <BookOpenCheck size={21} color="white" strokeWidth={2}/>
                                    </div>
                                    <div>
                                        <div className="feature-card-title">Practice questions</div>
                                        <div className="feature-card-desc">Answer exam-style questions and get instant
                                            AI feedback.
                                        </div>
                                    </div>
                                </div>
                                <div className="feature-card-badges">
                                    {["Instant AI grading", "Upload handwritten work", "Marking scheme breakdown"].map(eg => (
                                        <span key={eg} className="feature-badge feature-badge-outline">{eg}</span>
                                    ))}
                                </div>
                                <div className="feature-card-cta" style={{color: "#0d9488"}}>
                                    Start practising <ArrowRight size={15}/>
                                </div>
                            </Link>

                        </div>

                    </div>
                </main>

                {/* FOOTER */}
                <footer className="home-footer">
                    <p>Designed for Sri Lanka GCE Advanced Level students</p>
                </footer>

            </div>
        </>
    );
}
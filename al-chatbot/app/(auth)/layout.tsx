import {Atom, Dna, FlaskConical} from "lucide-react";

export default function AuthLayout({children}: { children: React.ReactNode }) {
    return (
        <div
            style={{minHeight: "100vh", display: "flex"}}
            className="bg-muted/40"
        >
            {/* Left decorative panel (desktop only) */}
            <div
                className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col relative overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-600 to-blue-800 flex-shrink-0">
                {/* Background blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-16 left-12 opacity-10 animate-pulse">
                        <Dna className="w-32 h-32 text-white"/>
                    </div>
                    <div className="absolute top-1/2 right-8 opacity-10 animate-pulse"
                         style={{animationDelay: "300ms"}}>
                        <FlaskConical className="w-24 h-24 text-white"/>
                    </div>
                    <div className="absolute bottom-24 left-20 opacity-10 animate-pulse"
                         style={{animationDelay: "700ms"}}>
                        <Atom className="w-28 h-28 text-white"/>
                    </div>
                    <div
                        className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"/>
                    <div
                        className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"/>
                </div>

                {/* Panel content */}
                <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center ring-1 ring-white/30">
                            <Atom className="w-5 h-5 text-white"/>
                        </div>
                        <span className="text-white font-semibold text-lg tracking-tight">SciLearn</span>
                    </div>

                    {/* Hero text */}
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <div>
                            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
                                Master GCE A/L<br/>Science with AI
                            </h2>
                            <p className="mt-3 text-white/70 text-base leading-relaxed">
                                Your personal AI tutor for Biology, Chemistry, and Physics — available 24/7.
                            </p>
                        </div>

                        {/* Subject pills */}
                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    icon: Dna,
                                    label: "Biology",
                                    desc: "Cell biology, genetics, ecology",
                                    color: "from-emerald-500/30 to-teal-500/30  border-emerald-400/30"
                                },
                                {
                                    icon: FlaskConical,
                                    label: "Chemistry",
                                    desc: "Reactions, bonding, organic chem",
                                    color: "from-violet-500/30 to-purple-500/30 border-violet-400/30"
                                },
                                {
                                    icon: Atom,
                                    label: "Physics",
                                    desc: "Mechanics, waves, electromagnetism",
                                    color: "from-blue-500/30   to-indigo-500/30 border-blue-400/30"
                                },
                            ].map(({icon: Icon, label, desc, color}) => (
                                <div
                                    key={label}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${color} border backdrop-blur-sm`}
                                >
                                    <Icon className="w-5 h-5 text-white flex-shrink-0"/>
                                    <div>
                                        <p className="text-white font-medium text-sm">{label}</p>
                                        <p className="text-white/60 text-xs">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-white/40 text-xs">
                        Designed for Sri Lanka GCE Advanced Level students
                    </p>
                </div>
            </div>

            {/* Right form panel */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                }}
            >
                {/* Mobile logo — shown only when left panel is hidden */}
                <div className="lg:hidden flex items-center gap-2 mb-8">
                    <div
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-sm">
                        <Atom className="w-5 h-5 text-white"/>
                    </div>
                    <span className="font-semibold text-foreground text-lg">SciLearn</span>
                </div>

                {/* Form card — max width keeps it readable */}
                <div style={{width: "100%", maxWidth: "448px"}}>
                    {children}
                </div>
            </div>
        </div>
    );
}
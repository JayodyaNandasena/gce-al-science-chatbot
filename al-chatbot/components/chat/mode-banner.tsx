import {BookOpen, Lightbulb, X} from "lucide-react";
import {useEffect, useState} from "react";

type Mode = "answer" | "reference";

interface ModeBannerProps {
    mode: Mode;
    gradient: string;
}

export function ModeBanner({mode, gradient}: ModeBannerProps) {
    const [visible, setVisible] = useState(true);

    // Reset visibility whenever mode changes
    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 8000);
        return () => clearTimeout(timer);
    }, [mode]);

    if (!visible) return null;

    const config = {
        answer: {
            icon: Lightbulb,
            title: "Answer Mode",
            description: "I'll explain topics in detail using your textbooks.",
        },
        reference: {
            icon: BookOpen,
            title: "Find It Myself Mode",
            description: "I'll point you to the exact pages and sections to study.",
        },
    }[mode];

    const Icon = config.icon;

    return (
        <div
            className={`mx-4 mb-3 py-2 flex items-center gap-3 bg-gradient-to-r ${gradient} text-white text-sm px-4 py-2.5 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300`}>
            <Icon className="w-4 h-4 shrink-0"/>
            <div className="flex-1">
                <span className="font-semibold">{config.title} — </span>
                {config.description}
            </div>
            <button onClick={() => setVisible(false)} className="opacity-70 hover:opacity-100">
                <X className="w-3.5 h-3.5"/>
            </button>
        </div>

    );
}
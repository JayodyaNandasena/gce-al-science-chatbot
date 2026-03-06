"use client";

// Renders text containing $inline$ and $$block$$ LaTeX using KaTeX loaded from CDN.
// Falls back to plain text if KaTeX hasn't loaded yet.

import {useEffect, useRef} from "react";

interface Props {
    text: string;
    style?: React.CSSProperties;
    className?: string;
    block?: boolean; // if true, wraps in a div; otherwise inline span
}

// Inject KaTeX CSS + JS once
function ensureKaTeX(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if ((window as any).katex) return Promise.resolve();

    return new Promise((resolve) => {
        // CSS
        if (!document.getElementById("katex-css")) {
            const link = document.createElement("link");
            link.id = "katex-css";
            link.rel = "stylesheet";
            link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
            document.head.appendChild(link);
        }
        // JS
        if (!document.getElementById("katex-js")) {
            const script = document.createElement("script");
            script.id = "katex-js";
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
            script.onload = () => resolve();
            script.onerror = () => resolve(); // fail gracefully
            document.head.appendChild(script);
        } else {
            resolve();
        }
    });
}

// Split text into segments: { type: "text"|"inline"|"block", content: string }
function parseSegments(text: string) {
    const segments: { type: "text" | "inline" | "block"; content: string }[] = [];
    // Match $$...$$ first, then $...$
    const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({type: "text", content: text.slice(lastIndex, match.index)});
        }
        if (match[1] !== undefined) {
            segments.push({type: "block", content: match[1]});
        } else if (match[2] !== undefined) {
            segments.push({type: "inline", content: match[2]});
        }
        lastIndex = re.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({type: "text", content: text.slice(lastIndex)});
    }

    return segments;
}

export default function MathText({text, style, className, block}: Props) {
    const ref = useRef<HTMLSpanElement | HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        let cancelled = false;

        ensureKaTeX().then(() => {
            if (cancelled || !ref.current) return;
            const katex = (window as any).katex;
            if (!katex) return;

            const segments = parseSegments(text);
            ref.current.innerHTML = "";

            segments.forEach((seg) => {
                if (seg.type === "text") {
                    ref.current!.appendChild(document.createTextNode(seg.content));
                    return;
                }
                try {
                    const span = document.createElement("span");
                    katex.render(seg.content, span, {
                        throwOnError: false,
                        displayMode: seg.type === "block",
                    });
                    ref.current!.appendChild(span);
                } catch {
                    ref.current!.appendChild(document.createTextNode(`$${seg.content}$`));
                }
            });
        });

        return () => {
            cancelled = true;
        };
    }, [text]);

    // Initial render: show plain text until KaTeX runs
    if (block) {
        return (
            <div ref={ref as React.RefObject<HTMLDivElement>} style={style} className={className}>
                {text}
            </div>
        );
    }
    return (
        <span ref={ref as React.RefObject<HTMLSpanElement>} style={style} className={className}>
      {text}
    </span>
    );
}
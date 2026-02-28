import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion.js";
import { BookOpen, FileText } from "lucide-react";
import Balancer from "react-wrap-balancer";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = {
    content: string;
    subtopic: string;
    unit_number: number;
    source_file: string;
    page_start: number;
    page_end: number;
    content_type: string;
    image_url?: string;
    latex?: string;
};

interface MessageType {
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
}

interface MessageProps {
    message: MessageType;
    sources: Source[];
    config: {
        gradient: string;
        borderColor: string;
        icon: React.ElementType;
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts bracket-style LaTeX delimiters to dollar-sign delimiters
 * that remark-math can parse.
 *
 * \[ ... \]  →  $$ ... $$  (display math)
 * \( ... \)  →  $ ... $    (inline math)
 */
function normalizeLatexDelimiters(content: string): string {
    return content
        .replace(/\\\[/g, "$$")
        .replace(/\\\]/g, "$$")
        .replace(/\\\(/g, "$")
        .replace(/\\\)/g, "$");
}

// ─── Markdown component overrides ─────────────────────────────────────────────

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
    p:      ({ children }) => <p      className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    ul:     ({ children }) => <ul     className="list-disc pl-5 mb-2">{children}</ul>,
    ol:     ({ children }) => <ol     className="list-decimal pl-5 mb-2">{children}</ol>,
    li:     ({ children }) => <li     className="mb-1">{children}</li>,
    h1:     ({ children }) => <h1     className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
    h2:     ({ children }) => <h2     className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
    h3:     ({ children }) => <h3     className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h3>,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceItem({ source, index }: { source: Source; index: number }) {
    const pageRange =
        source.page_end !== source.page_start
            ? `${source.page_start}–${source.page_end}`
            : String(source.page_start);

    return (
        <AccordionItem value={`source-${index}`} className="border-gray-100">
            <AccordionTrigger className="text-xs py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                    <BookOpen className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    <span className="font-medium text-gray-600">{source.subtopic}</span>
                    <span className="text-gray-400 font-normal">· Unit {source.unit_number}</span>
                </div>
            </AccordionTrigger>

            <AccordionContent>
                <div className="text-xs text-gray-600 space-y-2">
                    <div className="flex items-center gap-1 text-gray-400">
                        <FileText className="w-3 h-3" />
                        <span>{source.source_file}, p.{pageRange}</span>
                    </div>

                    <p className="leading-relaxed text-gray-700 bg-gray-50 rounded-lg p-2">
                        {source.content}
                    </p>

                    {source.image_url && (
                        <img
                            src={source.image_url}
                            alt={source.subtopic}
                            className="rounded-lg max-w-full mt-1"
                        />
                    )}

                    {/* Render LaTeX from sources with the same pipeline */}
                    {source.latex && (
                        <div className="bg-gray-50 rounded-lg p-2 overflow-x-auto">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {normalizeLatexDelimiters(source.latex)}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

function SourceList({ sources }: { sources: Source[] }) {
    if (sources.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Sources
            </p>
            <Accordion type="single" collapsible className="w-full">
                {sources.map((source, index) => (
                    <SourceItem key={index} source={source} index={index} />
                ))}
            </Accordion>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Message({ message, sources, config }: Readonly<MessageProps>) {
    if (!message.content) return null;

    const isUser = message.role !== "assistant";
    const Icon   = config.icon;

    return (
        <div className={`flex gap-4 mb-6 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
                <Avatar className={`h-8 w-8 bg-gradient-to-br ${config.gradient} flex-shrink-0`}>
                    <AvatarFallback className="bg-transparent text-white">
                        <Icon className="w-4 h-4" />
                    </AvatarFallback>
                </Avatar>
            )}

            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isUser
                    ? `bg-gradient-to-br ${config.gradient} text-white`
                    : `bg-white text-gray-800 border ${config.borderColor} shadow-sm`
            }`}>
                <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                    {isUser ? (
                        <Balancer>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </Balancer>
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={markdownComponents}
                        >
                            {normalizeLatexDelimiters(message.content)}
                        </ReactMarkdown>
                    )}
                </div>

                {!isUser && <SourceList sources={sources ?? []} />}
            </div>

            {isUser && (
                <Avatar className="h-8 w-8 bg-gradient-to-br from-gray-600 to-gray-700 flex-shrink-0">
                    <AvatarFallback className="bg-transparent text-white text-xs">You</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}
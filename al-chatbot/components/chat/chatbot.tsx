"use client"

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Send } from "lucide-react";
import { SUBJECTS } from "@/components/chat/subject-config.js";
import { ChatHistory } from "@/components/chat/chat-history.js";
import { Button } from "@/components/ui/button.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Message } from "@/components/chat/message.js";
import { TypingIndicator } from "@/components/chat/typing-indicator.js";
import { Textarea } from "@/components/ui/textarea.js";
import { SuggestedQuestions } from "@/components/chat/suggested-questions.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Source = {
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

export type ChatMessage = {
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
};

export type Chat = {
    id: number;
    title: string;
    timestamp: string;
    subject: string;
    messages: ChatMessage[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_API_URL = "http://localhost:3000/api/chat";
const STREAM_DELIMITER = "tokens-ended";
const TITLE_MAX_LENGTH = 30;

const INITIAL_CHATS: Chat[] = [
    { id: 1, title: "Photosynthesis Discussion", timestamp: "2 hours ago", subject: "biology", messages: [] },
    { id: 2, title: "Cell Division Explained",   timestamp: "Yesterday",   subject: "biology", messages: [] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateTitle(text: string): string {
    return text.length > TITLE_MAX_LENGTH
        ? `${text.slice(0, TITLE_MAX_LENGTH)}…`
        : text;
}

function buildAssistantPlaceholder(): ChatMessage {
    return { role: "assistant", content: "", sources: [] };
}

async function parseSourcesFromBuffer(buffer: string): Promise<Source[]> {
    if (!buffer.trim()) return [];
    try {
        const parsed = JSON.parse(buffer.trim());
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        console.warn("Failed to parse sources JSON:", buffer);
        return [];
    }
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────

function useChatStream() {
    const [isStreaming, setIsStreaming] = useState(false);

    const streamResponse = useCallback(
        async (
            question: string,
            subject: string,
            onChunk: (content: string) => void,
            onComplete: (sources: Source[]) => void
        ): Promise<void> => {
            setIsStreaming(true);

            const response = await fetch(CHAT_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, subject, chatHistory: [] }),
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No readable stream available");

            const decoder = new TextDecoder();
            let fullContent = "";
            let sourcesBuffer = "";
            let tokensEnded = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                if (tokensEnded) {
                    sourcesBuffer += chunk;
                    continue;
                }

                if (chunk.includes(STREAM_DELIMITER)) {
                    const [before, after = ""] = chunk.split(STREAM_DELIMITER);
                    fullContent += before;
                    sourcesBuffer += after;
                    tokensEnded = true;
                    onChunk(fullContent.trim());
                    continue;
                }

                fullContent += chunk;
                onChunk(fullContent);
            }

            const sources = await parseSourcesFromBuffer(sourcesBuffer);
            onComplete(sources);
        },
        []
    );

    return { isStreaming, setIsStreaming, streamResponse };
}

// ─── Component ────────────────────────────────────────────────────────────────

const MultiSubjectChatbot = () => {
    const [subject, setSubject]         = useState("biology");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chats, setChats]             = useState<Chat[]>(INITIAL_CHATS);
    const [activeChat, setActiveChat]   = useState<number>(INITIAL_CHATS[0].id);
    const [messages, setMessages]       = useState<ChatMessage[]>([]);
    const [input, setInput]             = useState("");

    const scrollRef    = useRef<HTMLDivElement>(null);
    const textareaRef  = useRef<HTMLTextAreaElement>(null);

    const { isStreaming, setIsStreaming, streamResponse } = useChatStream();

    const config = SUBJECTS[subject];
    const Icon   = config.icon;

    // Initialise greeting whenever the active chat or subject changes
    useEffect(() => {
        setMessages([{ role: "assistant", content: config.greeting, sources: [] }]);
    }, [activeChat, subject, config.greeting]);

    // Auto-scroll to the latest message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isStreaming]);

    // ── Message helpers ──────────────────────────────────────────────────────

    const appendMessage = useCallback((message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    const updateLastMessage = useCallback((updater: (msg: ChatMessage) => ChatMessage) => {
        setMessages((prev) =>
            prev.map((msg, idx) => (idx === prev.length - 1 ? updater(msg) : msg))
        );
    }, []);

    // ── Chat title ───────────────────────────────────────────────────────────

    const setActiveChatTitle = useCallback(
        (title: string) => {
            setChats((prev) =>
                prev.map((chat) =>
                    chat.id === activeChat ? { ...chat, title: truncateTitle(title) } : chat
                )
            );
        },
        [activeChat]
    );

    // ── Send ─────────────────────────────────────────────────────────────────

    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isStreaming) return;

        appendMessage({ role: "user", content: trimmed, sources: [] });

        // Update chat title on the first user message
        if (messages.length === 1) setActiveChatTitle(trimmed);

        setInput("");
        setIsStreaming(true);

        try {
            appendMessage(buildAssistantPlaceholder());

            await streamResponse(
                trimmed,
                subject,
                (content) => updateLastMessage((msg) => ({ ...msg, content })),
                (sources) => {
                    if (sources.length > 0) {
                        updateLastMessage((msg) => ({ ...msg, sources }));
                    }
                }
            );
        } catch (error) {
            console.error("Chat API error:", error);
            updateLastMessage(() => ({
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
                sources: [],
            }));
        } finally {
            setIsStreaming(false);
        }
    }, [
        input,
        isStreaming,
        messages.length,
        subject,
        appendMessage,
        updateLastMessage,
        setActiveChatTitle,
        setIsStreaming,
        streamResponse,
    ]);

    // ── Input handlers ───────────────────────────────────────────────────────

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    const handleSuggestionClick = useCallback((question: string) => {
        setInput(question);
        textareaRef.current?.focus();
    }, []);

    // ── Chat / subject management ────────────────────────────────────────────

    const createNewChat = useCallback(
        (forSubject: string): Chat => ({
            id: Date.now(),
            title: "New Chat",
            timestamp: "Just now",
            subject: forSubject,
            messages: [],
        }),
        []
    );

    const handleNewChat = useCallback(() => {
        const newChat = createNewChat(subject);
        setChats((prev) => [newChat, ...prev]);
        setActiveChat(newChat.id);
    }, [subject, createNewChat]);

    const handleSubjectChange = useCallback(
        (newSubject: string) => {
            setSubject(newSubject);
            const existingChat = chats.find((c) => c.subject === newSubject);
            if (existingChat) {
                setActiveChat(existingChat.id);
            } else {
                const newChat = createNewChat(newSubject);
                setChats((prev) => [newChat, ...prev]);
                setActiveChat(newChat.id);
            }
        },
        [chats, createNewChat]
    );

    // ── Derived ──────────────────────────────────────────────────────────────

    const subjectChats   = chats.filter((c) => c.subject === subject);
    const isFirstMessage = messages.length === 1;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? "block" : "hidden"} lg:block fixed lg:relative z-20 h-full`}>
                <ChatHistory
                    chats={subjectChats}
                    activeChat={activeChat}
                    onChatSelect={setActiveChat}
                    onNewChat={handleNewChat}
                    subject={subject}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-10 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main area */}
            <div className={`flex flex-col flex-1 bg-gradient-to-br ${config.bgGradient}`}>
                {/* Header */}
                <header className="bg-white border-b border-gray-200 shadow-sm">
                    <div className="px-4 py-4 flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen((o) => !o)}
                            className="lg:hidden"
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        <div className={`bg-gradient-to-br ${config.gradient} p-2 rounded-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1">
                            <h1 className="text-xl font-semibold text-gray-800">
                                {config.name} Learning Assistant
                            </h1>
                            <p className="text-sm text-gray-500">
                                Your AI tutor for {config.name.toLowerCase()}
                            </p>
                        </div>

                        {/* Subject switcher */}
                        <nav className="flex gap-2" aria-label="Subject switcher">
                            {Object.entries(SUBJECTS).map(([key, subjectConfig]) => {
                                const SubjectIcon = subjectConfig.icon;
                                const isActive    = subject === key;
                                return (
                                    <Button
                                        key={key}
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleSubjectChange(key)}
                                        aria-pressed={isActive}
                                        className={isActive ? `bg-gradient-to-r ${subjectConfig.gradient}` : ""}
                                    >
                                        <SubjectIcon className="w-4 h-4 mr-2" />
                                        <span className="hidden sm:inline">{subjectConfig.name}</span>
                                    </Button>
                                );
                            })}
                        </nav>
                    </div>
                </header>

                {/* Messages */}
                <main className="flex-1 overflow-hidden">
                    <ScrollArea ref={scrollRef} className="h-full">
                        <div className="max-w-4xl mx-auto px-4 py-6">
                            {messages.map((message, index) => (
                                <Message
                                    key={index}
                                    message={message}
                                    sources={message.sources ?? []}
                                    config={config}
                                />
                            ))}

                            {isStreaming && <TypingIndicator config={config} />}

                            {isFirstMessage && (
                                <SuggestedQuestions
                                    suggestions={config.suggestions}
                                    onSelect={handleSuggestionClick}
                                    config={config}
                                />
                            )}
                        </div>
                    </ScrollArea>
                </main>

                {/* Input */}
                <footer className="bg-white border-t border-gray-200 shadow-lg">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 relative">
                                <Textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Ask a ${config.name.toLowerCase()} question…`}
                                    className={`min-h-[52px] max-h-32 resize-none rounded-xl ${config.borderColor} focus:${config.borderColor} pr-12`}
                                    rows={1}
                                    aria-label="Chat input"
                                />
                            </div>

                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isStreaming}
                                aria-label="Send message"
                                className={`h-[52px] w-[52px] rounded-xl bg-gradient-to-br ${config.gradient} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>

                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Press <kbd className="font-mono">Enter</kbd> to send,{" "}
                            <kbd className="font-mono">Shift + Enter</kbd> for a new line
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default MultiSubjectChatbot;
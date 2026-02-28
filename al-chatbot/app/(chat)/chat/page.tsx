"use client"

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Menu, Send} from "lucide-react";
import {SUBJECTS} from "@/components/chat/subject-config.js";
import {ChatHistory} from "@/components/chat/chat-history.js";
import {Button} from "@/components/ui/button.js";
import {ScrollArea} from "@/components/ui/scroll-area.js";
import {Message} from "@/components/chat/message.js";
import {TypingIndicator} from "@/components/chat/typing-indicator.js";
import {Textarea} from "@/components/ui/textarea.js";
import {SuggestedQuestions} from "@/components/chat/suggested-questions.js";
import {toast} from "sonner";

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

export type Conversation = {
    id: number;
    title: string;
    subject: string;
    updated_at: string;
};

export type User = {
    id: number;
    name?: string;
    email: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_API_URL = "/api/chat";
const CONVERSATIONS_API_URL = "/api/conversations";
const STREAM_DELIMITER = "tokens-ended";
const TITLE_MAX_LENGTH = 15;
const REDIRECT_MARKER = "Please switch to the";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateTitle(text: string): string {
    return text.length > TITLE_MAX_LENGTH
        ? `${text.slice(0, TITLE_MAX_LENGTH)}…`
        : text;
}

function buildAssistantPlaceholder(): ChatMessage {
    return {role: "assistant", content: "", sources: []};
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
            chatHistory: [string, string][],
            onStart: () => void,
            onChunk: (content: string) => void,
            onComplete: (sources: Source[]) => void
        ): Promise<string> => {
            const response = await fetch(CHAT_API_URL, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({question, chatHistory, subject}),
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No readable stream available");

            const decoder = new TextDecoder();
            let fullContent = "";
            let sourcesBuffer = "";
            let tokensEnded = false;
            let started = false;

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, {stream: true});

                if (tokensEnded) {
                    sourcesBuffer += chunk;
                    continue;
                }

                if (!started) {
                    started = true;
                    onStart();
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
            return fullContent.trim();
        },
        []
    );

    return {isStreaming, setIsStreaming, streamResponse};
}

// ─── Component ────────────────────────────────────────────────────────────────

const MultiSubjectChatbot = () => {
    const [subject, setSubject] = useState("biology");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [user, setUser] = useState<User | null>(null);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatHistoryRef = useRef<[string, string][]>([]);

    const {isStreaming, setIsStreaming, streamResponse} = useChatStream();

    const config = SUBJECTS[subject];
    const Icon = config.icon;

    // ── Data fetching ─────────────────────────────────────────────────────────

    const loadConversations = useCallback(async (subjectFilter: string) => {
        try {
            const res = await fetch(
                `${CONVERSATIONS_API_URL}?subject=${subjectFilter}`
            );
            if (!res.ok) throw new Error("Failed to fetch conversations");
            const data: Conversation[] = await res.json();
            setConversations(data);

            if (data.length > 0) {
                setActiveConversationId(data[0].id);
            } else {
                setActiveConversationId(null);
                chatHistoryRef.current = [];
                setMessages([{
                    role: "assistant",
                    content: config.greeting,
                    sources: [],
                }]);
            }
        } catch (error) {
            console.error("Failed to load conversations:", error);
            toast.error("Failed to load conversations");
        }
    }, [config.greeting]);

    const loadMessages = useCallback(async (conversationId: number) => {
        setLoadingMessages(true);
        chatHistoryRef.current = [];

        try {
            const res = await fetch(
                `${CONVERSATIONS_API_URL}/${conversationId}/messages`
            );
            if (!res.ok) throw new Error("Failed to fetch messages");
            const data: ChatMessage[] = await res.json();

            if (data.length === 0) {
                setMessages([{
                    role: "assistant",
                    content: config.greeting,
                    sources: [],
                }]);
            } else {
                setMessages(data);

                // Rebuild LLM history from saved messages (skip redirects)
                const pairs: [string, string][] = [];
                for (let i = 0; i < data.length - 1; i++) {
                    if (
                        data[i].role === "user" &&
                        data[i + 1].role === "assistant" &&
                        !data[i + 1].content.includes(REDIRECT_MARKER)
                    ) {
                        pairs.push([data[i].content, data[i + 1].content]);
                        i++;
                    }
                }
                chatHistoryRef.current = pairs;
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
            toast.error("Failed to load messages");
        } finally {
            setLoadingMessages(false);
        }
    }, [config.greeting]);

    // ── Effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        loadConversations(subject);
    }, [subject]);

    useEffect(() => {
        if (activeConversationId !== null) {
            loadMessages(activeConversationId);
        }
    }, [activeConversationId]);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (data?.user) setUser(data.user); })
            .catch(() => null);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isStreaming]);

    // ── DB helpers ────────────────────────────────────────────────────────────

    const createConversation = useCallback(async (forSubject: string): Promise<Conversation> => {
        const res = await fetch(CONVERSATIONS_API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({subject: forSubject}),
        });
        if (!res.ok) throw new Error("Failed to create conversation");
        return res.json();
    }, []);

    const saveMessage = useCallback(async (
        conversationId: number,
        role: "user" | "assistant",
        content: string,
        sources?: Source[]
    ) => {
        await fetch(`${CONVERSATIONS_API_URL}/${conversationId}/messages`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({role, content, sources}),
        });
    }, []);

    const updateConversationTitle = useCallback(async (
        conversationId: number,
        title: string
    ) => {
        await fetch(`${CONVERSATIONS_API_URL}/${conversationId}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({title}),
        });
        setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? {...c, title} : c))
        );
    }, []);

    // ── Message helpers ───────────────────────────────────────────────────────

    const appendMessage = useCallback((message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    const updateLastMessage = useCallback((updater: (msg: ChatMessage) => ChatMessage) => {
        setMessages((prev) =>
            prev.map((msg, idx) => (idx === prev.length - 1 ? updater(msg) : msg))
        );
    }, []);

    // ── Conversation management ───────────────────────────────────────────────

    const handleNewChat = useCallback(async () => {
        try {
            const newConv = await createConversation(subject);
            setConversations((prev) => [newConv, ...prev]);
            setActiveConversationId(newConv.id);
            chatHistoryRef.current = [];
            setMessages([{role: "assistant", content: config.greeting, sources: []}]);
        } catch (error) {
            console.error("Failed to create conversation:", error);
            toast.error("Failed to create conversation");
        }
    }, [subject, config.greeting, createConversation]);

    const handleSubjectChange = useCallback((newSubject: string) => {
        setSubject(newSubject);
        // loadConversations fires via subject useEffect
    }, []);

    const handleConversationSelect = useCallback((id: number) => {
        setActiveConversationId(id);
    }, []);

    // ── Send ──────────────────────────────────────────────────────────────────

    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isStreaming) return;

        setInput("");
        setIsStreaming(true);

        // Create conversation in DB if none is active
        let conversationId = activeConversationId;
        if (conversationId === null) {
            try {
                const newConv = await createConversation(subject);
                setConversations((prev) => [newConv, ...prev]);
                setActiveConversationId(newConv.id);
                conversationId = newConv.id;
            } catch (error) {
                console.error("Failed to create conversation:", error);
                toast.error("Failed to start conversation");
                setIsStreaming(false);
                return;
            }
        }

        // Add user message to UI and save to DB
        appendMessage({role: "user", content: trimmed, sources: []});
        await saveMessage(conversationId, "user", trimmed);

        // Update title on first user message
        const isFirstMessage = messages.filter((m) => m.role === "user").length === 0;
        if (isFirstMessage) {
            await updateConversationTitle(conversationId, truncateTitle(trimmed));
        }

        try {
            let finalSources: Source[] = [];

            const assistantContent = await streamResponse(
                trimmed,
                subject,
                chatHistoryRef.current,
                () => appendMessage(buildAssistantPlaceholder()),
                (content) => updateLastMessage((msg) => ({...msg, content})),
                (sources) => {
                    finalSources = sources;
                    if (sources.length > 0) {
                        updateLastMessage((msg) => ({...msg, sources}));
                    }
                }
            );

            // Save assistant message to DB
            if (assistantContent) {
                await saveMessage(
                    conversationId,
                    "assistant",
                    assistantContent,
                    finalSources.length > 0 ? finalSources : undefined
                );
            }

            // Update LLM history — skip redirect messages
            if (assistantContent && !assistantContent.includes(REDIRECT_MARKER)) {
                chatHistoryRef.current = [
                    ...chatHistoryRef.current,
                    [trimmed, assistantContent],
                ];
            }

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
        activeConversationId,
        subject,
        messages,
        appendMessage,
        updateLastMessage,
        saveMessage,
        updateConversationTitle,
        createConversation,
        setIsStreaming,
        streamResponse,
    ]);

    // ── Input handlers ────────────────────────────────────────────────────────

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

    const handleLogout = useCallback(async () => {
        await fetch("/api/auth/logout", {method: "POST"});
        toast.success("Signed out successfully");
        setTimeout(() => { window.location.href = "/login"; }, 1000);
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────

    const subjectConversations = conversations.filter((c) => c.subject === subject);
    const isFirstMessage = messages.length === 1;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? "block" : "hidden"} lg:block fixed lg:relative z-20 h-full`}>
                <ChatHistory
                    chats={subjectConversations}
                    activeChat={activeConversationId}
                    onChatSelect={handleConversationSelect}
                    onNewChat={handleNewChat}
                    subject={subject}
                    onClose={() => setSidebarOpen(false)}
                    user={user}
                    onLogout={handleLogout}
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
                            <Menu className="w-5 h-5"/>
                        </Button>

                        <div className={`bg-gradient-to-br ${config.gradient} p-2 rounded-lg`}>
                            <Icon className="w-6 h-6 text-white"/>
                        </div>

                        <div className="flex-1">
                            <h1 className="text-l font-semibold text-gray-800">
                                {config.name} Learning Assistant
                            </h1>
                            <p className="text-sm text-gray-500">
                                Your AI tutor for {config.name.toLowerCase()}
                            </p>
                        </div>

                        <nav className="flex gap-2" aria-label="Subject switcher">
                            {Object.entries(SUBJECTS).map(([key, subjectConfig]) => {
                                const SubjectIcon = subjectConfig.icon;
                                const isActive = subject === key;
                                return (
                                    <Button
                                        key={key}
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleSubjectChange(key)}
                                        aria-pressed={isActive}
                                        className={isActive ? `bg-gradient-to-r ${subjectConfig.gradient}` : ""}
                                    >
                                        <SubjectIcon className="w-4 h-4 mr-2"/>
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
                            {loadingMessages ? (
                                <div className="flex justify-center items-center h-32 text-gray-400 text-sm">
                                    Loading messages…
                                </div>
                            ) : (
                                messages.map((message, index) => (
                                    <Message
                                        key={index}
                                        message={message}
                                        sources={message.sources ?? []}
                                        config={config}
                                    />
                                ))
                            )}

                            {isStreaming && <TypingIndicator config={config}/>}

                            {isFirstMessage && !loadingMessages && (
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
                                    disabled={loadingMessages}
                                />
                            </div>

                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isStreaming || loadingMessages}
                                aria-label="Send message"
                                className={`h-[52px] w-[52px] rounded-xl bg-gradient-to-br ${config.gradient} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
                            >
                                <Send className="w-5 h-5"/>
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
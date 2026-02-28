import React from "react";
import {ChevronLeft, MessageSquare, Plus} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { SUBJECTS } from "@/components/chat/subject-config.js";
import {Button} from "@/components/ui/button.js";

interface Chat {
    id: string;
    title: string;
    timestamp: string;
}

interface ChatHistoryProps {
    chats: Chat[];
    activeChat: string | null;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
    subject: string;
    onClose: () => void;
}

export const ChatHistory = ({
                                chats,
                                activeChat,
                                onChatSelect,
                                onNewChat,
                                subject,
                                onClose,
                            }: ChatHistoryProps) => {
    const config = SUBJECTS[subject];

    if (!config) return null;

    return (
        <div className="w-64 bg-white border-r flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-800">Chat History</h2>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>

                <Button
                    onClick={onNewChat}
                    className={`w-full bg-gradient-to-r ${config.gradient} hover:opacity-90`}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                </Button>
            </div>

            {/* Chat list */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {chats.map((chat) => {
                        const isActive = activeChat === chat.id;

                        return (
                            <button
                                key={chat.id}
                                onClick={() => {
                                    onChatSelect(chat.id);
                                    onClose();
                                }}
                                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                    isActive
                                        ? `bg-gradient-to-r ${config.gradient} text-white`
                                        : "hover:bg-gray-100 text-gray-700"
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <MessageSquare className="h-4 w-4 mt-1 shrink-0" />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {chat.title}
                                        </p>
                                        <p
                                            className={`text-xs mt-1 ${
                                                isActive ? "text-white/80" : "text-gray-500"
                                            }`}
                                        >
                                            {chat.timestamp}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};

import React, {useState} from "react";
import {Atom, ChevronLeft, LogOut, MessageSquare, MoreVertical, Plus, Trash2} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {SUBJECTS} from "@/components/chat/subject-config";
import {Button} from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";

interface Chat {
    id: number;
    title: string;
    updated_at: string;
    subject: string;
}

interface ChatHistoryProps {
    chats: Chat[];
    activeChat: number | null;
    onChatSelect: (chatId: number) => void;
    onNewChat: () => void;
    subject: string;
    onClose: () => void;
    user?: { name?: string; email: string } | null;
    onLogout?: () => void;
    onChatDeleted?: (chatId: number) => void;
}

export const ChatHistory = ({
                                chats,
                                activeChat,
                                onChatSelect,
                                onNewChat,
                                subject,
                                onClose,
                                user,
                                onLogout,
                                onChatDeleted,
                            }: ChatHistoryProps) => {
    const config = SUBJECTS[subject];
    if (!config) return null;

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    const initials = user?.name
        ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? "?";

    const displayName = user?.name || user?.email || "Guest";
    const displayEmail = user?.email || "";

    const handleDeleteConfirm = async () => {
        if (confirmId === null) return;
        const idToDelete = confirmId;
        setDeletingId(idToDelete);
        setConfirmId(null);
        try {
            const res = await fetch(`/api/conversations/${idToDelete}`, {
                method: "DELETE",
            });
            if (res.ok) {
                onChatDeleted?.(idToDelete);
            }
        } catch (err) {
            console.error("Failed to delete conversation", err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <div className="w-64 flex flex-col h-full bg-white border-r border-gray-200 overflow-hidden">

                <header className={`bg-gradient-to-br ${config.gradient} flex-shrink-0`}>
                    <div className="px-4 py-4 mb-1 flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur p-2 rounded-lg ring-1 ring-white/30 flex-shrink-0">
                            <Atom className="w-6 h-6 text-white"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-white font-semibold text-base tracking-tight leading-tight">
                                SciLearn
                            </h1>
                            <p className="text-white/70 text-sm leading-tight">
                                AI Learning Platform
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="lg:hidden text-white hover:bg-white/20 h-9 w-9 flex-shrink-0"
                            aria-label="Close sidebar"
                        >
                            <ChevronLeft className="h-4 w-4"/>
                        </Button>
                    </div>
                </header>

                {/* New chat button */}
                <div className="p-3 border-b border-gray-100 flex-shrink-0">
                    <Button
                        onClick={onNewChat}
                        className={`w-full h-9 rounded-xl bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white text-sm font-medium shadow-sm transition-opacity`}
                    >
                        <Plus className="h-4 w-4 mr-2"/>
                        New Chat
                    </Button>
                </div>

                {/* Chat list */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-2">
                        {chats.length === 0 && (
                            <div className="text-center py-8 px-4">
                                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                                <p className="text-xs text-gray-400">No chats yet. Start a new one!</p>
                            </div>
                        )}

                        {chats.map((chat) => {
                            const isActive = activeChat === chat.id;
                            const isDeleting = deletingId === chat.id;

                            return (
                                <div
                                    key={chat.id}
                                    className={`flex items-center mb-1 rounded-xl overflow-hidden transition-all duration-150 px-2 py-3 ${
                                        isActive
                                            ? `bg-gradient-to-r ${config.gradient} text-white shadow-sm`
                                            : "hover:bg-gray-50 text-gray-700"
                                    } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    {/* Main clickable area — takes all remaining width */}
                                    <button
                                        onClick={() => {
                                            onChatSelect(chat.id);
                                            onClose();
                                        }}
                                        disabled={isDeleting}
                                        className="flex-1 min-w-0 text-left px-3 py-2.5"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate leading-snug">
                                                    {chat.title}
                                                </p>
                                                <p className={`text-xs mt-0.5 truncate ${isActive ? "text-white/70" : "text-gray-400"}`}>
                                                    {new Date(chat.updated_at).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* ⋮ dropdown — fixed width, never shrinks */}
                                    <div className="shrink-0 pr-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    aria-label="Chat options"
                                                    className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                                                        isActive
                                                            ? "text-white/60 hover:text-white hover:bg-white/20"
                                                            : "text-gray-300 hover:text-gray-600 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    <MoreVertical className="h-4 w-4"/>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent side="right" align="start" className="w-36">
                                                <DropdownMenuItem
                                                    onClick={() => setConfirmId(chat.id)}
                                                    className="text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2"/>
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* User footer */}
                {user && (
                    <div className="flex-shrink-0 border-t border-gray-200 shadow-lg bg-white">
                        <div className="px-4 py-4 flex items-center gap-3">
                            <div
                                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}
                            >
                                <span className="text-white text-xs font-semibold">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate leading-none">
                                    {displayName}
                                </p>
                                {user.name && (
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {displayEmail}
                                    </p>
                                )}
                            </div>
                            {onLogout && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onLogout}
                                    className="h-9 w-9 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0 rounded-xl"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="h-4 w-4"/>
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 pb-4 text-center">
                            © SciLearn
                        </p>
                    </div>
                )}
            </div>

            {/* Delete confirmation dialog */}
            <AlertDialog open={confirmId !== null} onOpenChange={(open: any) => !open && setConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The conversation will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
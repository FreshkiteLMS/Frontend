"use client";

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '@/services/api/chat.api';
import { useChatStore } from '@/stores/chat-store';
import { messagePreviewText } from '@/lib/chat-utils';
import type { ChatMessage } from '@/types/chat';

interface ScheduledMessagesModalProps {
    onClose: () => void;
}

function formatScheduledFor(value: string | null): string {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not scheduled';
    return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function ScheduledMessagesModal({ onClose }: ScheduledMessagesModalProps) {
    const conversations = useChatStore((s) => s.conversations);
    const [items, setItems] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await chatService.listScheduled();
            setItems(list);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to load scheduled messages');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const cancel = async (messageId: string) => {
        if (cancellingId) return;
        setCancellingId(messageId);
        try {
            await chatService.cancelScheduled(messageId);
            toast.success('Scheduled message cancelled');
            await load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to cancel message');
        } finally {
            setCancellingId(null);
        }
    };

    const conversationName = (conversationId: string): string => {
        const conv = conversations[conversationId];
        if (!conv) return 'Conversation';
        if (conv.type === 'direct') return conv.other_user?.name || 'Direct message';
        return conv.name || 'Conversation';
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Scheduled messages</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-center">
                            <CalendarClock className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No scheduled messages</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Messages you schedule from the composer show up here.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {items.map((m) => (
                                <li
                                    key={m.id}
                                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {conversationName(m.conversation_id)}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2 break-words">
                                            {messagePreviewText(m)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {formatScheduledFor(m.scheduled_for)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => cancel(m.id)}
                                        disabled={cancellingId === m.id}
                                        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 disabled:opacity-60"
                                        aria-label="Cancel scheduled message"
                                    >
                                        {cancellingId === m.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

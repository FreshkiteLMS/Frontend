"use client";

import { useMemo, useState } from 'react';
import { Check, Search, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatStore } from '@/stores/chat-store';
import { avatarColorFor, initialsOf, resolveFileUrl } from '@/lib/chat-utils';
import type { ChatConversation } from '@/types/chat';

interface ForwardModalProps {
    messageIds: string[];
    onClose: () => void;
}

function conversationTitle(c: ChatConversation): string {
    if (c.type === 'direct') return c.other_user?.name || 'Direct message';
    return c.name || 'Conversation';
}

/**
 * Forward one or more messages to other conversations. Lists the user's
 * conversations from the chat store with search + multi-select.
 */
export function ForwardModal({ messageIds, onClose }: ForwardModalProps) {
    const conversations = useChatStore((s) => s.conversations);
    const order = useChatStore((s) => s.conversationOrder);
    const forwardMessages = useChatStore((s) => s.forwardMessages);

    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    const list = useMemo(() => {
        const items = order.map((id) => conversations[id]).filter((c): c is ChatConversation => Boolean(c));
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((c) => conversationTitle(c).toLowerCase().includes(q));
    }, [order, conversations, query]);

    const toggle = (id: string) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const send = async () => {
        if (sending || selected.length === 0) return;
        setSending(true);
        try {
            await forwardMessages(messageIds, selected);
            toast.success(
                selected.length === 1 ? 'Message forwarded' : `Forwarded to ${selected.length} chats`
            );
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to forward');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        Forward {messageIds.length > 1 ? `${messageIds.length} messages` : 'message'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search conversations…"
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 min-h-0">
                    {list.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">No conversations found.</p>
                    ) : (
                        list.map((c) => {
                            const title = conversationTitle(c);
                            const isSelected = selected.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => toggle(c.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                    {c.avatar_url ? (
                                        <img src={resolveFileUrl(c.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full ${avatarColorFor(c.id)} text-white flex items-center justify-center text-sm font-semibold shrink-0`}>
                                            {initialsOf(title)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{c.type}</p>
                                    </div>
                                    <span
                                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3.5 h-3.5" />}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="flex items-center gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selected.length} selected
                    </span>
                    <button
                        onClick={send}
                        disabled={sending || selected.length === 0}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                        <Send className="w-4 h-4" />
                        {sending ? 'Forwarding…' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}

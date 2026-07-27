"use client";

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Pin, PinOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { useChatStore } from '@/stores/chat-store';
import { messagePreviewText } from '@/lib/chat-utils';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { scrollToMessage } from '@/components/chat/message-bubble';

interface PinnedMessagesBarProps {
    conversation: ChatConversation;
}

export function PinnedMessagesBar({ conversation }: PinnedMessagesBarProps) {
    const { user } = useAuth();
    const pinMessage = useChatStore((s) => s.pinMessage);

    const [pinned, setPinned] = useState<ChatMessage[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [index, setIndex] = useState(0);

    const pinnedKey = (conversation.pinned_message_ids || []).join(',');
    const conversationId = conversation.id;

    const load = useCallback(async () => {
        if (!pinnedKey) {
            setPinned([]);
            return;
        }
        try {
            const list = await chatService.listPinnedMessages(conversationId);
            setPinned(list);
            setIndex(0);
        } catch {
            setPinned([]);
        }
    }, [conversationId, pinnedKey]);

    useEffect(() => {
        void load();
    }, [load]);

    if (pinned.length === 0) return null;

    const isAdmin = user?.role === 'admin';
    const memberRole = conversation.membership?.role;
    const isModerator = memberRole === 'owner' || memberRole === 'moderator' || isAdmin;

    const current = pinned[Math.min(index, pinned.length - 1)];

    const jump = (messageId: string) => {
        const ok = scrollToMessage(messageId);
        if (!ok) toast('That message is further up — scroll to load it');
    };

    const unpin = async (messageId: string) => {
        try {
            await pinMessage(messageId, false);
            setPinned((prev) => prev.filter((m) => m.id !== messageId));
            toast.success('Message unpinned');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to unpin message');
        }
    };

    return (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2">
                <Pin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />

                <button
                    onClick={() => {
                        if (pinned.length > 1 && !expanded) setIndex((i) => (i + 1) % pinned.length);
                        jump(current.id);
                    }}
                    className="flex-1 min-w-0 text-left"
                >
                    <span className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        Pinned message{pinned.length > 1 ? ` ${Math.min(index, pinned.length - 1) + 1}/${pinned.length}` : ''}
                    </span>
                    <span className="block text-xs text-gray-600 dark:text-gray-300 truncate">
                        <span className="font-medium text-gray-900 dark:text-white">{current.sender_name}: </span>
                        {messagePreviewText(current)}
                    </span>
                </button>

                {isModerator && !expanded && (
                    <button
                        onClick={() => unpin(current.id)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                        aria-label="Unpin message"
                    >
                        <PinOff className="w-4 h-4" />
                    </button>
                )}

                {pinned.length > 1 && (
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                        aria-label={expanded ? 'Collapse pinned messages' : 'Expand pinned messages'}
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {expanded && (
                <ul className="max-h-56 overflow-y-auto border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    {pinned.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <button onClick={() => jump(m.id)} className="flex-1 min-w-0 text-left">
                                <span className="block text-xs font-semibold text-gray-900 dark:text-white truncate">
                                    {m.sender_name}
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {messagePreviewText(m)}
                                </span>
                            </button>
                            {isModerator && (
                                <button
                                    onClick={() => unpin(m.id)}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                                    aria-label="Unpin message"
                                >
                                    <PinOff className="w-4 h-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

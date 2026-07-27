"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Loader2, MessagesSquare } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChatStore } from '@/stores/chat-store';
import { formatDaySeparator } from '@/lib/chat-utils';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';

interface MessageListProps {
    conversation: ChatConversation;
}

/** Distance (px) from the bottom within which new messages auto-scroll. */
const STICK_THRESHOLD = 150;
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function sameDay(a: string, b: string): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return (
        da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
    );
}

interface RenderRow {
    message: ChatMessage;
    daySeparator: string | null;
    unreadDivider: boolean;
    showAvatar: boolean;
    showSenderName: boolean;
    compact: boolean;
}

export function MessageList({ conversation }: MessageListProps) {
    const { user } = useAuth();
    const conversationId = conversation.id;

    const messages = useChatStore((s) => s.messages[conversationId]);
    const hasMore = useChatStore((s) => s.hasMore[conversationId]);
    const loadingOlder = useChatStore((s) => s.loadingOlder[conversationId]);
    const loadOlder = useChatStore((s) => s.loadOlder);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    /** scrollHeight captured just before an older page is prepended. */
    const prependHeightRef = useRef<number | null>(null);
    const nearBottomRef = useRef(true);
    const lastCountRef = useRef(0);
    const initialScrollRef = useRef<string | null>(null);

    const [scrolledUp, setScrolledUp] = useState(false);
    const [missedCount, setMissedCount] = useState(0);

    const myId = user?.id || '';

    // Snapshot of the membership state when this conversation was first shown —
    // used to place the "New messages" divider before markRead clears it.
    const openSnapshotRef = useRef<{ id: string; lastReadAt: string | null; unread: number } | null>(null);
    if (!openSnapshotRef.current || openSnapshotRef.current.id !== conversationId) {
        openSnapshotRef.current = {
            id: conversationId,
            lastReadAt: conversation.membership?.last_read_at ?? null,
            unread: conversation.membership?.unread_count ?? 0,
        };
    }

    const list = useMemo(() => messages || [], [messages]);

    // -----------------------------------------------------------------------
    // Row model: day separators + consecutive grouping + unread divider
    // -----------------------------------------------------------------------
    const rows: RenderRow[] = useMemo(() => {
        const snapshot = openSnapshotRef.current;
        let dividerId: string | null = null;
        if (snapshot && snapshot.unread > 0) {
            const firstUnread = list.find((m) => {
                if (m.sender_id === myId || m.type === 'system') return false;
                if (!snapshot.lastReadAt) return true;
                return new Date(m.created_at).getTime() > new Date(snapshot.lastReadAt).getTime();
            });
            dividerId = firstUnread?.id ?? null;
        }

        const isGroupish = conversation.type !== 'direct';

        return list.map((message, index) => {
            const prev = index > 0 ? list[index - 1] : null;
            const daySeparator =
                !prev || !sameDay(prev.created_at, message.created_at)
                    ? formatDaySeparator(message.created_at)
                    : null;

            const continues =
                !!prev &&
                !daySeparator &&
                prev.type !== 'system' &&
                message.type !== 'system' &&
                prev.sender_id === message.sender_id &&
                new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS &&
                dividerId !== message.id;

            return {
                message,
                daySeparator,
                unreadDivider: dividerId === message.id,
                showAvatar: !continues,
                showSenderName: isGroupish && !continues && message.sender_id !== myId,
                compact: continues,
            };
        });
    }, [list, myId, conversation.type]);

    // -----------------------------------------------------------------------
    // Scroll bookkeeping
    // -----------------------------------------------------------------------
    const measure = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        const near = distance <= STICK_THRESHOLD;
        nearBottomRef.current = near;
        setScrolledUp(!near);
        if (near) setMissedCount(0);
    }, []);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
        nearBottomRef.current = true;
        setScrolledUp(false);
        setMissedCount(0);
    }, []);

    // Jump to the bottom when the conversation changes / first paints.
    useLayoutEffect(() => {
        if (list.length === 0) return;
        if (initialScrollRef.current === conversationId) return;
        initialScrollRef.current = conversationId;
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
        nearBottomRef.current = true;
        lastCountRef.current = list.length;
        setScrolledUp(false);
        setMissedCount(0);
    }, [conversationId, list.length]);

    // Preserve scroll offset after prepending an older page; auto-stick otherwise.
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const prevCount = lastCountRef.current;
        const grew = list.length > prevCount;
        lastCountRef.current = list.length;

        if (prependHeightRef.current !== null) {
            const delta = el.scrollHeight - prependHeightRef.current;
            prependHeightRef.current = null;
            if (delta > 0) el.scrollTop = el.scrollTop + delta;
            return;
        }

        if (!grew) return;

        const appended = list.slice(prevCount);
        const ownAppend = appended.some((m) => m.sender_id === myId);

        if (nearBottomRef.current || ownAppend) {
            el.scrollTop = el.scrollHeight;
            nearBottomRef.current = true;
        } else {
            setMissedCount((c) => c + appended.filter((m) => m.type !== 'system').length);
        }
    }, [list, myId]);

    // Top sentinel → load the previous page.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        const root = scrollRef.current;
        if (!sentinel || !root) return;
        if (hasMore === false) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                const state = useChatStore.getState();
                if (state.loadingOlder[conversationId] || state.hasMore[conversationId] === false) return;
                if (!(state.messages[conversationId] || []).length) return;
                prependHeightRef.current = root.scrollHeight;
                void state.loadOlder(conversationId);
            },
            { root, rootMargin: '80px 0px 0px 0px', threshold: 0 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [conversationId, hasMore, loadOlder, list.length]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    if (!messages) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative flex-1 min-h-0 bg-gray-50 dark:bg-gray-950">
            <div ref={scrollRef} onScroll={measure} className="h-full overflow-y-auto py-3">
                {/* Top sentinel / older-page loader */}
                <div ref={sentinelRef} className="h-px w-full" />

                {loadingOlder && (
                    <div className="flex justify-center py-3">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    </div>
                )}

                {hasMore === false && list.length > 0 && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-3">
                        This is the beginning of the conversation
                    </p>
                )}

                {list.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16">
                        <MessagesSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No messages yet.</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Say hello to start the conversation.</p>
                    </div>
                )}

                {rows.map((row) => (
                    // Virtualization (§27): content-visibility lets the browser skip
                    // layout and paint for rows outside the viewport, so a conversation
                    // with thousands of loaded messages stays responsive. Unlike a
                    // windowing library this keeps every row in the DOM, so reverse
                    // infinite scroll, scroll anchoring and in-page jump-to-message
                    // (reply quotes, pinned bar, search results) keep working.
                    // contain-intrinsic-size gives an estimated height so the scrollbar
                    // stays stable before a row is first rendered.
                    <div
                        key={row.message.id}
                        className="[content-visibility:auto] [contain-intrinsic-size:auto_72px]"
                    >
                        {row.daySeparator && (
                            <div className="flex items-center justify-center my-4">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1">
                                    {row.daySeparator}
                                </span>
                            </div>
                        )}

                        {row.unreadDivider && (
                            <div className="flex items-center gap-3 my-4 px-4">
                                <span className="flex-1 h-px bg-red-300 dark:bg-red-800" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400">
                                    New messages
                                </span>
                                <span className="flex-1 h-px bg-red-300 dark:bg-red-800" />
                            </div>
                        )}

                        <MessageBubble
                            message={row.message}
                            conversation={conversation}
                            showAvatar={row.showAvatar}
                            showSenderName={row.showSenderName}
                            compact={row.compact}
                        />
                    </div>
                ))}

                <TypingIndicator conversationId={conversationId} variant="bubble" className="mt-2 ml-8" />

                <div ref={bottomRef} className="h-2" />
            </div>

            {/* Scroll-to-bottom FAB */}
            {scrolledUp && (
                <button
                    onClick={() => scrollToBottom()}
                    className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Scroll to latest messages"
                >
                    <ArrowDown className="w-4 h-4" />
                    {missedCount > 0 && (
                        <span className="min-w-5 h-5 px-1 flex items-center justify-center bg-blue-600 text-white text-xs font-semibold rounded-full">
                            {missedCount > 99 ? '99+' : missedCount}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}

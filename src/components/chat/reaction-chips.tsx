"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, SmilePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '@/services/api/chat.api';
import { useChatStore } from '@/stores/chat-store';
import { avatarColorFor, initialsOf } from '@/lib/chat-utils';
import { ReactionPicker } from '@/components/chat/reaction-picker';
import { EmojiPopover } from '@/components/chat/emoji-popover';
import type { ChatMessage, ChatPerson, ConversationType, ReactionDetail } from '@/types/chat';

/** Who reacted, fetched lazily and cached per message + reaction state. */
const detailCache = new Map<string, ReactionDetail[]>();
const cacheKey = (m: ChatMessage) => `${m.id}:${JSON.stringify(m.reactions ?? [])}`;

export function PersonAvatar({ person, size = 24 }: { person: ChatPerson; size?: number }) {
    if (person.avatar_url) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={person.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
    }
    return (
        <span
            className={`rounded-full ${avatarColorFor(person.id)} text-white flex items-center justify-center font-bold shrink-0`}
            style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
        >
            {initialsOf(person.name)}
        </span>
    );
}

/**
 * Reaction chips under a message. Clicking a chip toggles your own reaction;
 * hovering it (or long-pressing on touch) shows who reacted. "+" opens the
 * quick set, and from there the full emoji picker.
 */
export function ReactionChips({
    message,
    myId,
    isOwn,
    conversationType,
}: {
    message: ChatMessage;
    myId: string;
    isOwn: boolean;
    conversationType: ConversationType;
}) {
    const reactToMessage = useChatStore((s) => s.reactToMessage);
    const [openEmoji, setOpenEmoji] = useState<string | null>(null);
    const [details, setDetails] = useState<ReactionDetail[] | null>(() => detailCache.get(cacheKey(message)) ?? null);
    const [loading, setLoading] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [fullOpen, setFullOpen] = useState(false);
    const hoverTimer = useRef<number | null>(null);
    const longPress = useRef<number | null>(null);
    const plusRef = useRef<HTMLButtonElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const reactions = (message.reactions || []).filter((r) => r.user_ids.length > 0);
    const key = cacheKey(message);

    useEffect(() => {
        setDetails(detailCache.get(key) ?? null);
    }, [key]);

    useEffect(() => () => {
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
        if (longPress.current) window.clearTimeout(longPress.current);
    }, []);

    // Pinned popovers (opened by long-press / keyboard) close on outside tap.
    useEffect(() => {
        if (!openEmoji) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpenEmoji(null);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
        };
    }, [openEmoji]);

    const ensureDetails = async () => {
        const cached = detailCache.get(key);
        if (cached) {
            setDetails(cached);
            return;
        }
        setLoading(true);
        try {
            const fresh = await chatService.listReactions(message.id);
            detailCache.set(key, fresh);
            setDetails(fresh);
        } catch {
            setDetails(null);
        } finally {
            setLoading(false);
        }
    };

    const show = (emoji: string) => {
        setOpenEmoji(emoji);
        void ensureDetails();
    };

    const toggle = (emoji: string) => {
        reactToMessage(message.id, emoji).catch((err) =>
            toast.error(err?.response?.data?.message || err?.message || 'Could not update reaction'),
        );
    };

    const usersFor = (emoji: string) => details?.find((d) => d.emoji === emoji)?.users ?? [];

    return (
        <div ref={rootRef} className={`relative flex flex-wrap items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {reactions.map((r) => {
                const mine = r.user_ids.includes(myId);
                return (
                    <div
                        key={r.emoji}
                        className="relative"
                        onMouseEnter={() => {
                            hoverTimer.current = window.setTimeout(() => show(r.emoji), 350);
                        }}
                        onMouseLeave={() => {
                            if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
                            setOpenEmoji((cur) => (cur === r.emoji ? null : cur));
                        }}
                    >
                        <button
                            onClick={() => toggle(r.emoji)}
                            onTouchStart={() => {
                                longPress.current = window.setTimeout(() => show(r.emoji), 450);
                            }}
                            onTouchEnd={() => longPress.current && window.clearTimeout(longPress.current)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                show(r.emoji);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') show(r.emoji);
                            }}
                            aria-label={`${r.emoji} ${r.user_ids.length} — ${mine ? 'remove your reaction' : 'react'}`}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors ${
                                mine
                                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span className="text-sm leading-none">{r.emoji}</span>
                            <span className="font-semibold tabular-nums">{r.user_ids.length}</span>
                        </button>

                        {openEmoji === r.emoji && (
                            <div
                                role="tooltip"
                                className={`absolute bottom-full mb-1.5 z-50 w-56 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-2 ${isOwn ? 'right-0' : 'left-0'}`}
                            >
                                <p className="px-1 pb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <span className="text-base">{r.emoji}</span> {r.user_ids.length} {r.user_ids.length === 1 ? 'person' : 'people'}
                                </p>
                                {loading && !details ? (
                                    <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                                ) : (
                                    <ul className="space-y-1">
                                        {usersFor(r.emoji).map((p) => (
                                            <li key={p.id} className="flex items-center gap-2 px-1 py-0.5 text-sm text-gray-800 dark:text-gray-100">
                                                <PersonAvatar person={p} size={22} />
                                                <span className="truncate">{p.id === myId ? 'You' : p.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            <button
                ref={plusRef}
                onClick={() => setQuickOpen((v) => !v)}
                className={`flex items-center justify-center w-7 h-6 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-opacity ${
                    reactions.length ? 'opacity-60 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                }`}
                aria-label="Add reaction"
            >
                {reactions.length ? <Plus className="w-3.5 h-3.5" /> : <SmilePlus className="w-3.5 h-3.5" />}
            </button>

            {quickOpen && (
                <div className={`absolute bottom-8 z-50 ${isOwn ? 'right-0' : 'left-0'}`}>
                    <ReactionPicker
                        onPick={(emoji) => toggle(emoji)}
                        onClose={() => setQuickOpen(false)}
                        conversationType={conversationType}
                        onMore={conversationType === 'announcement' ? undefined : () => {
                            setQuickOpen(false);
                            setFullOpen(true);
                        }}
                    />
                </div>
            )}
            {fullOpen && (
                <EmojiPopover
                    anchorRef={plusRef}
                    closeOnPick
                    onPick={(emoji) => {
                        const already = reactions.find((r) => r.emoji === emoji)?.user_ids.includes(myId);
                        if (!already) toggle(emoji);
                    }}
                    onClose={() => setFullOpen(false)}
                />
            )}
        </div>
    );
}

"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, HelpCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '@/services/api/chat.api';
import { courseService } from '@/services/api/course.api';
import { useChatStore } from '@/stores/chat-store';
import type { ChatConversation } from '@/types/chat';

interface DoubtChannelsListProps {
    courseIds: string[];
}

export function DoubtChannelsList({ courseIds }: DoubtChannelsListProps) {
    const router = useRouter();
    const conversations = useChatStore((s) => s.conversations);
    const upsertConversation = useChatStore((s) => s.upsertConversation);

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [channels, setChannels] = useState<Record<string, ChatConversation[]>>({});
    const [titles, setTitles] = useState<Record<string, string>>({});

    // Resolve friendly course titles (best-effort).
    useEffect(() => {
        let cancelled = false;
        const missing = courseIds.filter((id) => id && !titles[id]);
        if (missing.length === 0) return;
        (async () => {
            for (const id of missing) {
                try {
                    const course = (await courseService.getCourseById(id)) as unknown as {
                        title?: string;
                        name?: string;
                    };
                    const title = course?.title || course?.name;
                    if (!cancelled && title) setTitles((prev) => ({ ...prev, [id]: title }));
                } catch {
                    // Title is decorative — fall back to a generic label.
                }
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseIds.join(',')]);

    const loadChannels = useCallback(
        async (courseId: string) => {
            setLoading((prev) => ({ ...prev, [courseId]: true }));
            try {
                const list = await chatService.getDoubtChannels(courseId);
                setChannels((prev) => ({ ...prev, [courseId]: list }));
                for (const c of list) upsertConversation(c);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err.message || 'Failed to load doubt channels');
                setChannels((prev) => ({ ...prev, [courseId]: [] }));
            } finally {
                setLoading((prev) => ({ ...prev, [courseId]: false }));
            }
        },
        [upsertConversation],
    );

    const toggle = (courseId: string) => {
        const next = !expanded[courseId];
        setExpanded((prev) => ({ ...prev, [courseId]: next }));
        if (next && !channels[courseId] && !loading[courseId]) {
            loadChannels(courseId);
        }
    };

    if (!courseIds || courseIds.length === 0) return null;

    return (
        <div className="py-2">
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Course channels
            </p>

            <ul>
                {courseIds.map((courseId) => {
                    const isOpen = Boolean(expanded[courseId]);
                    const list = channels[courseId] || [];
                    return (
                        <li key={courseId}>
                            <button
                                onClick={() => toggle(courseId)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                                aria-expanded={isOpen}
                            >
                                {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                                )}
                                <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {titles[courseId] || 'Course'}
                                </span>
                                {loading[courseId] && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
                            </button>

                            {isOpen && (
                                <div className="pb-1">
                                    {!loading[courseId] && list.length === 0 ? (
                                        <p className="px-11 py-2 text-xs text-gray-500 dark:text-gray-400">
                                            No doubt channels for this course.
                                        </p>
                                    ) : (
                                        <ul>
                                            {list.map((channel) => {
                                                const stored = conversations[channel.id];
                                                const unread = stored?.membership?.unread_count ?? channel.membership?.unread_count ?? 0;
                                                return (
                                                    <li key={channel.id}>
                                                        <button
                                                            onClick={() => router.push(`/chat/${channel.id}`)}
                                                            className="w-full flex items-center gap-2 pl-11 pr-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                                                        >
                                                            <HelpCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                                            <span className="min-w-0 flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                                                                {channel.name}
                                                            </span>
                                                            {unread > 0 && (
                                                                <span className="bg-blue-600 text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-semibold shrink-0">
                                                                    {unread > 99 ? '99+' : unread}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

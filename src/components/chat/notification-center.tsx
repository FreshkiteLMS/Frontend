"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Bell,
    BookOpen,
    CheckCheck,
    ClipboardList,
    Loader2,
    Megaphone,
    MessageSquare,
    Trash2,
    Users,
    Video,
    type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
    NOTIFICATION_CATEGORIES,
    isUnread,
    notificationId,
    useNotificationCenterStore,
    type NotificationCategory,
} from '@/stores/notification-center-store';
import { formatLastSeen } from '@/lib/chat-utils';
import type { Notification } from '@/services/api/notification.api';

/** Backend attaches chat refs that predate the shared Notification interface. */
type ChatNotification = Notification & { conversation_id?: string; message_id?: string };

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
    all: 'All',
    messages: 'Messages',
    courses: 'Courses',
    assignments: 'Assignments',
    announcements: 'Announcements',
    system: 'System',
};

const EMPTY_COPY: Record<NotificationCategory, { title: string; hint: string }> = {
    all: { title: 'No notifications yet', hint: 'Updates about your chats, courses and batches land here.' },
    messages: { title: 'No message notifications', hint: 'Mentions, replies and direct messages will show up here.' },
    courses: { title: 'No course updates', hint: 'Course assignments, batches and live sessions appear here.' },
    assignments: { title: 'No assignment reminders', hint: 'Due dates and exam reminders will show up here.' },
    announcements: { title: 'No announcements', hint: 'Broadcasts from your instructors appear here.' },
    system: { title: 'No system notifications', hint: 'Account and platform updates appear here.' },
};

interface IconSpec {
    Icon: LucideIcon;
    color: string;
    bg: string;
}

function iconFor(type: string | undefined): IconSpec {
    const t = type || '';
    if (t === 'CHAT_ANNOUNCEMENT' || t === 'PLACEMENT_UPDATE') {
        return { Icon: Megaphone, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
    }
    if (t.startsWith('CHAT_')) {
        return { Icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    }
    if (t.startsWith('MEETING_')) {
        return { Icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
    }
    if (t.startsWith('COURSE_') || t.startsWith('BATCH_') || t === 'CERTIFICATE_GENERATED') {
        return { Icon: BookOpen, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
    }
    if (t === 'ASSIGNMENT_DUE' || t === 'EXAM_REMINDER') {
        return { Icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    }
    if (t.startsWith('FRIEND_')) {
        return { Icon: Users, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/30' };
    }
    return { Icon: Bell, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' };
}

function deepLinkFor(n: ChatNotification): string | null {
    if (n.conversation_id) return `/chat/${n.conversation_id}`;
    if (n.meeting_id) return '/student/meetings';
    if (n.course_id) return `/student/courses/${n.course_id}`;
    return null;
}

function errorMessage(err: unknown, fallback: string): string {
    const maybe = err as { response?: { data?: { message?: string } }; message?: string };
    return maybe?.response?.data?.message || maybe?.message || fallback;
}

export function NotificationCenter() {
    const router = useRouter();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    const items = useNotificationCenterStore((s) => s.items);
    const unreadCount = useNotificationCenterStore((s) => s.unreadCount);
    const category = useNotificationCenterStore((s) => s.category);
    const loading = useNotificationCenterStore((s) => s.loading);
    const loaded = useNotificationCenterStore((s) => s.loaded);
    const visibleCount = useNotificationCenterStore((s) => s.visibleCount);
    const setCategory = useNotificationCenterStore((s) => s.setCategory);
    const load = useNotificationCenterStore((s) => s.load);
    const loadMore = useNotificationCenterStore((s) => s.loadMore);
    const visibleItems = useNotificationCenterStore((s) => s.visibleItems);
    const hasMore = useNotificationCenterStore((s) => s.hasMore);
    const countFor = useNotificationCenterStore((s) => s.countFor);
    const markRead = useNotificationCenterStore((s) => s.markRead);
    const markAll = useNotificationCenterStore((s) => s.markAll);
    const remove = useNotificationCenterStore((s) => s.remove);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        load().catch((err) => toast.error(errorMessage(err, 'Failed to load notifications')));
    }, [user?.id, load]);

    // `items`/`category`/`visibleCount` drive the selector results; recompute when they change.
    const rows = useMemo(
        () => visibleItems() as ChatNotification[],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items, category, visibleCount, visibleItems]
    );
    const moreAvailable = useMemo(
        () => hasMore(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items, category, visibleCount, hasMore]
    );

    const handleOpen = async (n: ChatNotification) => {
        const id = notificationId(n);
        if (id && isUnread(n)) {
            markRead(id).catch((err) => toast.error(errorMessage(err, 'Failed to mark as read')));
        }
        const href = deepLinkFor(n);
        if (href) router.push(href);
    };

    const showLoader = !mounted || (loading && !loaded);
    const empty = EMPTY_COPY[category];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {mounted && unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            try {
                                await markAll();
                                toast.success('All notifications marked as read');
                            } catch (err) {
                                toast.error(errorMessage(err, 'Failed to mark all as read'));
                            }
                        }}
                        disabled={!mounted || unreadCount === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all read
                    </button>
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 border-b border-gray-200 dark:border-gray-800">
                    {NOTIFICATION_CATEGORIES.map((c) => {
                        const active = category === c;
                        const count = mounted ? countFor(c) : 0;
                        return (
                            <button
                                key={c}
                                onClick={() => setCategory(c)}
                                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                                    active
                                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {CATEGORY_LABEL[c]}
                                {count > 0 && (
                                    <span
                                        className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                                            active
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {showLoader ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                        <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                        <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{empty.title}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{empty.hint}</p>
                    </div>
                ) : (
                    <>
                        <ul className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                            {rows.map((n) => {
                                const id = notificationId(n);
                                const unread = isUnread(n);
                                const { Icon, color, bg } = iconFor(n.type);
                                const time = formatLastSeen(n.created_at || n.createdAt);
                                return (
                                    <li
                                        key={id}
                                        onClick={() => handleOpen(n)}
                                        className={`group flex gap-3 px-5 py-4 cursor-pointer transition-colors ${
                                            unread
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        <div className={`shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                                            <Icon className={`w-5 h-5 ${color}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{n.title}</p>
                                                {unread && <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 break-words">{n.message}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-medium">{time}</p>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                remove(id).catch((err) =>
                                                    toast.error(errorMessage(err, 'Failed to delete notification'))
                                                );
                                            }}
                                            className="shrink-0 self-start p-2 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 opacity-0 group-hover:opacity-100 transition-all"
                                            aria-label="Delete notification"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {moreAvailable && (
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={loadMore}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

import { create } from 'zustand';
import { notificationService, type Notification } from '@/services/api/notification.api';

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const NOTIFICATION_CATEGORIES = [
    'all',
    'messages',
    'courses',
    'assignments',
    'announcements',
    'system',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Exclusive buckets — every notification type maps to exactly one of these. */
const CATEGORY_BY_TYPE: Record<string, Exclude<NotificationCategory, 'all'>> = {
    // messages
    CHAT_MESSAGE: 'messages',
    CHAT_MENTION: 'messages',
    CHAT_REPLY: 'messages',
    FRIEND_REQUEST: 'messages',
    FRIEND_ACCEPTED: 'messages',
    // announcements
    CHAT_ANNOUNCEMENT: 'announcements',
    BATCH_UPDATE: 'announcements',
    CHAT_EVENT: 'announcements',
    CHAT_POLL: 'announcements',
    PLACEMENT_UPDATE: 'announcements',
    // courses
    COURSE_ASSIGNED: 'courses',
    COURSE_UPDATED: 'courses',
    COURSE_PURCHASE: 'courses',
    COURSE_COMPLETED: 'courses',
    CERTIFICATE_GENERATED: 'courses',
    BATCH_ADDED: 'courses',
    BATCH_REMOVED: 'courses',
    MEETING_CREATED: 'courses',
    MEETING_UPDATED: 'courses',
    MEETING_CANCELLED: 'courses',
    MEETING_REMINDER: 'courses',
    // assignments
    ASSIGNMENT_DUE: 'assignments',
    EXAM_REMINDER: 'assignments',
    // system (explicit; everything unknown also falls through to system)
    CHAT_WARNING: 'system',
    CHAT_INFO: 'system',
    FEE_REMINDER: 'system',
    NEW_STUDENT: 'system',
    request_approved: 'system',
    request_rejected: 'system',
    system: 'system',
};

export function notificationCategoryOf(type: string | undefined): Exclude<NotificationCategory, 'all'> {
    if (!type) return 'system';
    return CATEGORY_BY_TYPE[type] || 'system';
}

/** Notifications come from two collections/eras — id may be `id` or `_id`. */
export function notificationId(n: Notification): string {
    return n.id || n._id || '';
}

export function isUnread(n: Notification): boolean {
    if (typeof n.isRead === 'boolean') return !n.isRead;
    return n.status !== 'read';
}

function timeOf(n: Notification): number {
    const raw = n.created_at || n.createdAt;
    const t = raw ? new Date(raw).getTime() : 0;
    return isNaN(t) ? 0 : t;
}

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface NotificationCenterState {
    items: Notification[];
    unreadCount: number;
    category: NotificationCategory;
    loading: boolean;
    loaded: boolean;
    /** How many of the filtered items are rendered (client-side "Load more"). */
    visibleCount: number;

    setCategory: (category: NotificationCategory) => void;
    load: () => Promise<void>;
    loadMore: () => void;
    /** Items matching the active category, newest first. */
    filteredItems: () => Notification[];
    /** The slice the UI should render (respects `visibleCount`). */
    visibleItems: () => Notification[];
    hasMore: () => boolean;
    countFor: (category: NotificationCategory) => number;

    markRead: (id: string) => Promise<void>;
    markAll: () => Promise<void>;
    remove: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;

    /** Socket: a new notification was pushed. */
    applyIncoming: (n: Notification) => void;

    reset: () => void;
}

export const useNotificationCenterStore = create<NotificationCenterState>()((set, get) => ({
    items: [],
    unreadCount: 0,
    category: 'all',
    loading: false,
    loaded: false,
    visibleCount: PAGE_SIZE,

    setCategory: (category) => set({ category, visibleCount: PAGE_SIZE }),

    load: async () => {
        set({ loading: true });
        try {
            const { notifications, unreadCount } = await notificationService.list();
            const items = [...notifications].sort((a, b) => timeOf(b) - timeOf(a));
            set({
                items,
                unreadCount: unreadCount ?? items.filter(isUnread).length,
                loaded: true,
                visibleCount: PAGE_SIZE,
            });
        } finally {
            set({ loading: false });
        }
    },

    loadMore: () => set((s) => ({ visibleCount: s.visibleCount + PAGE_SIZE })),

    filteredItems: () => {
        const { items, category } = get();
        if (category === 'all') return items;
        return items.filter((n) => notificationCategoryOf(n.type) === category);
    },

    visibleItems: () => get().filteredItems().slice(0, get().visibleCount),

    hasMore: () => get().filteredItems().length > get().visibleCount,

    countFor: (category) => {
        const { items } = get();
        if (category === 'all') return items.length;
        return items.filter((n) => notificationCategoryOf(n.type) === category).length;
    },

    markRead: async (id) => {
        const target = get().items.find((n) => notificationId(n) === id);
        if (!target || !isUnread(target)) return;
        set((s) => ({
            items: s.items.map((n) =>
                notificationId(n) === id ? { ...n, status: 'read' as const, isRead: true } : n
            ),
            unreadCount: Math.max(0, s.unreadCount - 1),
        }));
        try {
            await notificationService.markAsRead(id);
        } catch (err) {
            // Revert on failure.
            set((s) => ({
                items: s.items.map((n) =>
                    notificationId(n) === id ? { ...n, status: 'unread' as const, isRead: false } : n
                ),
                unreadCount: s.unreadCount + 1,
            }));
            throw err;
        }
    },

    markAll: async () => {
        const previous = get().items;
        const previousCount = get().unreadCount;
        set((s) => ({
            items: s.items.map((n) => ({ ...n, status: 'read' as const, isRead: true })),
            unreadCount: 0,
        }));
        try {
            await notificationService.markAllRead();
        } catch (err) {
            set({ items: previous, unreadCount: previousCount });
            throw err;
        }
    },

    remove: async (id) => {
        const previous = get().items;
        const previousCount = get().unreadCount;
        const target = previous.find((n) => notificationId(n) === id);
        set((s) => ({
            items: s.items.filter((n) => notificationId(n) !== id),
            unreadCount: target && isUnread(target) ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
        }));
        try {
            await notificationService.deleteNotification(id);
        } catch (err) {
            set({ items: previous, unreadCount: previousCount });
            throw err;
        }
    },

    clearAll: async () => {
        const previous = get().items;
        const previousCount = get().unreadCount;
        set({ items: [], unreadCount: 0 });
        try {
            await notificationService.clearAll();
        } catch (err) {
            set({ items: previous, unreadCount: previousCount });
            throw err;
        }
    },

    applyIncoming: (n) => {
        const id = notificationId(n);
        set((s) => {
            if (id && s.items.some((x) => notificationId(x) === id)) return {};
            return {
                items: [n, ...s.items],
                unreadCount: isUnread(n) ? s.unreadCount + 1 : s.unreadCount,
            };
        });
    },

    reset: () =>
        set({
            items: [],
            unreadCount: 0,
            category: 'all',
            loading: false,
            loaded: false,
            visibleCount: PAGE_SIZE,
        }),
}));

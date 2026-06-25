"use client";

import { X, UserPlus, ShoppingCart, Bell, Trash2, CheckCheck, Check, Video, Layers, BookOpen, AlarmClock, Ban, ShieldCheck } from 'lucide-react';
import { Notification } from '@/services/api/notification.api';

interface NotificationSidebarProps {
    open: boolean;
    onClose: () => void;
    notifications: Notification[];
    unreadCount: number;
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
}

function relativeTime(dateStr?: string): string {
    if (!dateStr) return '';
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Math.max(0, Date.now() - then);

    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    return new Date(dateStr).toLocaleDateString();
}

function notifId(n: Notification): string {
    return (n.id || n._id) as string;
}

function isUnread(n: Notification): boolean {
    if (typeof n.isRead === 'boolean') return !n.isRead;
    return n.status !== 'read';
}

function iconFor(type: string) {
    switch (type) {
        case 'NEW_STUDENT':
            return { Icon: UserPlus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
        case 'COURSE_PURCHASE':
        case 'COURSE_ASSIGNED':
        case 'COURSE_UPDATED':
            return { Icon: type === 'COURSE_PURCHASE' ? ShoppingCart : BookOpen, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
        case 'BATCH_ADDED':
            return { Icon: Layers, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30' };
        case 'BATCH_REMOVED':
            return { Icon: Layers, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
        case 'MEETING_CREATED':
        case 'MEETING_UPDATED':
            return { Icon: Video, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
        case 'MEETING_REMINDER':
            return { Icon: AlarmClock, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' };
        case 'MEETING_CANCELLED':
            return { Icon: Ban, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
        case 'ENROLLMENT_REQUEST':
            return { Icon: ShieldCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
        default:
            return { Icon: Bell, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
    }
}

export function NotificationSidebar({
    open,
    onClose,
    notifications,
    unreadCount,
    onMarkRead,
    onMarkAllRead,
    onDelete,
    onClearAll,
}: NotificationSidebarProps) {
    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
                    open ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-hidden={!open}
            />

            {/* Panel */}
            <aside
                className={`fixed top-0 right-0 z-[70] h-full w-full sm:w-[400px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-out ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
                role="dialog"
                aria-label="Notifications"
            >
                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Notifications</h2>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                            Unread: {unreadCount}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close notifications"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Actions */}
                {notifications.length > 0 && (
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                        <button
                            onClick={onMarkAllRead}
                            disabled={unreadCount === 0}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark all read
                        </button>
                        <button
                            onClick={onClearAll}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors ml-auto"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear all
                        </button>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <Bell className="w-7 h-7 text-gray-400" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications yet.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                            {notifications.map((n) => {
                                const id = notifId(n);
                                const unread = isUnread(n);
                                const { Icon, color, bg } = iconFor(n.type);
                                const time = relativeTime(n.created_at || n.createdAt);

                                return (
                                    <li
                                        key={id}
                                        onClick={() => unread && onMarkRead(id)}
                                        className={`group relative flex gap-3 px-5 py-4 transition-colors cursor-pointer ${
                                            unread
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                                            <Icon className={`w-5 h-5 ${color}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                    {n.title}
                                                </p>
                                                {unread && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 break-words">
                                                {n.message}
                                            </p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
                                                {time}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {unread && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onMarkRead(id); }}
                                                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </aside>
        </>
    );
}

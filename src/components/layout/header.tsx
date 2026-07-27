
"use client";

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/layout/theme-provider';
import { useState, useEffect } from 'react';
import { Sun, Moon, Settings, LogOut, User as UserIcon, Bell, MessageCircle } from 'lucide-react';
import { notificationService, Notification } from '@/services/api/notification.api';
import { NotificationSidebar } from '@/components/layout/notification-sidebar';
import { getSocket, joinUserRoom } from '@/services/socket';
import { useChatBadge } from '@/hooks/use-chat-socket';
import toast from 'react-hot-toast';

export function Header() {
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const displayUser = mounted ? user : null;
    const homeHref = mounted && user?.role === 'admin' ? '/admin' : '/student';

    return (
        <header className="bg-white px-4 h-16 shadow-sm border-b dark:bg-gray-900 dark:border-gray-800 transition-colors duration-200 sticky top-0 z-50">
            <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between gap-8">
                {/* Left: Logo and Nav */}
                <div className="flex items-center gap-8">
                    <Link href={homeHref} className="flex flex-col group shrink-0">
                        <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none">
                            fresh<span className="text-blue-600 dark:text-blue-400">kite</span>
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold -mt-0.5">
                            Earn while you learn
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6">
                        {displayUser?.role === 'admin' ? (
                            <>
                                <Link href="/admin/students" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Students</Link>
                                <Link href="/admin/batches" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Batches</Link>
                                <Link href="/admin/enrollment-requests" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Requests</Link>
                                <Link href="/chat" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Chat</Link>
                            </>
                        ) : displayUser?.role === 'student' ? (
                            <>
                                <Link href="/student/meetings" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Meetings</Link>
                                <Link href="/chat" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Chat</Link>
                                <Link href="/friends" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Friends</Link>
                            </>
                        ) : (
                            <Link href="/courses" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Categories</Link>
                        )}
                    </nav>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {displayUser ? (
                        <>
                            <ChatButton />
                            <NotificationBell />
                            <ProfileDropdown user={displayUser} logout={logout} />
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login" className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors">Login</Link>
                            <Link href="/signup" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md transition-all">Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Show a placeholder during SSR to prevent hydration mismatch
    if (!mounted) {
        return (
            <button
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                title="Toggle theme"
            >
                <Moon className="w-5 h-5" />
            </button>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            title="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </button>
    );
}

function ProfileDropdown({ user, logout }: { user: { name?: string; role?: string; email?: string }, logout: () => void }) {
    const [isOpen, setIsOpen] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && !(event.target as Element).closest('.profile-dropdown')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Safety check for user.name
    const displayInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';
    const displayName = user?.name || 'User';

    return (
        <div className="relative profile-dropdown">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold shadow-sm hover:shadow-md transition-all ring-2 ring-white dark:ring-gray-800"
            >
                {displayInitial}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                {displayInitial}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={displayName}>
                                    {displayName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user?.email || 'User'}>
                                    {user?.role === 'admin' ? 'Administrator' : 'Student'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="py-1">
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 transition-colors">
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                    <div className="py-1">
                        <button
                            onClick={logout}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChatButton() {
    // Only ever rendered inside the `displayUser` branch (mounted && authenticated),
    // so the badge cannot desync during hydration.
    const unread = useChatBadge();

    return (
        <Link
            href="/chat"
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            aria-label="Open chat"
        >
            <MessageCircle className="w-5 h-5" />
            {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 text-[10px] bg-blue-600 text-white rounded-full flex items-center justify-center px-0.5 font-black">
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </Link>
    );
}

function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    const notifId = (n: Notification) => (n.id || n._id) as string;

    const fetchNotifications = async () => {
        try {
            const { notifications: list, unreadCount: count } = await notificationService.list();
            setNotifications(list);
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds as a resilient fallback alongside realtime push.
        const intervalId = setInterval(fetchNotifications, 30000);
        return () => clearInterval(intervalId);
    }, []);

    // Realtime: join the user's room and refetch on push (instant, no refresh).
    useEffect(() => {
        if (!user?.id) return;
        joinUserRoom({ userId: (user as any).id, role: user.role });
        const socket = getSocket();
        const onNew = () => { fetchNotifications(); };
        socket.on('new_notification', onNew);
        return () => { socket.off('new_notification', onNew); };
    }, [user?.id, user?.role]);

    // Lock body scroll while the panel is open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const handleMarkRead = async (id: string) => {
        // optimistic
        setNotifications(prev => prev.map(n => (notifId(n) === id ? { ...n, status: 'read', isRead: true } : n)));
        setUnreadCount(c => Math.max(0, c - 1));
        try {
            await notificationService.markAsRead(id);
        } catch {
            toast.error('Failed to mark as read');
            fetchNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read', isRead: true })));
        setUnreadCount(0);
        try {
            await notificationService.markAllRead();
        } catch {
            toast.error('Failed to mark all as read');
            fetchNotifications();
        }
    };

    const handleDelete = async (id: string) => {
        const wasUnread = notifications.some(n => notifId(n) === id && n.status !== 'read' && n.isRead !== true);
        setNotifications(prev => prev.filter(n => notifId(n) !== id));
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
        try {
            await notificationService.deleteNotification(id);
        } catch {
            toast.error('Failed to delete notification');
            fetchNotifications();
        }
    };

    const handleClearAll = async () => {
        setNotifications([]);
        setUnreadCount(0);
        try {
            await notificationService.clearAll();
            toast.success('All notifications cleared');
        } catch {
            toast.error('Failed to clear notifications');
            fetchNotifications();
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                aria-label="Open notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-black text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            <NotificationSidebar
                open={open}
                onClose={() => setOpen(false)}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onDelete={handleDelete}
                onClearAll={handleClearAll}
            />
        </>
    );
}

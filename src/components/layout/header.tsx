
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/layout/theme-provider';
import { useState, useEffect, useRef } from 'react';
import {
    Sun,
    Moon,
    LogOut,
    Bell,
    MessageCircle,
    Menu,
    X,
    LayoutDashboard,
    Users,
    Layers,
    ClipboardCheck,
    Trophy,
    BookOpen,
    CalendarDays,
    UserRound,
    Settings,
    HeartHandshake,
    ChevronDown,
    type LucideIcon,
} from 'lucide-react';
import { notificationService, Notification } from '@/services/api/notification.api';
import { NotificationSidebar } from '@/components/layout/notification-sidebar';
import { getSocket, joinUserRoom } from '@/services/socket';
import { useChatBadge } from '@/hooks/use-chat-socket';
import toast from 'react-hot-toast';

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    /** Only highlight on this exact path (dashboards that prefix other pages). */
    exact?: boolean;
}

const ADMIN_NAV: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/batches', label: 'Batches', icon: Layers },
    { href: '/admin/enrollment-requests', label: 'Requests', icon: ClipboardCheck },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const STUDENT_NAV: NavItem[] = [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/student/courses', label: 'Courses', icon: BookOpen },
    { href: '/student/meetings', label: 'Meetings', icon: CalendarDays },
    { href: '/friends', label: 'Friends', icon: HeartHandshake },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const GUEST_NAV: NavItem[] = [{ href: '/courses', label: 'Courses', icon: BookOpen }];

function isActive(pathname: string, item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
    if (count <= 0) return null;
    return (
        <span className={`min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none ${className}`}>
            {count > 99 ? '99+' : count}
        </span>
    );
}

export function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname() || '/';
    const [mounted, setMounted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Navigating closes the mobile menu.
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const displayUser = mounted ? user : null;
    const homeHref = mounted && user?.role === 'admin' ? '/admin' : '/student';
    const nav = displayUser?.role === 'admin' ? ADMIN_NAV : displayUser?.role === 'student' ? STUDENT_NAV : GUEST_NAV;

    return (
        // No backdrop-filter / transform here: either would make the header the
        // containing block of fixed-position descendants (menus, overlays).
        <header className="sticky top-0 z-50 h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
            <div className="max-w-[1400px] mx-auto h-full px-4 flex items-center gap-4">
                <Link href={homeHref} className="flex flex-col group shrink-0 mr-2">
                    <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none">
                        fresh<span className="text-blue-600 dark:text-blue-400">kite</span>
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold -mt-0.5">
                        Earn while you learn
                    </span>
                </Link>

                {/* Desktop navigation: icons with hover labels */}
                <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0" aria-label="Main">
                    {nav.map((item) => (
                        <DesktopNavLink key={item.href} item={item} active={isActive(pathname, item)} />
                    ))}
                </nav>
                <div className="flex-1 md:hidden" />

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                    <ThemeToggle />
                    {displayUser ? (
                        <>
                            <ChatButton />
                            <NotificationBell />
                            <ProfileDropdown user={displayUser} logout={logout} />
                        </>
                    ) : (
                        <div className="flex items-center gap-2 ml-1">
                            <Link href="/login" className="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors">Log in</Link>
                            <Link href="/signup" className="px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">Sign up</Link>
                        </div>
                    )}
                    <button
                        onClick={() => setMobileOpen((v) => !v)}
                        className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile navigation */}
            {mobileOpen && (
                <>
                    <div className="md:hidden fixed inset-0 top-16 bg-black/30 z-40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
                    <nav
                        id="mobile-nav"
                        aria-label="Main"
                        className="md:hidden absolute inset-x-0 top-16 z-50 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg px-3 py-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto"
                    >
                        {nav.map((item) => (
                            <MobileNavLink key={item.href} item={item} active={isActive(pathname, item)} />
                        ))}
                        {displayUser && (
                            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                                >
                                    <LogOut className="w-5 h-5" /> Log out
                                </button>
                            </div>
                        )}
                    </nav>
                </>
            )}
        </header>
    );
}

/** Icon-only nav item; its name shows as a tooltip on hover / keyboard focus. */
function DesktopNavLink({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                active
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
            <Icon className="w-5 h-5" />
            {active && <span className="absolute -bottom-[13px] left-2 right-2 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />}
            <span
                role="tooltip"
                className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 z-50"
            >
                {item.label}
            </span>
        </Link>
    );
}

function MobileNavLink({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
            <Icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
        </Link>
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
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                title="Toggle theme"
                aria-label="Toggle theme"
            >
                <Moon className="w-5 h-5" />
            </button>
        );
    }

    const dark = theme === 'dark';
    return (
        <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}

function ProfileDropdown({ user, logout }: { user: { id?: string; name?: string; role?: string; email?: string }, logout: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click / Escape
    useEffect(() => {
        if (!isOpen) return;
        const onDown = (event: MouseEvent) => {
            if (!ref.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setIsOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    const displayInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';
    const displayName = user?.name || 'User';
    const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Student';

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                    {displayInitial}
                </span>
                <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold">
                                {displayInitial}
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={displayName}>{displayName}</p>
                                {user?.email && <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user.email}>{user.email}</p>}
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="py-1">
                        {user?.id && (
                            <Link
                                role="menuitem"
                                href={`/profile/${user.id}`}
                                onClick={() => setIsOpen(false)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2.5 transition-colors"
                            >
                                <UserRound className="w-4 h-4" /> My profile
                            </Link>
                        )}
                        <Link
                            role="menuitem"
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2.5 transition-colors"
                        >
                            <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <Link
                            role="menuitem"
                            href="/leaderboard"
                            onClick={() => setIsOpen(false)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2.5 transition-colors"
                        >
                            <Trophy className="w-4 h-4" /> Leaderboard
                        </Link>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

                    <button
                        role="menuitem"
                        onClick={logout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2.5 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Log out
                    </button>
                </div>
            )}
        </div>
    );
}

function ChatButton() {
    // Only ever rendered inside the `displayUser` branch (mounted && authenticated),
    // so the badge cannot desync during hydration.
    const unread = useChatBadge();
    const onChat = (usePathname() || '').startsWith('/chat');

    return (
        <Link
            href="/chat"
            aria-current={onChat ? 'page' : undefined}
            className={`relative p-2 rounded-lg transition-colors block ${onChat ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
            title="Messages"
        >
            <MessageCircle className="w-5 h-5" />
            <UnreadBadge count={unread} className="absolute -top-0.5 -right-0.5 ring-2 ring-white dark:ring-gray-900" />
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
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
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

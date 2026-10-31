"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Ban,
    Check,
    Clock,
    Compass,
    Loader2,
    MessageCircle,
    MoreVertical,
    RotateCcw,
    Search,
    UserCheck,
    UserMinus,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { useFriendStore } from '@/stores/friend-store';
import { usePresenceStore } from '@/stores/presence-store';
import { avatarColorFor, formatLastSeen, initialsOf } from '@/lib/chat-utils';
import type { DiscoverStudent, FriendRequestView, FriendView, PresenceStatus } from '@/types/chat';

type TabKey = 'discover' | 'friends' | 'requests' | 'blocked';
type Relation = 'all' | 'none' | 'pending';
type Status = DiscoverStudent['status'];

const PAGE_SIZE = 24;

function errorMessage(err: unknown, fallback: string): string {
    const maybe = err as { response?: { data?: { message?: string } }; message?: string };
    return maybe?.response?.data?.message || maybe?.message || fallback;
}

function presenceDotClass(status: PresenceStatus): string {
    if (status === 'online') return 'bg-green-500';
    if (status === 'away') return 'bg-yellow-500';
    if (status === 'busy') return 'bg-red-500';
    return 'bg-gray-400';
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Avatar({ id, name, url, size = 48, status }: { id: string; name: string; url?: string | null; size?: number; status?: PresenceStatus }) {
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
                <div
                    className={`w-full h-full rounded-full ${avatarColorFor(id)} text-white font-bold flex items-center justify-center`}
                    style={{ fontSize: Math.round(size * 0.34) }}
                >
                    {initialsOf(name)}
                </div>
            )}
            {status && (
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${presenceDotClass(status)}`} />
            )}
        </div>
    );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: typeof Users; title: string; hint?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
            {hint && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 animate-pulse">
            <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-9 w-full rounded-lg bg-gray-100 dark:bg-gray-800 mt-2" />
            </div>
        </div>
    );
}

const btn = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    muted: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
};

/* ------------------------------------------------------------------ */
/* Student card (Discover)                                             */
/* ------------------------------------------------------------------ */

function StudentCard({
    student,
    status,
    busy,
    onAdd,
    onCancel,
    onAccept,
    onDecline,
    onMessage,
}: {
    student: DiscoverStudent;
    status: Status;
    busy: boolean;
    onAdd: () => void;
    onCancel: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onMessage: () => void;
}) {
    const chips: string[] = [];
    if (student.mutual_friends) chips.push(`${student.mutual_friends} mutual friend${student.mutual_friends === 1 ? '' : 's'}`);
    if (student.mutual_batches) chips.push(`Same batch`);

    return (
        <article className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-shadow hover:shadow-md">
            <Link href={`/profile/${student.id}`} className="flex flex-col items-center text-center gap-2 group">
                <Avatar id={student.id} name={student.name} url={student.avatar_url} size={64} />
                <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1">
                    {student.name}
                </span>
            </Link>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[2rem]">
                {student.bio || chips.join(' · ') || 'Student'}
            </p>
            {student.bio && chips.length > 0 && (
                <p className="text-[11px] text-center text-gray-400 mt-1 line-clamp-1">{chips.join(' · ')}</p>
            )}
            {student.skills.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {student.skills.slice(0, 3).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-600 dark:text-gray-300">{s}</span>
                    ))}
                </div>
            )}

            <div className="mt-auto pt-4">
                {status === 'none' && (
                    <button onClick={onAdd} disabled={busy} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 ${btn.primary}`}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        Add friend
                    </button>
                )}
                {status === 'request_sent' && (
                    <div className="flex gap-2">
                        <span className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${btn.muted}`}>
                            <Clock className="w-4 h-4" /> Requested
                        </span>
                        <button onClick={onCancel} disabled={busy} className={`px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60 ${btn.secondary}`} aria-label={`Cancel request to ${student.name}`}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel'}
                        </button>
                    </div>
                )}
                {status === 'request_received' && (
                    <div className="flex gap-2">
                        <button onClick={onAccept} disabled={busy} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 ${btn.success}`}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
                        </button>
                        <button onClick={onDecline} disabled={busy} className={`px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60 ${btn.secondary}`} aria-label={`Decline request from ${student.name}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {status === 'friends' && (
                    <div className="flex gap-2">
                        <span className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${btn.muted}`}>
                            <UserCheck className="w-4 h-4 text-emerald-600" /> Friends
                        </span>
                        <button onClick={onMessage} disabled={busy} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 ${btn.primary}`}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Message
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ */
/* Friend row                                                          */
/* ------------------------------------------------------------------ */

function FriendRow({ friend, busy, onMessage, onUnfriend, onBlock }: {
    friend: FriendView;
    busy: boolean;
    onMessage: () => void;
    onUnfriend: () => void;
    onBlock: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const presence = usePresenceStore((s) => s.statuses[friend.id]);
    const status: PresenceStatus = presence?.status ?? friend.status ?? 'offline';

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e: MouseEvent) => {
            if (!(e.target as Element).closest('.friend-row-menu')) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <Avatar id={friend.id} name={friend.name} size={44} status={status} />
            <div className="flex-1 min-w-0">
                <Link href={`/profile/${friend.id}`} className="block text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">
                    {friend.name}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {status === 'online' ? 'Online' : `Last seen ${formatLastSeen(presence?.last_seen_at ?? friend.last_seen_at)}`}
                </p>
            </div>
            <button onClick={onMessage} disabled={busy} className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60 ${btn.primary}`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Message
            </button>
            <div className="relative friend-row-menu">
                <button onClick={() => setMenuOpen((v) => !v)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" aria-label={`Options for ${friend.name}`}>
                    <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1.5 z-30">
                        <button onClick={() => { setMenuOpen(false); onMessage(); }} className="sm:hidden w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" /> Message
                        </button>
                        <button onClick={() => { setMenuOpen(false); onUnfriend(); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                            <UserMinus className="w-4 h-4" /> Unfriend
                        </button>
                        <button onClick={() => { setMenuOpen(false); onBlock(); }} className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2">
                            <Ban className="w-4 h-4" /> Block
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
}

function RequestRow({ request, direction, busy, onAccept, onDecline, onCancel }: {
    request: FriendRequestView;
    direction: 'in' | 'out';
    busy: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onCancel: () => void;
}) {
    const otherId = direction === 'in' ? request.from_user_id : request.to_user_id;
    const name = request.user?.name || 'Student';
    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <Avatar id={otherId} name={name} size={44} />
            <div className="flex-1 min-w-0">
                <Link href={`/profile/${otherId}`} className="block text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600">{name}</Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {request.message ? `“${request.message}”` : direction === 'in' ? 'Wants to be your friend' : 'Waiting for a response'}
                    {request.mutual_friends ? ` · ${request.mutual_friends} mutual` : ''}
                </p>
            </div>
            {direction === 'in' ? (
                <div className="flex gap-2">
                    <button onClick={onAccept} disabled={busy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60 ${btn.success}`}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
                    </button>
                    <button onClick={onDecline} disabled={busy} className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60 ${btn.secondary}`}>Decline</button>
                </div>
            ) : (
                <button onClick={onCancel} disabled={busy} className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60 ${btn.secondary}`}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel request'}
                </button>
            )}
        </li>
    );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/**
 * Friends: a student directory first (every student you may connect with,
 * searchable and paginated), then your friends, pending requests and blocked
 * users. Relationship state shown on cards comes from the friend store, so a
 * request accepted elsewhere (socket) updates every card immediately.
 */
export function FriendsPanel() {
    const router = useRouter();
    const { user } = useAuth();
    const [tab, setTab] = useState<TabKey>('discover');
    const [requestTab, setRequestTab] = useState<'in' | 'out'>('in');
    const [busyId, setBusyId] = useState<string | null>(null);

    const friends = useFriendStore((s) => s.friends);
    const requestsIn = useFriendStore((s) => s.requestsIn);
    const requestsOut = useFriendStore((s) => s.requestsOut);
    const blocked = useFriendStore((s) => s.blocked);
    const loaded = useFriendStore((s) => s.loaded);
    const loading = useFriendStore((s) => s.loading);
    const loadAll = useFriendStore((s) => s.loadAll);
    const sendRequest = useFriendStore((s) => s.sendRequest);
    const acceptRequest = useFriendStore((s) => s.acceptRequest);
    const rejectRequest = useFriendStore((s) => s.rejectRequest);
    const cancelRequest = useFriendStore((s) => s.cancelRequest);
    const unfriend = useFriendStore((s) => s.unfriend);
    const block = useFriendStore((s) => s.block);
    const unblock = useFriendStore((s) => s.unblock);
    const subscribePresence = usePresenceStore((s) => s.subscribe);

    // Discover state
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [relation, setRelation] = useState<Relation>('all');
    const [students, setStudents] = useState<DiscoverStudent[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [discoverLoading, setDiscoverLoading] = useState(true);
    const [discoverError, setDiscoverError] = useState<string | null>(null);
    const requestSeq = useRef(0);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.id && !loaded) loadAll().catch(() => undefined);
    }, [user?.id, loaded, loadAll]);

    useEffect(() => {
        if (friends.length) subscribePresence(friends.map((f) => f.id));
    }, [friends, subscribePresence]);

    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(query.trim()), 300);
        return () => window.clearTimeout(id);
    }, [query]);

    const fetchPage = useCallback(async (pageNo: number, replace: boolean) => {
        const seq = ++requestSeq.current;
        setDiscoverLoading(true);
        setDiscoverError(null);
        try {
            const res = await chatSocialService.discoverStudents({ q: debounced || undefined, page: pageNo, limit: PAGE_SIZE, relation });
            if (seq !== requestSeq.current) return; // a newer search superseded this one
            setStudents((prev) => {
                if (replace) return res.data;
                const seen = new Set(prev.map((s) => s.id));
                return [...prev, ...res.data.filter((s) => !seen.has(s.id))];
            });
            setTotal(res.total);
            setPage(pageNo);
        } catch (err) {
            if (seq === requestSeq.current) setDiscoverError(errorMessage(err, 'Could not load students'));
        } finally {
            if (seq === requestSeq.current) setDiscoverLoading(false);
        }
    }, [debounced, relation]);

    useEffect(() => {
        if (tab === 'discover') void fetchPage(1, true);
    }, [tab, fetchPage]);

    const hasMore = students.length < total;

    // Infinite scroll: load the next page when the sentinel scrolls into view.
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || tab !== 'discover') return;
        const io = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting && hasMore && !discoverLoading && !discoverError) void fetchPage(page + 1, false);
        }, { rootMargin: '400px' });
        io.observe(el);
        return () => io.disconnect();
    }, [tab, hasMore, discoverLoading, discoverError, page, fetchPage]);

    /** Live relationship: the store (sockets + actions) wins over the page snapshot. */
    const statusOf = useCallback((s: DiscoverStudent): Status => {
        if (friends.some((f) => f.id === s.id)) return 'friends';
        if (requestsIn.some((r) => r.from_user_id === s.id)) return 'request_received';
        if (requestsOut.some((r) => r.to_user_id === s.id)) return 'request_sent';
        if (loaded) return 'none';
        return s.status;
    }, [friends, requestsIn, requestsOut, loaded]);

    const run = async (id: string, action: () => Promise<unknown>, success?: string) => {
        setBusyId(id);
        try {
            await action();
            if (success) toast.success(success);
        } catch (err) {
            toast.error(errorMessage(err, 'Something went wrong'));
            // Re-sync with the server after a failed action (e.g. a duplicate request).
            loadAll().catch(() => undefined);
        } finally {
            setBusyId(null);
        }
    };

    const message = (userId: string) =>
        run(userId, async () => {
            const conversation = await chatService.createDirect(userId);
            router.push(`/chat/${conversation.id}`);
        });

    const requestIdFor = (studentId: string, dir: 'in' | 'out') =>
        dir === 'in'
            ? requestsIn.find((r) => r.from_user_id === studentId)?.id
            : requestsOut.find((r) => r.to_user_id === studentId)?.id;

    const tabs: Array<{ key: TabKey; label: string; count?: number; badge?: boolean }> = [
        { key: 'discover', label: 'Discover' },
        { key: 'friends', label: 'Friends', count: friends.length },
        { key: 'requests', label: 'Requests', count: requestsIn.length, badge: requestsIn.length > 0 },
        { key: 'blocked', label: 'Blocked', count: blocked.length },
    ];

    const visibleRequests = requestTab === 'in' ? requestsIn : requestsOut;
    const relationOptions: Array<{ key: Relation; label: string }> = useMemo(() => [
        { key: 'all', label: 'All students' },
        { key: 'none', label: 'Not connected' },
        { key: 'pending', label: 'Pending' },
    ], []);

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Friends</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Find classmates, build your study circle and keep in touch.
                    </p>
                </header>

                <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 mb-6" role="tablist">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={tab === t.key}
                            onClick={() => setTab(t.key)}
                            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                                tab === t.key
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            {t.key === 'discover' && <Compass className="w-4 h-4" />}
                            {t.label}
                            {typeof t.count === 'number' && t.count > 0 && (
                                <span className={`px-1.5 min-w-[1.25rem] h-5 rounded-full text-[11px] flex items-center justify-center ${t.badge ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* ── Discover ── */}
                {tab === 'discover' && (
                    <section>
                        <div className="flex flex-col sm:flex-row gap-3 mb-5">
                            <label className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search students by name"
                                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {query && (
                                    <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Clear search">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </label>
                            <div className="flex gap-1.5">
                                {relationOptions.map((o) => (
                                    <button
                                        key={o.key}
                                        onClick={() => setRelation(o.key)}
                                        className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                                            relation === o.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!discoverLoading && !discoverError && total > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{total} student{total === 1 ? '' : 's'}</p>
                        )}

                        {discoverError && students.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="Couldn't load students"
                                hint={discoverError}
                                action={<button onClick={() => void fetchPage(1, true)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${btn.primary}`}><RotateCcw className="w-4 h-4" /> Try again</button>}
                            />
                        ) : !discoverLoading && students.length === 0 ? (
                            <EmptyState
                                icon={Search}
                                title={debounced ? `No students match “${debounced}”` : 'No students to show'}
                                hint={debounced ? 'Try a different name.' : relation !== 'all' ? 'Try another filter.' : 'Classmates will appear here as they join.'}
                            />
                        ) : (
                            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {students.map((s) => {
                                    const status = statusOf(s);
                                    return (
                                        <StudentCard
                                            key={s.id}
                                            student={s}
                                            status={status}
                                            busy={busyId === s.id}
                                            onAdd={() => run(s.id, () => sendRequest(s.id), `Friend request sent to ${s.name}`)}
                                            onCancel={() => {
                                                const rid = requestIdFor(s.id, 'out') ?? s.request_id;
                                                if (rid) void run(s.id, () => cancelRequest(rid), 'Request cancelled');
                                            }}
                                            onAccept={() => {
                                                const rid = requestIdFor(s.id, 'in') ?? s.request_id;
                                                if (rid) void run(s.id, () => acceptRequest(rid), `You and ${s.name} are now friends`);
                                            }}
                                            onDecline={() => {
                                                const rid = requestIdFor(s.id, 'in') ?? s.request_id;
                                                if (rid) void run(s.id, () => rejectRequest(rid), 'Request declined');
                                            }}
                                            onMessage={() => void message(s.id)}
                                        />
                                    );
                                })}
                                {discoverLoading && Array.from({ length: students.length ? 4 : 8 }).map((_, i) => <CardSkeleton key={`sk-${i}`} />)}
                            </div>
                        )}

                        {discoverError && students.length > 0 && (
                            <div className="flex justify-center mt-6">
                                <button onClick={() => void fetchPage(page + 1, false)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${btn.secondary}`}>
                                    <RotateCcw className="w-4 h-4" /> Load more
                                </button>
                            </div>
                        )}
                        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
                    </section>
                )}

                {/* ── Friends ── */}
                {tab === 'friends' && (
                    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        {loading && !loaded ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : friends.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="No friends yet"
                                hint="Find classmates in Discover and send a friend request."
                                action={<button onClick={() => setTab('discover')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${btn.primary}`}><Compass className="w-4 h-4" /> Discover students</button>}
                            />
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {friends.map((f) => (
                                    <FriendRow
                                        key={f.id}
                                        friend={f}
                                        busy={busyId === f.id}
                                        onMessage={() => void message(f.id)}
                                        onUnfriend={() => {
                                            if (window.confirm(`Remove ${f.name} from your friends?`)) void run(f.id, () => unfriend(f.id), 'Friend removed');
                                        }}
                                        onBlock={() => {
                                            if (window.confirm(`Block ${f.name}? They won't be able to message you or find you.`)) void run(f.id, () => block(f.id), 'User blocked');
                                        }}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {/* ── Requests ── */}
                {tab === 'requests' && (
                    <section>
                        <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4">
                            {(['in', 'out'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setRequestTab(d)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${requestTab === d ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {d === 'in' ? `Received (${requestsIn.length})` : `Sent (${requestsOut.length})`}
                                </button>
                            ))}
                        </div>
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            {visibleRequests.length === 0 ? (
                                <EmptyState icon={UserPlus} title={requestTab === 'in' ? 'No pending requests' : 'No sent requests'} hint={requestTab === 'in' ? 'New friend requests will appear here.' : 'Requests you send will appear here until answered.'} />
                            ) : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {visibleRequests.map((r) => (
                                        <RequestRow
                                            key={r.id}
                                            request={r}
                                            direction={requestTab}
                                            busy={busyId === r.id}
                                            onAccept={() => run(r.id, () => acceptRequest(r.id), 'Friend request accepted')}
                                            onDecline={() => run(r.id, () => rejectRequest(r.id), 'Request declined')}
                                            onCancel={() => run(r.id, () => cancelRequest(r.id), 'Request cancelled')}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                )}

                {/* ── Blocked ── */}
                {tab === 'blocked' && (
                    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        {blocked.length === 0 ? (
                            <EmptyState icon={Ban} title="You haven't blocked anyone" hint="Blocked people can't message you or find you in Discover." />
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {blocked.map((b) => (
                                    <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                                        <Avatar id={b.id} name={b.name} size={40} />
                                        <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">{b.name}</span>
                                        <button onClick={() => run(b.id, () => unblock(b.id), 'User unblocked')} disabled={busyId === b.id} className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60 ${btn.secondary}`}>
                                            {busyId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unblock'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}

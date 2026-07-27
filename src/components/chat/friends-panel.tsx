"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Ban,
    Check,
    Loader2,
    MessageCircle,
    MoreVertical,
    Search,
    Trophy,
    UserMinus,
    UserPlus,
    Users,
    UserX,
    X,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFriendStore } from '@/stores/friend-store';
import { usePresenceStore } from '@/stores/presence-store';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { avatarColorFor, formatLastSeen, initialsOf } from '@/lib/chat-utils';
import type { ChatUserSummary, FriendView, LeaderboardEntry, PresenceStatus } from '@/types/chat';

type TabKey = 'friends' | 'requests' | 'suggestions' | 'blocked' | 'leaderboard';

const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'friends', label: 'Friends' },
    { key: 'requests', label: 'Requests' },
    { key: 'suggestions', label: 'Suggestions' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'leaderboard', label: 'Leaderboard' },
];

const SUGGESTION_REASON_LABEL: Record<string, string> = {
    same_batch: 'Same batch',
    same_course: 'Same course',
    mutual_friends: 'Mutual friends',
};

const BADGE_EMOJI: Record<string, string> = {
    helpful_student: '🤝',
    top_contributor: '🏆',
    batch_mentor: '🎓',
    fast_responder: '⚡',
    streak_7: '🔥',
    streak_30: '💎',
};

function presenceDotClass(status: PresenceStatus): string {
    if (status === 'online') return 'bg-green-500';
    if (status === 'away') return 'bg-yellow-500';
    if (status === 'busy') return 'bg-red-500';
    return 'bg-gray-400';
}

function errorMessage(err: unknown, fallback: string): string {
    const maybe = err as { response?: { data?: { message?: string } }; message?: string };
    return maybe?.response?.data?.message || maybe?.message || fallback;
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

function Avatar({
    id,
    name,
    size = 'md',
    status,
}: {
    id: string;
    name: string;
    size?: 'sm' | 'md';
    status?: PresenceStatus;
}) {
    const box = size === 'sm' ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm';
    return (
        <div className="relative shrink-0">
            <div
                className={`${box} rounded-full ${avatarColorFor(id)} text-white font-bold flex items-center justify-center`}
            >
                {initialsOf(name)}
            </div>
            {status && (
                <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${presenceDotClass(status)}`}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Friend card                                                         */
/* ------------------------------------------------------------------ */

function FriendCard({
    friend,
    onMessage,
    onUnfriend,
    onBlock,
    busy,
}: {
    friend: FriendView;
    onMessage: (userId: string) => void;
    onUnfriend: (friend: FriendView) => void;
    onBlock: (friend: FriendView) => void;
    busy: boolean;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    // Subscribe to the map itself so presence pushes re-render this card.
    const presence = usePresenceStore((s) => s.statuses[friend.id]);
    const status: PresenceStatus = presence?.status ?? friend.status ?? 'offline';

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (event: MouseEvent) => {
            if (!(event.target as Element).closest('.friend-card-menu')) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    const chips: string[] = [];
    if (friend.mutual_friends) chips.push(`${friend.mutual_friends} mutual friend${friend.mutual_friends === 1 ? '' : 's'}`);
    if (friend.mutual_batches) chips.push(`${friend.mutual_batches} batch${friend.mutual_batches === 1 ? '' : 'es'}`);

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <Avatar id={friend.id} name={friend.name} status={status} />
                <div className="flex-1 min-w-0">
                    <Link
                        href={`/profile/${friend.id}`}
                        className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        {friend.name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {status === 'online'
                            ? 'Online'
                            : `Last seen ${formatLastSeen(presence?.last_seen_at ?? friend.last_seen_at)}`}
                    </p>
                    {chips.length > 0 && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                            {chips.join(' · ')}
                        </p>
                    )}
                </div>

                <div className="relative friend-card-menu">
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                        aria-label={`Options for ${friend.name}`}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    onUnfriend(friend);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                            >
                                <UserMinus className="w-4 h-4" />
                                Unfriend
                            </button>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    onBlock(friend);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                            >
                                <Ban className="w-4 h-4" />
                                Block
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => onMessage(friend.id)}
                disabled={busy}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                Message
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function FriendsPanel() {
    const router = useRouter();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<TabKey>('friends');
    const [requestTab, setRequestTab] = useState<'in' | 'out'>('in');
    const [query, setQuery] = useState('');
    const [busyUserId, setBusyUserId] = useState<string | null>(null);
    const [requestedIds, setRequestedIds] = useState<string[]>([]);

    const friends = useFriendStore((s) => s.friends);
    const requestsIn = useFriendStore((s) => s.requestsIn);
    const requestsOut = useFriendStore((s) => s.requestsOut);
    const suggestions = useFriendStore((s) => s.suggestions);
    const blocked = useFriendStore((s) => s.blocked);
    const loading = useFriendStore((s) => s.loading);
    const loaded = useFriendStore((s) => s.loaded);
    const loadAll = useFriendStore((s) => s.loadAll);
    const sendRequest = useFriendStore((s) => s.sendRequest);
    const acceptRequest = useFriendStore((s) => s.acceptRequest);
    const rejectRequest = useFriendStore((s) => s.rejectRequest);
    const cancelRequest = useFriendStore((s) => s.cancelRequest);
    const unfriend = useFriendStore((s) => s.unfriend);
    const block = useFriendStore((s) => s.block);
    const unblock = useFriendStore((s) => s.unblock);

    const subscribe = usePresenceStore((s) => s.subscribe);
    const statuses = usePresenceStore((s) => s.statuses);

    const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    // People search (Suggestions tab) — find anyone by name/email to add.
    const [peopleQuery, setPeopleQuery] = useState('');
    const [peopleResults, setPeopleResults] = useState<ChatUserSummary[]>([]);
    const [peopleSearching, setPeopleSearching] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        loadAll().catch((err) => toast.error(errorMessage(err, 'Failed to load friends')));
    }, [user?.id, loadAll]);

    // Presence for everyone rendered on this page.
    useEffect(() => {
        const ids = friends.map((f) => f.id);
        if (ids.length > 0) subscribe(ids);
    }, [friends, subscribe]);

    // Debounced global people search for the Suggestions tab.
    useEffect(() => {
        if (tab !== 'suggestions') return;
        const term = peopleQuery.trim();
        if (term.length < 2) {
            setPeopleResults([]);
            setPeopleSearching(false);
            return;
        }
        setPeopleSearching(true);
        let cancelled = false;
        const timer = setTimeout(() => {
            chatSocialService
                .searchUsers(term)
                .then((users) => { if (!cancelled) setPeopleResults(users); })
                .catch((err) => {
                    if (cancelled) return;
                    setPeopleResults([]);
                    toast.error(errorMessage(err, 'Search failed'));
                })
                .finally(() => { if (!cancelled) setPeopleSearching(false); });
        }, 300);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [peopleQuery, tab]);

    useEffect(() => {
        if (tab !== 'leaderboard') return;
        let cancelled = false;
        setLeaderboardLoading(true);
        chatSocialService
            .leaderboard(period)
            .then((rows) => {
                if (!cancelled) setLeaderboard(rows);
            })
            .catch((err) => {
                if (!cancelled) toast.error(errorMessage(err, 'Failed to load leaderboard'));
            })
            .finally(() => {
                if (!cancelled) setLeaderboardLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [tab, period]);

    const openDirect = useCallback(
        async (userId: string) => {
            setBusyUserId(userId);
            try {
                const conversation = await chatService.createDirect(userId);
                if (!conversation?.id) throw new Error('Failed to open conversation');
                router.push(`/chat/${conversation.id}`);
            } catch (err) {
                toast.error(errorMessage(err, 'Failed to open conversation'));
            } finally {
                setBusyUserId(null);
            }
        },
        [router]
    );

    const handleUnfriend = useCallback(
        async (friend: FriendView) => {
            if (!window.confirm(`Remove ${friend.name} from your friends?`)) return;
            try {
                await unfriend(friend.id);
                toast.success(`Removed ${friend.name}`);
            } catch (err) {
                toast.error(errorMessage(err, 'Failed to remove friend'));
            }
        },
        [unfriend]
    );

    const handleBlock = useCallback(
        async (friend: FriendView) => {
            if (!window.confirm(`Block ${friend.name}? They will no longer be able to message you.`)) return;
            try {
                await block(friend.id);
                toast.success(`Blocked ${friend.name}`);
            } catch (err) {
                toast.error(errorMessage(err, 'Failed to block user'));
            }
        },
        [block]
    );

    const handleAddFriend = useCallback(
        async (userId: string, name: string) => {
            setRequestedIds((prev) => [...prev, userId]);
            try {
                await sendRequest(userId);
                toast.success(`Friend request sent to ${name}`);
            } catch (err) {
                setRequestedIds((prev) => prev.filter((id) => id !== userId));
                toast.error(errorMessage(err, 'Failed to send friend request'));
            }
        },
        [sendRequest]
    );

    // Ids to exclude / relabel in people-search results.
    const friendIdSet = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
    const outgoingIdSet = useMemo(() => new Set(requestsOut.map((r) => r.to_user_id)), [requestsOut]);
    const incomingIdSet = useMemo(() => new Set(requestsIn.map((r) => r.from_user_id)), [requestsIn]);
    const blockedIdSet = useMemo(() => new Set(blocked.map((b) => b.id)), [blocked]);

    const peopleRows = useMemo(
        () => peopleResults.filter((u) => u.id !== user?.id && !blockedIdSet.has(u.id)),
        [peopleResults, user?.id, blockedIdSet]
    );

    const sortedFriends = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rank = (f: FriendView) => ((statuses[f.id]?.status ?? f.status) === 'online' ? 0 : 1);
        return friends
            .filter((f) => (q ? f.name.toLowerCase().includes(q) || (f.email || '').toLowerCase().includes(q) : true))
            .slice()
            .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    }, [friends, query, statuses]);

    const counts: Record<TabKey, number> = {
        friends: friends.length,
        requests: requestsIn.length + requestsOut.length,
        suggestions: suggestions.length,
        blocked: blocked.length,
        leaderboard: 0,
    };

    const showLoader = !mounted || (loading && !loaded);

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Friends</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Connect with your batchmates and keep the conversation going.
                        </p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search friends…"
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 border-b border-gray-200 dark:border-gray-800">
                    {TABS.map((t) => {
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                                    active
                                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                {t.label}
                                {counts[t.key] > 0 && (
                                    <span
                                        className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                                            active
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                        }`}
                                    >
                                        {counts[t.key]}
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
                ) : (
                    <>
                        {/* Friends */}
                        {tab === 'friends' &&
                            (sortedFriends.length === 0 ? (
                                <EmptyState
                                    icon={<Users className="w-12 h-12 text-gray-300 dark:text-gray-700" />}
                                    title={query ? 'No matching friends' : 'No friends yet'}
                                    hint={
                                        query
                                            ? 'Try a different name.'
                                            : 'Check the Suggestions tab to find people from your batches and courses.'
                                    }
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sortedFriends.map((f) => (
                                        <FriendCard
                                            key={f.id}
                                            friend={f}
                                            onMessage={openDirect}
                                            onUnfriend={handleUnfriend}
                                            onBlock={handleBlock}
                                            busy={busyUserId === f.id}
                                        />
                                    ))}
                                </div>
                            ))}

                        {/* Requests */}
                        {tab === 'requests' && (
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                                    {(['in', 'out'] as const).map((dir) => (
                                        <button
                                            key={dir}
                                            onClick={() => setRequestTab(dir)}
                                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                                                requestTab === dir
                                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {dir === 'in' ? `Incoming (${requestsIn.length})` : `Sent (${requestsOut.length})`}
                                        </button>
                                    ))}
                                </div>

                                {requestTab === 'in' ? (
                                    requestsIn.length === 0 ? (
                                        <EmptyState
                                            icon={<UserPlus className="w-12 h-12 text-gray-300 dark:text-gray-700" />}
                                            title="No incoming requests"
                                            hint="When someone sends you a friend request it shows up here."
                                        />
                                    ) : (
                                        <ul className="space-y-3">
                                            {requestsIn.map((r) => (
                                                <li
                                                    key={r.id}
                                                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
                                                >
                                                    <Avatar
                                                        id={r.user?.id || r.from_user_id}
                                                        name={r.user?.name || 'User'}
                                                        size="sm"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <Link
                                                            href={`/profile/${r.user?.id || r.from_user_id}`}
                                                            className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            {r.user?.name || 'User'}
                                                        </Link>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {r.message || 'Wants to be your friend'}
                                                            {r.mutual_friends
                                                                ? ` · ${r.mutual_friends} mutual friend${r.mutual_friends === 1 ? '' : 's'}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await acceptRequest(r.id);
                                                                    toast.success('Friend request accepted');
                                                                } catch (err) {
                                                                    toast.error(errorMessage(err, 'Failed to accept request'));
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await rejectRequest(r.id);
                                                                    toast.success('Request rejected');
                                                                } catch (err) {
                                                                    toast.error(errorMessage(err, 'Failed to reject request'));
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Reject
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )
                                ) : requestsOut.length === 0 ? (
                                    <EmptyState
                                        icon={<UserPlus className="w-12 h-12 text-gray-300 dark:text-gray-700" />}
                                        title="No sent requests"
                                        hint="Friend requests you send will be listed here until they are answered."
                                    />
                                ) : (
                                    <ul className="space-y-3">
                                        {requestsOut.map((r) => (
                                            <li
                                                key={r.id}
                                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
                                            >
                                                <Avatar id={r.user?.id || r.to_user_id} name={r.user?.name || 'User'} size="sm" />
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        href={`/profile/${r.user?.id || r.to_user_id}`}
                                                        className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        {r.user?.name || 'User'}
                                                    </Link>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Request pending</p>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await cancelRequest(r.id);
                                                            toast.success('Request cancelled');
                                                        } catch (err) {
                                                            toast.error(errorMessage(err, 'Failed to cancel request'));
                                                        }
                                                    }}
                                                    className="shrink-0 flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Cancel
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Suggestions */}
                        {tab === 'suggestions' && (
                            <div className="space-y-6">
                                {/* Find anyone by name/email */}
                                <div>
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                        <input
                                            value={peopleQuery}
                                            onChange={(e) => setPeopleQuery(e.target.value)}
                                            placeholder="Search people by name or email to add…"
                                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>

                                    {peopleQuery.trim().length >= 2 && (
                                        <div className="mt-4">
                                            {peopleSearching ? (
                                                <div className="flex items-center justify-center py-10">
                                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                                </div>
                                            ) : peopleRows.length === 0 ? (
                                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                                                    No people found for “{peopleQuery.trim()}”.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {peopleRows.map((p) => {
                                                        const isFriend = friendIdSet.has(p.id);
                                                        const requested = requestedIds.includes(p.id) || outgoingIdSet.has(p.id);
                                                        const incoming = incomingIdSet.has(p.id);
                                                        return (
                                                            <div
                                                                key={p.id}
                                                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <Avatar id={p.id} name={p.name} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <Link
                                                                            href={`/profile/${p.id}`}
                                                                            className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                                        >
                                                                            {p.name}
                                                                        </Link>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                                            {p.email || (p.role === 'admin' ? 'Administrator' : 'Student')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {isFriend ? (
                                                                    <button
                                                                        onClick={() => openDirect(p.id)}
                                                                        disabled={busyUserId === p.id}
                                                                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                                                    >
                                                                        <MessageCircle className="w-4 h-4" /> Message
                                                                    </button>
                                                                ) : incoming ? (
                                                                    <span className="text-center text-xs font-semibold text-blue-600 dark:text-blue-400 py-2">
                                                                        Wants to be your friend — see Requests
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        disabled={requested}
                                                                        onClick={() => handleAddFriend(p.id, p.name)}
                                                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                                                            requested
                                                                                ? 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
                                                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                                        }`}
                                                                    >
                                                                        {requested ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                                                        {requested ? 'Requested' : 'Add friend'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Algorithmic suggestions (hidden while actively searching people) */}
                                {peopleQuery.trim().length < 2 && (
                                    suggestions.length === 0 ? (
                                        <EmptyState
                                            icon={<UserPlus className="w-12 h-12 text-gray-300 dark:text-gray-700" />}
                                            title="No suggestions right now"
                                            hint="Use the search above to find people by name or email, or check back once you join more batches and courses."
                                        />
                                    ) : (
                                        <>
                                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Suggested for you
                                            </h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {suggestions.map((s) => {
                                        const requested = requestedIds.includes(s.id);
                                        return (
                                            <div
                                                key={s.id}
                                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Avatar id={s.id} name={s.name} />
                                                    <div className="flex-1 min-w-0">
                                                        <Link
                                                            href={`/profile/${s.id}`}
                                                            className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            {s.name}
                                                        </Link>
                                                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                            {SUGGESTION_REASON_LABEL[s.reason] || 'Suggested'}
                                                        </span>
                                                        {s.mutual_friends > 0 && (
                                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                                                                {s.mutual_friends} mutual friend{s.mutual_friends === 1 ? '' : 's'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    disabled={requested}
                                                    onClick={async () => {
                                                        setRequestedIds((prev) => [...prev, s.id]);
                                                        try {
                                                            await sendRequest(s.id);
                                                            toast.success(`Friend request sent to ${s.name}`);
                                                        } catch (err) {
                                                            setRequestedIds((prev) => prev.filter((id) => id !== s.id));
                                                            toast.error(errorMessage(err, 'Failed to send friend request'));
                                                        }
                                                    }}
                                                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                                        requested
                                                            ? 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    }`}
                                                >
                                                    {requested ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                                    {requested ? 'Requested' : 'Add friend'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                            </div>
                                        </>
                                    )
                                )}
                            </div>
                        )}

                        {/* Blocked */}
                        {tab === 'blocked' &&
                            (blocked.length === 0 ? (
                                <EmptyState
                                    icon={<UserX className="w-12 h-12 text-gray-300 dark:text-gray-700" />}
                                    title="No blocked users"
                                    hint="People you block cannot message you or send friend requests."
                                />
                            ) : (
                                <ul className="space-y-3">
                                    {blocked.map((b) => (
                                        <li
                                            key={b.id}
                                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
                                        >
                                            <Avatar id={b.id} name={b.name} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{b.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {b.blocked_at ? `Blocked ${formatLastSeen(b.blocked_at)}` : 'Blocked'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await unblock(b.id);
                                                        toast.success(`Unblocked ${b.name}`);
                                                    } catch (err) {
                                                        toast.error(errorMessage(err, 'Failed to unblock user'));
                                                    }
                                                }}
                                                className="shrink-0 flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                            >
                                                Unblock
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ))}

                        {/* Leaderboard */}
                        {tab === 'leaderboard' && (
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                                    {(['weekly', 'monthly'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-colors ${
                                                period === p
                                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                {leaderboardLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                    </div>
                                ) : leaderboard.length === 0 ? (
                                    <EmptyState
                                        icon={<Trophy className="w-12 h-12 text-gray-300 dark:text-gray-700" />}
                                        title="No activity yet"
                                        hint="Send some messages to climb the leaderboard."
                                    />
                                ) : (
                                    <ul className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                                        {leaderboard.map((entry, index) => {
                                            const rank = entry.rank ?? index + 1;
                                            const isSelf = mounted && !!user && entry.user_id === user.id;
                                            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                                            return (
                                                <li
                                                    key={entry.user_id}
                                                    className={`flex items-center gap-3 px-4 py-3 ${
                                                        isSelf ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                    }`}
                                                >
                                                    <span className="w-8 shrink-0 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                                                        {medal || rank}
                                                    </span>
                                                    <Avatar id={entry.user_id} name={entry.name} size="sm" />
                                                    <div className="flex-1 min-w-0">
                                                        <Link
                                                            href={`/profile/${entry.user_id}`}
                                                            className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            {entry.name}
                                                            {isSelf && (
                                                                <span className="ml-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                                                    You
                                                                </span>
                                                            )}
                                                        </Link>
                                                        {entry.badges && entry.badges.length > 0 && (
                                                            <p className="text-xs mt-0.5">
                                                                {entry.badges
                                                                    .slice(0, 6)
                                                                    .map((b) => BADGE_EMOJI[b.key] || '🏅')
                                                                    .join(' ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        {entry.messages}
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">msgs</span>
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-20">
            {icon}
            <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{hint}</p>
        </div>
    );
}

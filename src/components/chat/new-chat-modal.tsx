"use client";

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Search, UserX, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFriendStore } from '@/stores/friend-store';
import { useChatStore } from '@/stores/chat-store';
import { usePresenceStore } from '@/stores/presence-store';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { avatarColorFor, initialsOf } from '@/lib/chat-utils';
import type { ChatUserSummary } from '@/types/chat';

interface NewChatModalProps {
    onClose: () => void;
    onOpenConversation: (id: string) => void;
}

type Tab = 'friends' | 'everyone';

export function NewChatModal({ onClose, onOpenConversation }: NewChatModalProps) {
    const { user } = useAuth();
    // Friends don't apply to admins — they search all students directly.
    const isAdmin = user?.role === 'admin';
    const [tab, setTab] = useState<Tab>(isAdmin ? 'everyone' : 'friends');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ChatUserSummary[]>([]);
    const [searching, setSearching] = useState(false);
    const [creatingId, setCreatingId] = useState<string | null>(null);

    const friends = useFriendStore((s) => s.friends);
    const loadFriends = useFriendStore((s) => s.loadFriends);
    const [friendsLoading, setFriendsLoading] = useState(true);

    const upsertConversation = useChatStore((s) => s.upsertConversation);
    const subscribePresence = usePresenceStore((s) => s.subscribe);

    useEffect(() => {
        if (isAdmin) { setFriendsLoading(false); return; }
        let cancelled = false;
        loadFriends()
            .catch(() => { /* surfaced by the empty state */ })
            .finally(() => { if (!cancelled) setFriendsLoading(false); });
        return () => { cancelled = true; };
    }, [loadFriends, isAdmin]);

    useEffect(() => {
        if (friends.length > 0) subscribePresence(friends.map((f) => f.id));
    }, [friends, subscribePresence]);

    // Debounced global user search (300ms).
    useEffect(() => {
        if (tab !== 'everyone') return;
        const term = query.trim();
        if (term.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        let cancelled = false;
        const timer = setTimeout(() => {
            chatSocialService
                .searchUsers(term)
                .then((users) => { if (!cancelled) setResults(users); })
                .catch((err: unknown) => {
                    if (cancelled) return;
                    setResults([]);
                    const e = err as { response?: { data?: { message?: string } }; message?: string };
                    toast.error(e?.response?.data?.message || e?.message || 'Search failed');
                })
                .finally(() => { if (!cancelled) setSearching(false); });
        }, 300);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [query, tab]);

    const friendRows = useMemo<ChatUserSummary[]>(() => {
        const term = query.trim().toLowerCase();
        return friends
            .filter((f) => !term || f.name.toLowerCase().includes(term) || (f.email || '').toLowerCase().includes(term))
            .map((f) => ({ id: f.id, name: f.name, email: f.email, role: f.role }));
    }, [friends, query]);

    const rows = tab === 'friends' ? friendRows : results.filter((u) => u.id !== user?.id);

    const startChat = async (target: ChatUserSummary) => {
        if (creatingId) return;
        setCreatingId(target.id);
        try {
            const conversation = await chatService.createDirect(target.id);
            if (!conversation?.id) throw new Error('Failed to start chat');
            upsertConversation(conversation);
            onOpenConversation(conversation.id);
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(e?.response?.data?.message || e?.message || 'Failed to start chat');
        } finally {
            setCreatingId(null);
        }
    };

    const showLoader = tab === 'friends' ? friendsLoading : searching;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">New chat</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    {/* Admins don't have friends — they search all students directly. */}
                    {!isAdmin && (
                        <div className="flex items-center gap-1 mb-4">
                            {(['friends', 'everyone'] as Tab[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTab(t)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                        tab === t
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {t === 'friends' ? 'Friends' : 'Everyone'}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative mb-3">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                            placeholder={tab === 'friends' ? 'Filter friends...' : 'Search students and admins...'}
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="max-h-80 overflow-y-auto -mx-2 px-2">
                        {showLoader ? (
                            <div className="py-12 flex justify-center">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="py-12 flex flex-col items-center text-center">
                                <UserX className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {tab === 'everyone' && query.trim().length < 2
                                        ? 'Type at least 2 characters to search.'
                                        : tab === 'friends'
                                            ? 'No friends yet. Try the Everyone tab.'
                                            : 'No users found.'}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {rows.map((u) => (
                                    <li key={u.id}>
                                        <button
                                            type="button"
                                            disabled={creatingId !== null}
                                            onClick={() => void startChat(u)}
                                            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                                        >
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${avatarColorFor(u.id)}`}
                                            >
                                                {initialsOf(u.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                    {u.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {u.email || (u.role === 'admin' ? 'Administrator' : 'Student')}
                                                </p>
                                            </div>
                                            {creatingId === u.id && (
                                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

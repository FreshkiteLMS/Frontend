"use client";

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, MessagesSquare, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChatStore, type ConversationFilter } from '@/stores/chat-store';
import { usePresenceStore } from '@/stores/presence-store';
import { chatService } from '@/services/api/chat.api';
import type { ChatConversation } from '@/types/chat';
import { ConversationItem } from '@/components/chat/conversation-item';

interface ConversationListProps {
    onSelect: (id: string) => void;
}

const TABS: { value: ConversationFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'direct', label: 'DMs' },
    { value: 'group', label: 'Groups' },
    { value: 'channels', label: 'Channels' },
];

const CHANNEL_TYPES = ['announcement', 'doubt', 'live', 'support'];
const GROUP_TYPES = ['group', 'batch'];

function matchesFilter(c: ChatConversation, filter: ConversationFilter): boolean {
    switch (filter) {
        case 'direct':
            return c.type === 'direct';
        case 'group':
            return GROUP_TYPES.includes(c.type);
        case 'batch':
            return c.type === 'batch';
        case 'channels':
            return CHANNEL_TYPES.includes(c.type);
        case 'all':
        default:
            return true;
    }
}

function titleOf(c: ChatConversation): string {
    return (c.type === 'direct' ? c.other_user?.name : c.name) || '';
}

export function ConversationList({ onSelect }: ConversationListProps) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(() => !useChatStore.getState().conversationsLoaded);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const conversations = useChatStore((s) => s.conversations);
    const conversationOrder = useChatStore((s) => s.conversationOrder);
    const conversationsLoaded = useChatStore((s) => s.conversationsLoaded);
    const activeConversationId = useChatStore((s) => s.activeConversationId);
    const filter = useChatStore((s) => s.filter);
    const setFilter = useChatStore((s) => s.setFilter);
    const searchQuery = useChatStore((s) => s.searchQuery);
    const setSearchQuery = useChatStore((s) => s.setSearchQuery);
    const showArchived = useChatStore((s) => s.showArchived);
    const setShowArchived = useChatStore((s) => s.setShowArchived);
    const upsertConversation = useChatStore((s) => s.upsertConversation);

    const subscribePresence = usePresenceStore((s) => s.subscribe);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (conversationsLoaded) {
            setLoading(false);
            return;
        }
        // Safety net: never leave the skeleton up forever if the fetch fails.
        const timer = setTimeout(() => setLoading(false), 10000);
        return () => clearTimeout(timer);
    }, [conversationsLoaded]);

    // Close the per-item context menu on any outside click.
    useEffect(() => {
        if (!menuOpenId) return;
        const handler = (event: MouseEvent) => {
            if (!(event.target as Element).closest('.conversation-item-menu')) setMenuOpenId(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpenId]);

    const ordered = useMemo(
        // Guard against any conversation lacking an id — it would produce
        // duplicate/undefined React keys and a `/chat/undefined` route.
        () => conversationOrder.map((id) => conversations[id]).filter((c): c is ChatConversation => Boolean(c?.id)),
        [conversationOrder, conversations]
    );

    const archivedCount = useMemo(
        () => ordered.filter((c) => c.membership?.archived).length,
        [ordered]
    );

    const visible = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return ordered.filter((c) => {
            if (Boolean(c.membership?.archived) !== showArchived) return false;
            if (!matchesFilter(c, filter)) return false;
            if (q && !titleOf(c).toLowerCase().includes(q)) return false;
            return true;
        });
    }, [ordered, filter, searchQuery, showArchived]);

    // Presence: subscribe to the counterparts of every visible direct conversation.
    useEffect(() => {
        const ids = visible
            .filter((c) => c.type === 'direct' && c.other_user?.id)
            .map((c) => c.other_user!.id);
        if (ids.length > 0) subscribePresence(ids);
    }, [visible, subscribePresence]);

    const pinned = visible.filter((c) => c.membership?.pinned);
    const rest = visible.filter((c) => !c.membership?.pinned);

    const applyFlags = async (
        c: ChatConversation,
        flags: { pinned?: boolean; archived?: boolean; notifications_muted?: boolean },
        successMessage: string
    ) => {
        const previous = c;
        upsertConversation({ ...c, membership: { ...c.membership, ...flags } });
        try {
            await chatService.setFlags(c.id, flags);
            toast.success(successMessage);
        } catch (err: unknown) {
            upsertConversation(previous);
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(e?.response?.data?.message || e?.message || 'Failed to update conversation');
        }
    };

    const handleTogglePin = (c: ChatConversation) => {
        const next = !c.membership?.pinned;
        void applyFlags(c, { pinned: next }, next ? 'Pinned' : 'Unpinned');
    };

    const handleToggleArchive = (c: ChatConversation) => {
        const next = !c.membership?.archived;
        void applyFlags(c, { archived: next }, next ? 'Archived' : 'Unarchived');
    };

    const handleToggleMute = (c: ChatConversation) => {
        const next = !c.membership?.notifications_muted;
        void applyFlags(c, { notifications_muted: next }, next ? 'Muted' : 'Unmuted');
    };

    const currentUserId = mounted ? user?.id : undefined;

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Header: title + search */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {showArchived ? 'Archived' : 'Chats'}
                </h1>

                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        data-chat-search-input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations...  ( / )"
                        className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
                            aria-label="Clear search"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 mt-3 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setFilter(tab.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                filter === tab.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                    <div className="p-3 space-y-3">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded" />
                                    <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center px-6 py-16 text-center">
                        <MessagesSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {searchQuery
                                ? 'No conversations match your search.'
                                : showArchived
                                    ? 'Nothing archived yet.'
                                    : 'No conversations yet. Start a new chat.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {pinned.length > 0 && (
                            <>
                                <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Pinned
                                </div>
                                {pinned.map((c) => (
                                    <ConversationItem
                                        key={c.id}
                                        conversation={c}
                                        active={c.id === activeConversationId}
                                        currentUserId={currentUserId}
                                        menuOpen={menuOpenId === c.id}
                                        onSelect={onSelect}
                                        onToggleMenu={setMenuOpenId}
                                        onTogglePin={handleTogglePin}
                                        onToggleArchive={handleToggleArchive}
                                        onToggleMute={handleToggleMute}
                                    />
                                ))}
                                {rest.length > 0 && (
                                    <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        All conversations
                                    </div>
                                )}
                            </>
                        )}

                        {rest.map((c) => (
                            <ConversationItem
                                key={c.id}
                                conversation={c}
                                active={c.id === activeConversationId}
                                currentUserId={currentUserId}
                                menuOpen={menuOpenId === c.id}
                                onSelect={onSelect}
                                onToggleMenu={setMenuOpenId}
                                onTogglePin={handleTogglePin}
                                onToggleArchive={handleToggleArchive}
                                onToggleMute={handleToggleMute}
                            />
                        ))}

                        {/* Spacer so the floating action button never covers the last row. */}
                        <div className="h-20" />
                    </>
                )}
            </div>

            {/* Archived toggle */}
            <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                {showArchived ? 'Back to chats' : 'Archived'}
                {!showArchived && archivedCount > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">({archivedCount})</span>
                )}
            </button>
        </div>
    );
}

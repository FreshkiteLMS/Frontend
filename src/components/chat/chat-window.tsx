"use client";

import { useEffect, useState } from 'react';
import {
    Archive,
    ArchiveRestore,
    Bell,
    BellOff,
    CheckCheck,
    ChevronLeft,
    Flag,
    GraduationCap,
    HelpCircle,
    Info,
    Lock,
    LogOut,
    Megaphone,
    MicOff,
    MoreVertical,
    Pin,
    PinOff,
    Radio,
    Search,
    Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { useChatStore } from '@/stores/chat-store';
import { usePresenceStore } from '@/stores/presence-store';
import { avatarColorFor, formatLastSeen, initialsOf } from '@/lib/chat-utils';
import type { ChatConversation } from '@/types/chat';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { PinnedMessagesBar } from '@/components/chat/pinned-messages-bar';
import { ThreadPanel } from '@/components/chat/thread-panel';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { MessageSearchPanel } from '@/components/chat/message-search-panel';
import { ReportModal } from '@/components/chat/report-modal';
import { scrollToMessage } from '@/components/chat/message-bubble';

interface ChatWindowProps {
    conversation: ChatConversation;
    onBack: () => void;
    onOpenInfo: () => void;
}

function conversationIcon(type: ChatConversation['type']) {
    switch (type) {
        case 'announcement':
            return Megaphone;
        case 'batch':
            return GraduationCap;
        case 'doubt':
            return HelpCircle;
        case 'live':
            return Radio;
        case 'support':
            return HelpCircle;
        default:
            return Users;
    }
}

export function ChatWindow({ conversation, onBack, onOpenInfo }: ChatWindowProps) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const threadOpenFor = useChatStore((s) => s.threadOpenFor);
    const setThreadOpen = useChatStore((s) => s.setThreadOpen);
    const markConversationRead = useChatStore((s) => s.markConversationRead);
    const upsertConversation = useChatStore((s) => s.upsertConversation);
    const loadConversations = useChatStore((s) => s.loadConversations);
    const threadRoot = useChatStore((s) => {
        if (!s.threadOpenFor) return null;
        const inMain = (s.messages[conversation.id] || []).find((m) => m.id === s.threadOpenFor);
        if (inMain) return inMain;
        return (s.threadMessages[s.threadOpenFor] || []).find((m) => m.id === s.threadOpenFor) || null;
    });

    // Is anyone (other than me) currently typing? Drives the subtitle swap.
    const someoneTyping = useChatStore((s) => {
        const map = s.typing[conversation.id];
        if (!map) return false;
        const now = Date.now();
        return Object.entries(map).some(([userId, info]) => userId !== user?.id && now - info.at <= 6000);
    });

    const subscribePresence = usePresenceStore((s) => s.subscribe);
    const otherId = conversation.other_user?.id;
    const presence = usePresenceStore((s) => (otherId ? s.statuses[otherId] : undefined));

    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    // Subscribe to the counterpart's presence for direct conversations.
    useEffect(() => {
        if (otherId) subscribePresence([otherId]);
    }, [otherId, subscribePresence]);

    // Close the header dropdown on outside click.
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('.chat-window-menu')) return;
            setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    // Reset transient panels when the conversation changes.
    useEffect(() => {
        setSearchOpen(false);
        setMenuOpen(false);
        setReportOpen(false);
    }, [conversation.id]);

    const isAdmin = user?.role === 'admin';
    const memberRole = conversation.membership?.role;
    const isModerator = memberRole === 'owner' || memberRole === 'moderator' || isAdmin;
    const isDirect = conversation.type === 'direct';

    const title = isDirect ? conversation.other_user?.name || 'Direct message' : conversation.name || 'Conversation';
    const avatarSeed = isDirect ? conversation.other_user?.id || conversation.id : conversation.id;
    const Icon = conversationIcon(conversation.type);

    const locked = conversation.settings?.locked === true;
    const mutedUntilRaw = conversation.membership?.muted_until;
    const mutedUntil = mutedUntilRaw ? new Date(mutedUntilRaw) : null;
    const isMuted = !!mutedUntil && mutedUntil.getTime() > Date.now();
    const restricted = conversation.settings?.who_can_post === 'moderators' && !isModerator;
    const reactionsEnabled = conversation.settings?.reactions_enabled !== false;

    const notificationsMuted = conversation.membership?.notifications_muted === true;
    const pinned = conversation.membership?.pinned === true;
    const archived = conversation.membership?.archived === true;

    // -----------------------------------------------------------------------
    // Header actions
    // -----------------------------------------------------------------------
    const patchMembership = (flags: { pinned?: boolean; archived?: boolean; notifications_muted?: boolean }) => {
        upsertConversation({
            ...conversation,
            membership: { ...conversation.membership, ...flags },
        });
    };

    const setFlag = async (flags: { pinned?: boolean; archived?: boolean; notifications_muted?: boolean }, label: string) => {
        setMenuOpen(false);
        patchMembership(flags);
        try {
            await chatService.setFlags(conversation.id, flags);
            toast.success(label);
        } catch (err: any) {
            // Revert on failure.
            patchMembership({
                pinned: conversation.membership?.pinned,
                archived: conversation.membership?.archived,
                notifications_muted: conversation.membership?.notifications_muted,
            });
            toast.error(err?.response?.data?.message || err.message || 'Failed to update conversation');
        }
    };

    const onMarkRead = async () => {
        setMenuOpen(false);
        markConversationRead(conversation.id);
        try {
            await chatService.markRead(conversation.id);
            toast.success('Marked as read');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to mark as read');
        }
    };

    const onLeave = async () => {
        setMenuOpen(false);
        if (busy) return;
        setBusy(true);
        try {
            await chatService.leaveConversation(conversation.id);
            toast.success('You left the conversation');
            await loadConversations();
            onBack();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to leave conversation');
        } finally {
            setBusy(false);
        }
    };

    const reportTargetUserId = conversation.other_user?.id || conversation.created_by;

    // -----------------------------------------------------------------------
    // Subtitle
    // -----------------------------------------------------------------------
    const renderSubtitle = () => {
        if (!mounted) return <span className="block text-xs text-gray-500 dark:text-gray-400">&nbsp;</span>;

        if (someoneTyping) {
            return (
                <span className="flex items-center min-w-0">
                    <TypingIndicator conversationId={conversation.id} variant="line" />
                </span>
            );
        }

        if (isDirect) {
            const status = presence?.status || 'offline';
            const online = status === 'online';
            return (
                <span className="flex items-center gap-1.5 min-w-0">
                    <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                            online
                                ? 'bg-green-500'
                                : status === 'away'
                                  ? 'bg-yellow-500'
                                  : status === 'busy'
                                    ? 'bg-red-500'
                                    : 'bg-gray-400'
                        }`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {online
                            ? 'Online'
                            : status === 'away'
                              ? 'Away'
                              : status === 'busy'
                                ? 'Busy'
                                : `Last seen ${formatLastSeen(presence?.last_seen_at)}`}
                    </span>
                </span>
            );
        }

        return (
            <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conversation.member_count} {conversation.member_count === 1 ? 'member' : 'members'}
                </span>
            </span>
        );
    };

    return (
        <div className="relative flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="flex items-center gap-2 px-2 sm:px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
                <button
                    onClick={onBack}
                    className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    aria-label="Back to conversations"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {conversation.avatar_url ? (
                    <img
                        src={conversation.avatar_url}
                        alt={title}
                        className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-gray-800"
                    />
                ) : (
                    <div
                        className={`w-10 h-10 rounded-full shrink-0 ${avatarColorFor(avatarSeed)} text-white flex items-center justify-center text-sm font-bold`}
                    >
                        {isDirect ? initialsOf(title) : <Icon className="w-5 h-5" />}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{title}</h2>
                    {renderSubtitle()}
                </div>

                <button
                    onClick={() => setSearchOpen((v) => !v)}
                    className={`p-2 rounded-full transition-colors ${
                        searchOpen
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                    aria-label="Search in conversation"
                >
                    <Search className="w-5 h-5" />
                </button>

                <button
                    onClick={onOpenInfo}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    aria-label="Conversation info"
                >
                    <Info className="w-5 h-5" />
                </button>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="chat-window-menu p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                        aria-label="More actions"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {menuOpen && (
                        <div className="chat-window-menu absolute right-0 top-11 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <HeaderMenuItem icon={<CheckCheck className="w-4 h-4" />} label="Mark as read" onClick={onMarkRead} />
                            <HeaderMenuItem
                                icon={notificationsMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                label={notificationsMuted ? 'Unmute notifications' : 'Mute notifications'}
                                onClick={() =>
                                    setFlag(
                                        { notifications_muted: !notificationsMuted },
                                        notificationsMuted ? 'Notifications unmuted' : 'Notifications muted',
                                    )
                                }
                            />
                            <HeaderMenuItem
                                icon={pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                label={pinned ? 'Unpin conversation' : 'Pin conversation'}
                                onClick={() => setFlag({ pinned: !pinned }, pinned ? 'Conversation unpinned' : 'Conversation pinned')}
                            />
                            <HeaderMenuItem
                                icon={archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                label={archived ? 'Unarchive' : 'Archive'}
                                onClick={() => setFlag({ archived: !archived }, archived ? 'Conversation unarchived' : 'Conversation archived')}
                            />
                            {!isDirect && (
                                <HeaderMenuItem
                                    icon={<LogOut className="w-4 h-4" />}
                                    label="Leave conversation"
                                    danger
                                    onClick={onLeave}
                                />
                            )}
                            {reportTargetUserId && reportTargetUserId !== user?.id && (
                                <HeaderMenuItem
                                    icon={<Flag className="w-4 h-4" />}
                                    label="Report"
                                    danger
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setReportOpen(true);
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Pinned messages */}
            <PinnedMessagesBar conversation={conversation} />

            {/* Banners */}
            {locked && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                        This conversation is locked. {isModerator ? 'Only moderators can post.' : 'New messages are disabled.'}
                    </p>
                </div>
            )}

            {mounted && isMuted && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
                    <MicOff className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300">
                        You are muted in this conversation until {mutedUntil?.toLocaleString()}.
                    </p>
                </div>
            )}

            {/* Messages */}
            <MessageList conversation={conversation} />

            {/* Composer or announcement banner */}
            {restricted ? (
                <div className="flex items-center gap-2 px-4 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
                    <Megaphone className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Only admins can post here</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {reactionsEnabled
                                ? 'You can still react to messages with emojis.'
                                : 'This is a read-only announcement channel.'}
                        </p>
                    </div>
                </div>
            ) : (
                <MessageInput conversation={conversation} />
            )}

            {/* In-conversation search */}
            {searchOpen && (
                <MessageSearchPanel
                    conversationId={conversation.id}
                    onClose={() => setSearchOpen(false)}
                    onJumpTo={(messageId) => {
                        const ok = scrollToMessage(messageId);
                        if (!ok) toast('That message is not loaded yet — scroll up to load it');
                    }}
                />
            )}

            {/* Thread drawer */}
            {threadOpenFor && threadRoot && (
                <ThreadPanel rootMessage={threadRoot} onClose={() => setThreadOpen(null)} />
            )}

            {/* Report */}
            {reportOpen && reportTargetUserId && (
                <ReportModal
                    target={{ type: 'user', userId: reportTargetUserId, conversationId: conversation.id }}
                    onClose={() => setReportOpen(false)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Local dropdown item
// ---------------------------------------------------------------------------

function HeaderMenuItem({
    icon,
    label,
    onClick,
    danger = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

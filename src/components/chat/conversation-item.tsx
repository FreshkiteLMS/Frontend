"use client";

import {
    Archive,
    ArchiveRestore,
    BellOff,
    Bell,
    CheckCheck,
    GraduationCap,
    HelpCircle,
    LifeBuoy,
    Megaphone,
    MoreVertical,
    Pin,
    PinOff,
    Radio,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePresenceStore } from '@/stores/presence-store';
import { avatarColorFor, formatMessageTime, initialsOf, resolveFileUrl } from '@/lib/chat-utils';
import type { ChatConversation, PresenceStatus } from '@/types/chat';

interface ConversationItemProps {
    conversation: ChatConversation;
    active: boolean;
    currentUserId?: string;
    menuOpen: boolean;
    onSelect: (id: string) => void;
    onToggleMenu: (id: string | null) => void;
    onTogglePin: (c: ChatConversation) => void;
    onToggleArchive: (c: ChatConversation) => void;
    onToggleMute: (c: ChatConversation) => void;
}

const TYPE_ICON: Record<string, LucideIcon | undefined> = {
    group: Users,
    batch: GraduationCap,
    announcement: Megaphone,
    doubt: HelpCircle,
    live: Radio,
    support: LifeBuoy,
};

function presenceDotClass(status: PresenceStatus): string {
    if (status === 'online') return 'bg-green-500';
    if (status === 'away') return 'bg-yellow-500';
    if (status === 'busy') return 'bg-red-500';
    return 'bg-gray-400';
}

export function ConversationItem({
    conversation,
    active,
    currentUserId,
    menuOpen,
    onSelect,
    onToggleMenu,
    onTogglePin,
    onToggleArchive,
    onToggleMute,
}: ConversationItemProps) {
    const isDirect = conversation.type === 'direct';
    const other = conversation.other_user;

    const presence = usePresenceStore((s) =>
        isDirect && other ? s.statuses[other.id]?.status ?? 'offline' : 'offline'
    );

    const title = isDirect ? other?.name || 'Direct message' : conversation.name || 'Conversation';
    const seed = isDirect ? other?.id || conversation.id : conversation.id;
    const TypeIcon = TYPE_ICON[conversation.type];

    const membership = conversation.membership;
    const unread = membership?.unread_count || 0;
    const muted = Boolean(membership?.notifications_muted);
    const pinned = Boolean(membership?.pinned);
    const archived = Boolean(membership?.archived);

    const last = conversation.last_message;
    const ownLast = Boolean(last && currentUserId && last.sender_id === currentUserId);
    const showSenderPrefix = Boolean(last && !isDirect && !ownLast && last.sender_name);

    const avatarUrl = conversation.avatar_url ? resolveFileUrl(conversation.avatar_url) : null;

    return (
        <div className="group relative">
            <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors ${
                    active
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
            >
                {/* Avatar */}
                <div className="relative shrink-0">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={avatarUrl}
                            alt={title}
                            className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-800"
                        />
                    ) : (
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold ${avatarColorFor(seed)}`}
                        >
                            {initialsOf(title)}
                        </div>
                    )}

                    {isDirect && other ? (
                        <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${presenceDotClass(presence)}`}
                            aria-label={presence}
                        />
                    ) : TypeIcon ? (
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                            <TypeIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </span>
                    ) : null}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span
                            className={`flex-1 truncate text-sm ${
                                unread > 0
                                    ? 'font-bold text-gray-900 dark:text-white'
                                    : 'font-semibold text-gray-800 dark:text-gray-200'
                            }`}
                        >
                            {title}
                        </span>
                        {pinned && <Pin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />}
                        {muted && <BellOff className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />}
                        {last && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                                {formatMessageTime(last.created_at)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex-1 min-w-0 flex items-center gap-1">
                            {ownLast && isDirect && (
                                <CheckCheck className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                            )}
                            <span
                                className={`truncate text-xs ${
                                    unread > 0
                                        ? 'text-gray-700 dark:text-gray-200'
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                {last
                                    ? `${showSenderPrefix ? `${last.sender_name}: ` : ''}${last.preview}`
                                    : 'No messages yet'}
                            </span>
                        </span>

                        {unread > 0 && (
                            <span
                                className={`shrink-0 inline-flex items-center justify-center px-1.5 min-w-5 h-5 rounded-full text-xs font-bold text-white ${
                                    muted ? 'bg-gray-400 dark:bg-gray-600' : 'bg-blue-600'
                                }`}
                            >
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </div>
                </div>
            </button>

            {/* Context menu trigger */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleMenu(menuOpen ? null : conversation.id);
                }}
                className={`conversation-item-menu absolute top-2 right-2 p-1.5 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-opacity ${
                    menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                }`}
                aria-label="Conversation options"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
                <div className="conversation-item-menu absolute right-3 top-9 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <MenuItem
                        icon={pinned ? PinOff : Pin}
                        label={pinned ? 'Unpin' : 'Pin to top'}
                        onClick={() => { onToggleMenu(null); onTogglePin(conversation); }}
                    />
                    <MenuItem
                        icon={muted ? Bell : BellOff}
                        label={muted ? 'Unmute notifications' : 'Mute notifications'}
                        onClick={() => { onToggleMenu(null); onToggleMute(conversation); }}
                    />
                    <MenuItem
                        icon={archived ? ArchiveRestore : Archive}
                        label={archived ? 'Unarchive' : 'Archive'}
                        onClick={() => { onToggleMenu(null); onToggleArchive(conversation); }}
                    />
                </div>
            )}
        </div>
    );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

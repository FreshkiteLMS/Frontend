"use client";

import { useEffect, useRef, useState } from 'react';
import {
    AlertTriangle,
    Check,
    CheckCheck,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Copy,
    CornerUpLeft,
    Download,
    FileText,
    Flag,
    Forward,
    MessageSquare,
    Pencil,
    Pin,
    PinOff,
    Plus,
    RefreshCw,
    Star,
    StarOff,
    Trash2,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { useChatStore } from '@/stores/chat-store';
import {
    avatarColorFor,
    formatFileSize,
    formatMessageTime,
    initialsOf,
    linkifySegments,
    resolveFileUrl,
} from '@/lib/chat-utils';
import type { ChatAttachment, ChatConversation, ChatMessage } from '@/types/chat';
import { AudioPlayer } from '@/components/chat/audio-player';
import { ReactionPicker } from '@/components/chat/reaction-picker';
import { ForwardModal } from '@/components/chat/forward-modal';
import { ReportModal } from '@/components/chat/report-modal';
import { PollMessage } from '@/components/chat/poll-message';
import { EventCard } from '@/components/chat/event-card';

// ---------------------------------------------------------------------------
// Shared scroll helper (used by the list, the pinned bar and reply quotes)
// ---------------------------------------------------------------------------

export function messageDomId(messageId: string): string {
    return `chat-msg-${messageId}`;
}

/** Scroll a rendered message into view and flash it. Returns false when not mounted. */
export function scrollToMessage(messageId: string): boolean {
    if (typeof document === 'undefined') return false;
    const el = document.getElementById(messageDomId(messageId));
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-blue-400', 'dark:ring-blue-500', 'rounded-2xl');
    window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-400', 'dark:ring-blue-500', 'rounded-2xl');
    }, 1600);
    return true;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MessageBubbleProps {
    message: ChatMessage;
    conversation: ChatConversation;
    /** First message of a consecutive-sender group → show avatar. */
    showAvatar?: boolean;
    /** Show the sender name row (group-ish conversations, other people's messages). */
    showSenderName?: boolean;
    /** Continuation of a group → tighter vertical spacing. */
    compact?: boolean;
    /** Rendered inside the thread panel → hide the thread chip. */
    inThread?: boolean;
}

const IMAGE_RE = /^image\//i;
const VIDEO_RE = /^video\//i;
const AUDIO_RE = /^audio\//i;

export function MessageBubble({
    message,
    conversation,
    showAvatar = true,
    showSenderName = false,
    compact = false,
    inThread = false,
}: MessageBubbleProps) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const setReplyTarget = useChatStore((s) => s.setReplyTarget);
    const setEditingMessage = useChatStore((s) => s.setEditingMessage);
    const reactToMessage = useChatStore((s) => s.reactToMessage);
    const deleteMessage = useChatStore((s) => s.deleteMessage);
    const pinMessage = useChatStore((s) => s.pinMessage);
    const starMessage = useChatStore((s) => s.starMessage);
    const upvoteMessage = useChatStore((s) => s.upvoteMessage);
    const acceptAnswer = useChatStore((s) => s.acceptAnswer);
    const loadThread = useChatStore((s) => s.loadThread);
    const retrySend = useChatStore((s) => s.retrySend);

    const [menuOpen, setMenuOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [forwardOpen, setForwardOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);

    const longPressRef = useRef<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const myId = user?.id || '';
    const isOwn = mounted && !!myId && message.sender_id === myId;
    const isAdmin = user?.role === 'admin';
    const memberRole = conversation.membership?.role;
    const isModerator = memberRole === 'owner' || memberRole === 'moderator' || isAdmin;
    const isDirect = conversation.type === 'direct';
    const isDoubt = conversation.type === 'doubt';

    // The root this message answers (thread root, else a direct reply target).
    const rootId = message.thread_root_id || message.reply_to?.message_id || null;

    const isAcceptedAnswer = useChatStore((s) => {
        if (!rootId) return false;
        const list = s.messages[message.conversation_id] || [];
        const root = list.find((m) => m.id === rootId);
        return !!root && root.accepted_reply_id === message.id;
    });

    const canAcceptAnswer = useChatStore((s) => {
        if (!isDoubt || !rootId || !myId) return false;
        const list = s.messages[message.conversation_id] || [];
        const root = list.find((m) => m.id === rootId);
        if (!root || root.accepted_reply_id === message.id) return false;
        return root.sender_id === myId || isModerator;
    });

    // Close the context menu on any outside mousedown.
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('.chat-message-menu')) return;
            setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    useEffect(() => {
        return () => {
            if (longPressRef.current) window.clearTimeout(longPressRef.current);
        };
    }, []);

    // -----------------------------------------------------------------------
    // System messages → centered pill
    // -----------------------------------------------------------------------
    if (message.type === 'system') {
        return (
            <div id={messageDomId(message.id)} className="flex justify-center my-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 text-center max-w-[80%]">
                    {message.content}
                </span>
            </div>
        );
    }

    const pending = message._status === 'pending';
    const failed = message._status === 'failed';
    const deleted = message.deleted_for_everyone;

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    const closeMenu = () => setMenuOpen(false);

    const onCopy = async () => {
        closeMenu();
        try {
            await navigator.clipboard.writeText(message.content || '');
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Could not copy message');
        }
    };

    const onReply = () => {
        closeMenu();
        setReplyTarget(message);
    };

    const onReplyInThread = () => {
        closeMenu();
        loadThread(message.thread_root_id || message.id).catch(() => undefined);
    };

    const onEdit = () => {
        closeMenu();
        setEditingMessage(message);
    };

    const onTogglePin = async () => {
        closeMenu();
        try {
            await pinMessage(message.id, !message.is_pinned);
            toast.success(message.is_pinned ? 'Message unpinned' : 'Message pinned');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update pin');
        }
    };

    const onToggleStar = async () => {
        closeMenu();
        const starred = message.starred_by?.includes(myId) ?? false;
        try {
            await starMessage(message.id, !starred);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update star');
        }
    };

    const onToggleUpvote = async () => {
        const upvoted = message.upvoted_by?.includes(myId) ?? false;
        try {
            await upvoteMessage(message.id, !upvoted);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to upvote');
        }
    };

    const onAcceptAnswer = async () => {
        closeMenu();
        if (!rootId) return;
        try {
            await acceptAnswer(rootId, message.id);
            toast.success('Answer accepted');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to accept answer');
        }
    };

    const onDelete = async (scope: 'me' | 'everyone') => {
        setDeleteOpen(false);
        try {
            await deleteMessage(message.id, scope);
            toast.success(scope === 'everyone' ? 'Message deleted for everyone' : 'Message deleted');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to delete message');
        }
    };

    const onReact = (emoji: string) => {
        setPickerOpen(false);
        reactToMessage(message.id, emoji).catch(() => undefined);
    };

    const openMenu = () => {
        if (deleted) return;
        setMenuOpen(true);
    };

    const onTouchStart = () => {
        if (deleted) return;
        longPressRef.current = window.setTimeout(() => setMenuOpen(true), 500);
    };
    const cancelLongPress = () => {
        if (longPressRef.current) {
            window.clearTimeout(longPressRef.current);
            longPressRef.current = null;
        }
    };

    // -----------------------------------------------------------------------
    // Derived render state
    // -----------------------------------------------------------------------
    const starred = message.starred_by?.includes(myId) ?? false;
    const upvoted = message.upvoted_by?.includes(myId) ?? false;
    const reactionsEnabled = conversation.settings?.reactions_enabled !== false;
    const canEdit = isOwn && !deleted && message.type === 'text';
    const canDeleteEveryone = isOwn || isModerator;

    const images = (message.attachments || []).filter((a) => IMAGE_RE.test(a.mime_type));
    const videos = (message.attachments || []).filter((a) => VIDEO_RE.test(a.mime_type));
    const audios = (message.attachments || []).filter((a) => AUDIO_RE.test(a.mime_type));
    const files = (message.attachments || []).filter(
        (a) => !IMAGE_RE.test(a.mime_type) && !VIDEO_RE.test(a.mime_type) && !AUDIO_RE.test(a.mime_type),
    );

    const priorityClass =
        message.priority === 'urgent'
            ? 'border-l-4 border-red-500'
            : message.priority === 'high'
              ? 'border-l-4 border-amber-500'
              : '';

    const bubbleBase = isOwn
        ? 'bg-blue-600 text-white'
        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100';

    const metaColor = isOwn ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500';

    return (
        <div
            id={messageDomId(message.id)}
            className={`flex gap-2 px-2 sm:px-4 ${compact ? 'mt-0.5' : 'mt-3'} ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar gutter */}
            <div className="w-8 shrink-0">
                {!isOwn && showAvatar && (
                    <div
                        className={`w-8 h-8 rounded-full ${avatarColorFor(message.sender_id)} text-white flex items-center justify-center text-[11px] font-bold`}
                        title={message.sender_name}
                    >
                        {initialsOf(message.sender_name)}
                    </div>
                )}
            </div>

            <div className={`relative group max-w-[85%] sm:max-w-[70%] min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`} ref={wrapperRef}>
                {/* Sender name */}
                {!isOwn && showSenderName && (
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5 px-1">
                        {message.sender_name}
                        {message.sender_role !== 'student' && (
                            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                {message.sender_role}
                            </span>
                        )}
                    </span>
                )}

                {/* Bubble */}
                <div
                    onContextMenu={(e) => {
                        e.preventDefault();
                        openMenu();
                    }}
                    onTouchStart={onTouchStart}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    className={`relative rounded-2xl px-3 py-2 shadow-sm break-words ${bubbleBase} ${priorityClass} ${
                        message.is_sticky ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''
                    } ${pending ? 'opacity-70' : ''} ${failed ? 'ring-1 ring-red-400' : ''}`}
                >
                    {/* Hover chevron (desktop) */}
                    {!deleted && (
                        <button
                            onClick={openMenu}
                            className={`chat-message-menu hidden md:flex absolute top-1 ${isOwn ? 'left-1' : 'right-1'} p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                isOwn ? 'hover:bg-blue-700 text-blue-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}
                            aria-label="Message actions"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    )}

                    {/* Sticky / priority badges */}
                    {(message.is_sticky || message.priority !== 'normal') && !deleted && (
                        <div className="flex items-center gap-2 mb-1">
                            {message.priority !== 'normal' && (
                                <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                        message.priority === 'urgent'
                                            ? 'text-red-500 dark:text-red-400'
                                            : 'text-amber-600 dark:text-amber-400'
                                    }`}
                                >
                                    <AlertTriangle className="w-3 h-3" />
                                    {message.priority}
                                </span>
                            )}
                            {message.is_sticky && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isOwn ? 'text-blue-100' : 'text-amber-600 dark:text-amber-400'}`}>
                                    <Pin className="w-3 h-3" />
                                    Sticky
                                </span>
                            )}
                        </div>
                    )}

                    {message.forwarded_from && !deleted && (
                        <div className={`flex items-center gap-1 text-[11px] italic mb-1 ${metaColor}`}>
                            <Forward className="w-3 h-3" />
                            Forwarded
                        </div>
                    )}

                    {/* Deleted tombstone */}
                    {deleted ? (
                        <p className={`text-sm italic ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            This message was deleted
                        </p>
                    ) : (
                        <>
                            {/* Reply quote */}
                            {message.reply_to && (
                                <button
                                    onClick={() => {
                                        const ok = scrollToMessage(message.reply_to!.message_id);
                                        if (!ok) toast('Original message is not loaded yet');
                                    }}
                                    className={`block w-full text-left border-l-2 pl-2 py-1 mb-1.5 rounded-r ${
                                        isOwn
                                            ? 'border-blue-300 bg-blue-500/40'
                                            : 'border-blue-500 bg-gray-50 dark:bg-gray-700/60'
                                    }`}
                                >
                                    <span className={`block text-[11px] font-semibold truncate ${isOwn ? 'text-blue-50' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {message.reply_to.sender_name}
                                    </span>
                                    <span className={`block text-xs truncate ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {message.reply_to.preview || 'Attachment'}
                                    </span>
                                </button>
                            )}

                            {/* Poll / event structured content */}
                            {message.poll_id && <PollMessage pollId={message.poll_id} message={message} />}
                            {message.event_id && <EventCard eventId={message.event_id} message={message} />}

                            {/* Images */}
                            {images.length > 0 && (
                                <div className={`grid gap-1.5 mb-1.5 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {images.map((att) => (
                                        <img
                                            key={att.id}
                                            src={resolveFileUrl(att.url)}
                                            alt={att.file_name}
                                            loading="lazy"
                                            onClick={() => setViewerUrl(resolveFileUrl(att.url))}
                                            className="rounded-xl object-cover w-full max-h-64 cursor-zoom-in bg-gray-100 dark:bg-gray-700"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Videos */}
                            {videos.map((att) => (
                                <video
                                    key={att.id}
                                    src={resolveFileUrl(att.url)}
                                    controls
                                    preload="metadata"
                                    className="rounded-xl w-full max-h-72 mb-1.5 bg-black"
                                />
                            ))}

                            {/* Audio */}
                            {audios.map((att) => (
                                <div key={att.id} className="mb-1.5 min-w-[200px]">
                                    <AudioPlayer src={resolveFileUrl(att.url)} durationHint={att.duration} />
                                </div>
                            ))}

                            {/* Files */}
                            {files.map((att: ChatAttachment) => (
                                <a
                                    key={att.id}
                                    href={resolveFileUrl(att.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={att.file_name}
                                    className={`flex items-center gap-2 p-2 mb-1.5 rounded-xl transition-colors ${
                                        isOwn
                                            ? 'bg-blue-500/40 hover:bg-blue-500/60'
                                            : 'bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                            isOwn ? 'bg-blue-400/40' : 'bg-white dark:bg-gray-800'
                                        }`}
                                    >
                                        <FileText className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-semibold truncate">{att.file_name}</span>
                                        <span className={`block text-[11px] ${metaColor}`}>{formatFileSize(att.size)}</span>
                                    </span>
                                    <Download className={`w-4 h-4 shrink-0 ${metaColor}`} />
                                </a>
                            ))}

                            {/* Text content */}
                            {message.content && (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                    {linkifySegments(message.content).map((seg, i) => {
                                        if (seg.type === 'link') {
                                            return (
                                                <a
                                                    key={i}
                                                    href={seg.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`underline break-all ${isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'}`}
                                                >
                                                    {seg.value}
                                                </a>
                                            );
                                        }
                                        if (seg.type === 'mention') {
                                            return (
                                                <span
                                                    key={i}
                                                    className={`font-medium rounded px-0.5 ${
                                                        isOwn
                                                            ? 'bg-blue-500/60 text-white'
                                                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                    }`}
                                                >
                                                    {seg.value}
                                                </span>
                                            );
                                        }
                                        return <span key={i}>{seg.value}</span>;
                                    })}
                                </p>
                            )}
                        </>
                    )}

                    {/* Meta row */}
                    <div className={`flex items-center justify-end gap-1 mt-1 ${metaColor}`}>
                        {isAcceptedAnswer && (
                            <span className="mr-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Accepted
                            </span>
                        )}
                        {message.edited_at && !deleted && <span className="text-[10px]">edited</span>}
                        <span className="text-[10px]">{formatMessageTime(message.created_at)}</span>
                        {isOwn && isDirect && !pending && !failed && (
                            <>
                                {message.read_by?.length > 0 ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                ) : message.delivered_to?.length > 0 ? (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                            </>
                        )}
                        {pending && <Clock className="w-3 h-3" />}
                    </div>

                    {/* Context menu */}
                    {menuOpen && (
                        <div
                            className={`chat-message-menu absolute top-6 ${isOwn ? 'right-0' : 'left-0'} w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200`}
                        >
                            <MenuItem icon={<CornerUpLeft className="w-4 h-4" />} label="Reply" onClick={onReply} />
                            {!inThread && (
                                <MenuItem icon={<MessageSquare className="w-4 h-4" />} label="Reply in thread" onClick={onReplyInThread} />
                            )}
                            <MenuItem
                                icon={<Forward className="w-4 h-4" />}
                                label="Forward"
                                onClick={() => {
                                    closeMenu();
                                    setForwardOpen(true);
                                }}
                            />
                            {message.content && <MenuItem icon={<Copy className="w-4 h-4" />} label="Copy" onClick={onCopy} />}
                            <MenuItem
                                icon={starred ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                                label={starred ? 'Unstar' : 'Star'}
                                onClick={onToggleStar}
                            />
                            {isModerator && (
                                <MenuItem
                                    icon={message.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                    label={message.is_pinned ? 'Unpin' : 'Pin'}
                                    onClick={onTogglePin}
                                />
                            )}
                            {canAcceptAnswer && (
                                <MenuItem icon={<CheckCircle2 className="w-4 h-4" />} label="Accept answer" onClick={onAcceptAnswer} />
                            )}
                            {canEdit && <MenuItem icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={onEdit} />}
                            <MenuItem
                                icon={<Trash2 className="w-4 h-4" />}
                                label="Delete"
                                danger
                                onClick={() => {
                                    closeMenu();
                                    setDeleteOpen(true);
                                }}
                            />
                            {!isOwn && (
                                <MenuItem
                                    icon={<Flag className="w-4 h-4" />}
                                    label="Report"
                                    danger
                                    onClick={() => {
                                        closeMenu();
                                        setReportOpen(true);
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Failed send → retry */}
                {failed && (
                    <button
                        onClick={() => retrySend(message.conversation_id, message.client_temp_id || message.id).catch(() => undefined)}
                        className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Failed to send — retry
                    </button>
                )}

                {/* Doubt upvote */}
                {isDoubt && !deleted && (
                    <button
                        onClick={onToggleUpvote}
                        className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${
                            upvoted
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                        {message.upvoted_by?.length || 0}
                    </button>
                )}

                {/* Thread chip */}
                {!inThread && !deleted && (message.thread_reply_count || 0) > 0 && (
                    <button
                        onClick={() => loadThread(message.id).catch(() => undefined)}
                        className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <MessageSquare className="w-3 h-3" />
                        {message.thread_reply_count} {message.thread_reply_count === 1 ? 'reply' : 'replies'} →
                    </button>
                )}

                {/* Reactions row */}
                {!deleted && reactionsEnabled && (
                    <div className={`relative flex flex-wrap items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {(message.reactions || [])
                            .filter((r) => r.user_ids.length > 0)
                            .map((r) => {
                                const mine = r.user_ids.includes(myId);
                                return (
                                    <button
                                        key={r.emoji}
                                        onClick={() => reactToMessage(message.id, r.emoji).catch(() => undefined)}
                                        title={`${r.user_ids.length} reaction${r.user_ids.length === 1 ? '' : 's'}`}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] transition-colors ${
                                            mine
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-400'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span>{r.emoji}</span>
                                        <span className="font-semibold">{r.user_ids.length}</span>
                                    </button>
                                );
                            })}
                        <button
                            onClick={() => setPickerOpen((v) => !v)}
                            className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-opacity"
                            aria-label="Add reaction"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>

                        {pickerOpen && (
                            <div className={`absolute bottom-8 z-50 ${isOwn ? 'right-0' : 'left-0'}`}>
                                <ReactionPicker onPick={onReact} onClose={() => setPickerOpen(false)} conversationType={conversation?.type} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Fullscreen image viewer */}
            {viewerUrl && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setViewerUrl(null)}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <button
                        onClick={() => setViewerUrl(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
                        aria-label="Close image"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={viewerUrl}
                        alt="Attachment"
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-h-full max-w-full rounded-xl object-contain"
                    />
                </div>
            )}

            {/* Delete scope dialog */}
            {deleteOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-gray-900 dark:text-white">Delete message</h3>
                            <button
                                onClick={() => setDeleteOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Choose who this message should be removed for. This cannot be undone.
                            </p>
                            <button
                                onClick={() => onDelete('me')}
                                className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                            >
                                Delete for me
                            </button>
                            {canDeleteEveryone && (
                                <button
                                    onClick={() => onDelete('everyone')}
                                    className="w-full text-left px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                                >
                                    Delete for everyone
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {forwardOpen && <ForwardModal messageIds={[message.id]} onClose={() => setForwardOpen(false)} />}
            {reportOpen && (
                <ReportModal
                    target={{
                        type: 'message',
                        messageId: message.id,
                        userId: message.sender_id,
                        conversationId: message.conversation_id,
                    }}
                    onClose={() => setReportOpen(false)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Local menu item
// ---------------------------------------------------------------------------

function MenuItem({
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

"use client";

import { useEffect, useRef, useState } from 'react';
import {
    AlertTriangle,
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
    ImageOff,
    Info,
    MessageSquare,
    Pencil,
    Pin,
    PinOff,
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
import { ReactionChips } from '@/components/chat/reaction-chips';
import { ImageLightbox } from '@/components/chat/image-lightbox';
import { MessageInfoModal } from '@/components/chat/message-info-modal';
import { FloatingMenu, type MenuAnchor } from '@/components/ui/floating-menu';
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
    const deleteMessage = useChatStore((s) => s.deleteMessage);
    const pinMessage = useChatStore((s) => s.pinMessage);
    const starMessage = useChatStore((s) => s.starMessage);
    const upvoteMessage = useChatStore((s) => s.upvoteMessage);
    const acceptAnswer = useChatStore((s) => s.acceptAnswer);
    const loadThread = useChatStore((s) => s.loadThread);
    const retrySend = useChatStore((s) => s.retrySend);
    const discardFailed = useChatStore((s) => s.discardFailed);
    const jumpToMessage = useChatStore((s) => s.jumpToMessage);
    const clearHighlight = useChatStore((s) => s.clearHighlight);
    const highlighted = useChatStore((s) => s.highlightMessageId === message.id);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
    // Time the menu was opened — decides whether Edit is still allowed.
    const [menuOpenedAt, setMenuOpenedAt] = useState(0);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [forwardOpen, setForwardOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

    const longPressRef = useRef<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const bubbleRef = useRef<HTMLDivElement | null>(null);

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

    // Reply-quote navigation: once the original is loaded, bring it into view.
    useEffect(() => {
        if (!highlighted) return;
        const id = window.setTimeout(() => {
            scrollToMessage(message.id);
            clearHighlight();
        }, 50);
        return () => window.clearTimeout(id);
    }, [highlighted, message.id, clearHighlight]);

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

    /** Open the actions menu next to the bubble, or at the pointer for right-click. */
    const openMenu = (point?: { x: number; y: number }) => {
        if (deleted || pending) return;
        const rect = bubbleRef.current?.getBoundingClientRect();
        if (!point && !rect) return;
        setMenuAnchor(point ? { kind: 'point', ...point } : { kind: 'rect', rect: rect!, align: isOwn ? 'end' : 'start' });
        setMenuOpenedAt(Date.now());
        setMenuOpen(true);
    };

    const onReplyQuoteClick = async () => {
        const targetId = message.reply_to?.message_id;
        if (!targetId || message.reply_to?.deleted) return;
        if (scrollToMessage(targetId)) return;
        const found = await jumpToMessage(targetId);
        if (!found) toast('The original message is no longer available');
    };

    const onTouchStart = () => {
        if (deleted) return;
        longPressRef.current = window.setTimeout(() => openMenu(), 500);
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
    // Own text (or captioned media) messages, within the server's 24h edit window.
    const canEdit = isOwn && !deleted && !pending && !failed && !!message.content
        && !['system', 'poll', 'event'].includes(message.type)
        && menuOpenedAt - new Date(message.created_at).getTime() < EDIT_WINDOW_MS;
    const canDeleteEveryone = isOwn || isModerator;
    const canSeeInfo = isOwn && !pending && !failed && !deleted;

    const images = (message.attachments || []).filter((a) => IMAGE_RE.test(a.mime_type));
    const videos = (message.attachments || []).filter((a) => VIDEO_RE.test(a.mime_type));
    const audios = (message.attachments || []).filter((a) => AUDIO_RE.test(a.mime_type));
    const files = (message.attachments || []).filter(
        (a) => !IMAGE_RE.test(a.mime_type) && !VIDEO_RE.test(a.mime_type) && !AUDIO_RE.test(a.mime_type),
    );

    // Photos/videos with nothing else render without a coloured bubble.
    const mediaOnly = !deleted && !message.content && !message.reply_to && !message.poll_id && !message.event_id
        && !message.forwarded_from && !message.is_sticky && message.priority === 'normal'
        && images.length + videos.length > 0 && files.length === 0 && audios.length === 0;

    const lightboxImages = images.map((a) => ({ src: resolveFileUrl(a.url), alt: a.file_name || 'Image', fileName: a.file_name }));

    const priorityClass =
        message.priority === 'urgent'
            ? 'border-l-4 border-red-500'
            : message.priority === 'high'
              ? 'border-l-4 border-amber-500'
              : '';

    // Own messages use a light tint so grey (sent) and blue (read) ticks stay distinguishable.
    const bubbleBase = mediaOnly
        ? ''
        : isOwn
          ? 'bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/80 text-gray-900 dark:text-gray-100'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100';

    const metaColor = 'text-gray-400 dark:text-gray-500';

    // Delivery state for your own messages (every conversation type):
    // pending → clock, failed → warning, sent/delivered → two grey ticks,
    // read by every recipient → two blue ticks.
    const recipients = message.recipient_count ?? 0;
    const readAll = recipients > 0
        ? (message.read_count ?? 0) >= recipients
        : isDirect && (message.read_by?.length ?? 0) > 0;
    const tickIcon = failed
        ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" aria-label="Not sent" />
        : pending
          ? <Clock className="w-3 h-3" aria-label="Sending" />
          : readAll
            ? <CheckCheck className="w-4 h-4 text-blue-500 dark:text-sky-400" aria-label="Read" />
            : <CheckCheck className="w-4 h-4" aria-label="Sent" />;
    const metaRow = (
        <>
            {isAcceptedAnswer && (
                <span className="mr-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Accepted
                </span>
            )}
            {message.edited_at && !deleted && <span className="text-[10px] italic">edited</span>}
            <span className="text-[10px]">{formatMessageTime(message.created_at)}</span>
            {isOwn && !deleted && tickIcon}
        </>
    );

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
                    ref={bubbleRef}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        openMenu({ x: e.clientX, y: e.clientY });
                    }}
                    onTouchStart={onTouchStart}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    className={`relative rounded-2xl break-words ${mediaOnly ? 'overflow-hidden' : 'px-3 py-2 shadow-sm'} ${bubbleBase} ${priorityClass} ${
                        message.is_sticky ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''
                    } ${pending ? 'opacity-70' : ''} ${failed ? 'ring-1 ring-red-400' : ''}`}
                >
                    {/* Hover chevron (desktop) */}
                    {!deleted && (
                        <button
                            onClick={() => (menuOpen ? closeMenu() : openMenu())}
                            className={`chat-message-menu hidden md:flex absolute z-10 top-1 ${isOwn ? 'left-1' : 'right-1'} p-1 rounded-full transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${
                                mediaOnly ? 'bg-black/40 text-white hover:bg-black/60' : 'bg-white/80 dark:bg-gray-900/70 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}
                            aria-label="Message actions"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
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
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
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
                        <p className="text-sm italic text-gray-500 dark:text-gray-400">
                            {isOwn ? 'You deleted this message' : 'This message was deleted'}
                        </p>
                    ) : (
                        <>
                            {/* Reply quote */}
                            {message.reply_to && (
                                <button
                                    onClick={() => void onReplyQuoteClick()}
                                    disabled={message.reply_to.deleted}
                                    title={message.reply_to.deleted ? undefined : 'Go to the original message'}
                                    className={`flex w-full min-w-[10rem] items-stretch gap-2 text-left rounded-lg overflow-hidden mb-1.5 transition-colors ${
                                        isOwn ? 'bg-blue-100/80 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/70' : 'bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200/70 dark:hover:bg-gray-700'
                                    } disabled:cursor-default`}
                                >
                                    <span className={`w-1 shrink-0 ${avatarColorFor(message.reply_to.sender_id)}`} />
                                    <span className="min-w-0 py-1.5 pr-2">
                                        <span className="block text-[11px] font-semibold truncate text-blue-700 dark:text-blue-300">
                                            {message.reply_to.sender_id === myId ? 'You' : message.reply_to.sender_name}
                                        </span>
                                        <span className="block text-xs truncate text-gray-600 dark:text-gray-300">
                                            {message.reply_to.deleted
                                                ? <span className="italic text-gray-400">Original message was deleted</span>
                                                : message.reply_to.preview || 'Attachment'}
                                        </span>
                                    </span>
                                </button>
                            )}

                            {/* Poll / event structured content */}
                            {message.poll_id && <PollMessage pollId={message.poll_id} message={message} />}
                            {message.event_id && <EventCard eventId={message.event_id} message={message} />}

                            {/* Images */}
                            {images.length === 1 && (
                                <MessageImage
                                    att={images[0]}
                                    broken={brokenImages[images[0].id]}
                                    onBroken={() => setBrokenImages((b) => ({ ...b, [images[0].id]: true }))}
                                    onOpen={() => setLightboxIndex(0)}
                                    className={mediaOnly ? '' : 'mb-1.5'}
                                />
                            )}
                            {images.length > 1 && (
                                <div className={`grid grid-cols-2 gap-1 w-[17rem] max-w-full ${mediaOnly ? '' : 'mb-1.5'}`}>
                                    {images.slice(0, 4).map((att, i) => (
                                        <button
                                            key={att.id}
                                            onClick={() => setLightboxIndex(i)}
                                            className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                                            aria-label={`Open image ${i + 1} of ${images.length}`}
                                        >
                                            {brokenImages[att.id] ? (
                                                <ImageOff className="absolute inset-0 m-auto w-6 h-6 text-gray-400" />
                                            ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={resolveFileUrl(att.url)}
                                                    alt={att.file_name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onError={() => setBrokenImages((b) => ({ ...b, [att.id]: true }))}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            {i === 3 && images.length > 4 && (
                                                <span className="absolute inset-0 bg-black/55 text-white text-xl font-semibold flex items-center justify-center">
                                                    +{images.length - 4}
                                                </span>
                                            )}
                                        </button>
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
                                    className={`rounded-xl max-w-full max-h-80 bg-black ${mediaOnly ? '' : 'mb-1.5'}`}
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
                                            ? 'bg-blue-100/80 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/70'
                                            : 'bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white dark:bg-gray-800">
                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
                                                    className="underline break-all text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                >
                                                    {seg.value}
                                                </a>
                                            );
                                        }
                                        if (seg.type === 'mention') {
                                            return (
                                                <span
                                                    key={i}
                                                    className="font-medium rounded px-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
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

                    {/* Meta row (overlaid on the photo for media-only messages) */}
                    {mediaOnly ? (
                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-white [&_svg]:text-current">
                            {metaRow}
                        </div>
                    ) : (
                        <div className={`flex items-center justify-end gap-1 mt-1 ${metaColor}`}>{metaRow}</div>
                    )}

                    {/* Context menu */}
                    {menuOpen && menuAnchor && (
                        <FloatingMenu
                            anchor={menuAnchor}
                            onClose={closeMenu}
                            className="chat-message-menu w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5"
                        >
                            <MenuItem icon={<CornerUpLeft className="w-4 h-4" />} label="Reply" onClick={onReply} />
                            {!inThread && (
                                <MenuItem icon={<MessageSquare className="w-4 h-4" />} label="Reply in thread" onClick={onReplyInThread} />
                            )}
                            {message.content && <MenuItem icon={<Copy className="w-4 h-4" />} label="Copy" onClick={onCopy} />}
                            {canEdit && <MenuItem icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={onEdit} />}
                            <MenuItem
                                icon={<Forward className="w-4 h-4" />}
                                label="Forward"
                                onClick={() => {
                                    closeMenu();
                                    setForwardOpen(true);
                                }}
                            />
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
                            {canSeeInfo && (
                                <MenuItem
                                    icon={<Info className="w-4 h-4" />}
                                    label="Message info"
                                    onClick={() => {
                                        closeMenu();
                                        setInfoOpen(true);
                                    }}
                                />
                            )}
                            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
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
                        </FloatingMenu>
                    )}
                </div>

                {/* Failed send → retry */}
                {failed && (
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold">
                        <span className="text-red-600 dark:text-red-400">Not sent.</span>
                        <button
                            onClick={() => retrySend(message.conversation_id, message.client_temp_id || message.id).catch(() => undefined)}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </button>
                        <button
                            onClick={() => discardFailed(message.conversation_id, message.client_temp_id || message.id)}
                            className="text-gray-500 dark:text-gray-400 hover:underline"
                        >
                            Discard
                        </button>
                    </div>
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
                {!deleted && !pending && !failed && reactionsEnabled && (
                    <ReactionChips message={message} myId={myId} isOwn={isOwn} conversationType={conversation.type} />
                )}
            </div>

            {/* Fullscreen image viewer */}
            {lightboxIndex !== null && lightboxImages.length > 0 && (
                <ImageLightbox images={lightboxImages} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
            )}
            {infoOpen && <MessageInfoModal message={message} onClose={() => setInfoOpen(false)} />}

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
                                &ldquo;Delete for me&rdquo; hides it only on your devices. &ldquo;Delete for everyone&rdquo; removes it for all members. This cannot be undone.
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
// Local components
// ---------------------------------------------------------------------------

/** How long after sending the author may edit (matches the server rule). */
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** A single image at its natural aspect ratio (no cropping), click to open full screen. */
function MessageImage({
    att,
    broken,
    onBroken,
    onOpen,
    className = '',
}: {
    att: ChatAttachment;
    broken?: boolean;
    onBroken: () => void;
    onOpen: () => void;
    className?: string;
}) {
    const [loaded, setLoaded] = useState(false);
    const ratio = att.width && att.height ? att.width / att.height : undefined;
    if (broken) {
        return (
            <div className={`flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-6 text-xs text-gray-500 ${className}`}>
                <ImageOff className="w-5 h-5" /> Image unavailable
            </div>
        );
    }
    return (
        <button onClick={onOpen} className={`relative block rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`} aria-label={`Open ${att.file_name || 'image'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={resolveFileUrl(att.url)}
                alt={att.file_name}
                width={att.width}
                height={att.height}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={onBroken}
                style={ratio ? { aspectRatio: String(ratio) } : undefined}
                className={`block w-auto h-auto max-w-[min(100%,20rem)] sm:max-w-[22rem] max-h-[22rem] object-contain cursor-zoom-in transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {!loaded && <span className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />}
        </button>
    );
}

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
            role="menuitem"
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

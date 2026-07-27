"use client";

import {
    ChangeEvent,
    ClipboardEvent,
    DragEvent,
    KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    AlertTriangle,
    Calendar,
    Lock,
    Mic,
    MoreHorizontal,
    Pause,
    Paperclip,
    Pencil,
    Play,
    Reply,
    Send,
    Smile,
    Trash2,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { useChatStore } from '@/stores/chat-store';
import { chatService } from '@/services/api/chat.api';
import { getChatNsp } from '@/services/chat-socket';
import { EMOJI_CATEGORIES, formatDuration, formatFileSize, messagePreviewText } from '@/lib/chat-utils';
import {
    CHAT_EVENTS,
    MAX_ATTACHMENTS,
    MAX_ATTACHMENT_BYTES,
    MAX_MESSAGE_LENGTH,
} from '@/types/chat';
import type {
    ChatAttachment,
    ChatConversation,
    ConversationMemberView,
    MessagePriority,
} from '@/types/chat';

interface MessageInputProps {
    conversation: ChatConversation;
}

interface PendingFile {
    id: string;
    file: File;
    previewUrl: string | null;
}

interface MentionRef {
    id: string;
    name: string;
}

const RECENT_EMOJI_KEY = 'chat_recent_emojis';
const MAX_TEXTAREA_HEIGHT = 192; // ~8 rows
const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 3000;

function newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadRecentEmojis(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(RECENT_EMOJI_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === 'string').slice(0, 24) : [];
    } catch {
        return [];
    }
}

/**
 * Full-featured message composer: autosizing textarea, emoji picker,
 * attachments (file picker / drag-drop / paste), voice recorder, @-mention
 * autocomplete, reply/edit banners and admin delivery options.
 */
export function MessageInput({ conversation }: MessageInputProps) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    const sendMessage = useChatStore((s) => s.sendMessage);
    const editMessage = useChatStore((s) => s.editMessage);
    const replyTarget = useChatStore((s) => s.replyTarget);
    const editingMessage = useChatStore((s) => s.editingMessage);
    const setReplyTarget = useChatStore((s) => s.setReplyTarget);
    const setEditingMessage = useChatStore((s) => s.setEditingMessage);

    const [text, setText] = useState('');
    const [pending, setPending] = useState<PendingFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Emoji picker
    const [showEmoji, setShowEmoji] = useState(false);
    const [emojiSearch, setEmojiSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0]?.name ?? '');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

    // Mentions
    const [members, setMembers] = useState<ConversationMemberView[]>([]);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [mentions, setMentions] = useState<MentionRef[]>([]);
    const mentionRangeRef = useRef<{ start: number; end: number } | null>(null);

    // Voice recording
    const [recState, setRecState] = useState<'idle' | 'recording' | 'paused'>('idle');
    const [elapsed, setElapsed] = useState(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const cancelledRef = useRef(false);
    const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Admin delivery options
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [priority, setPriority] = useState<MessagePriority>('normal');
    const [sticky, setSticky] = useState(false);
    const [scheduledFor, setScheduledFor] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const typingLastRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef<PendingFile[]>([]);

    // Delivery options (priority / sticky / schedule) are staff-only. The auth
    // User union is 'admin' | 'student'; compare via String so a future
    // 'teacher' role also unlocks them without a type error.
    const isStaff = mounted && (user?.role === 'admin' || String(user?.role) === 'teacher');

    // ------------------------------------------------------------------
    // Permission / disabled states
    // ------------------------------------------------------------------
    const membership = conversation.membership;
    const isModerator =
        membership.role === 'owner' || membership.role === 'moderator' || isStaff;
    const mutedUntil = membership.muted_until ? new Date(membership.muted_until) : null;
    const isMuted = Boolean(mutedUntil && mutedUntil.getTime() > Date.now());
    const isLocked = conversation.settings.locked && !isModerator;
    const restricted = conversation.settings.who_can_post === 'moderators' && !isModerator;

    const disabledReason = isMuted
        ? `You are muted until ${mutedUntil!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : isLocked
          ? 'This conversation is locked'
          : restricted
            ? 'Only moderators can post here'
            : null;

    useEffect(() => {
        setMounted(true);
        setRecentEmojis(loadRecentEmojis());
    }, []);

    // Load members for mentions (groups only).
    useEffect(() => {
        if (conversation.type === 'direct') {
            setMembers([]);
            return;
        }
        let alive = true;
        chatService
            .listMembers(conversation.id)
            .then((m) => {
                if (alive) setMembers(m);
            })
            .catch(() => {
                /* mentions simply unavailable */
            });
        return () => {
            alive = false;
        };
    }, [conversation.id, conversation.type]);

    // Pre-fill when entering edit mode.
    useEffect(() => {
        if (editingMessage) {
            setText(editingMessage.content || '');
            requestAnimationFrame(() => {
                const ta = textareaRef.current;
                if (ta) {
                    ta.focus();
                    ta.selectionStart = ta.selectionEnd = ta.value.length;
                    adjustHeight();
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingMessage]);

    // Focus textarea when starting a reply.
    useEffect(() => {
        if (replyTarget) textareaRef.current?.focus();
    }, [replyTarget]);

    // Mirror pending files into a ref so cleanup always sees the latest list
    // (the cleanup below runs on conversation change, not on every edit).
    useEffect(() => {
        pendingRef.current = pending;
    }, [pending]);

    // Clean up on unmount / conversation change: stop typing, kill timers and
    // any live mic stream, and release object URLs for un-sent attachments.
    useEffect(() => {
        return () => {
            emitStopTyping();
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (tickerRef.current) clearInterval(tickerRef.current);
            cancelledRef.current = true;
            const recorder = recorderRef.current;
            if (recorder && recorder.state !== 'inactive') recorder.stop();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            pendingRef.current.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation.id]);

    // Switching conversations must not carry the draft/attachments/mentions over.
    const prevConversationRef = useRef(conversation.id);
    useEffect(() => {
        if (prevConversationRef.current === conversation.id) return;
        prevConversationRef.current = conversation.id;
        setText('');
        setPending([]);
        setMentions([]);
        setMentionOpen(false);
        setShowEmoji(false);
        setOptionsOpen(false);
        setPriority('normal');
        setSticky(false);
        setScheduledFor('');
        setRecState('idle');
        setElapsed(0);
        setReplyTarget(null);
        setEditingMessage(null);
    }, [conversation.id, setReplyTarget, setEditingMessage]);

    // Close emoji / options popovers on outside click.
    useEffect(() => {
        if (!showEmoji && !optionsOpen) return;
        const handler = (event: MouseEvent) => {
            const t = event.target as Node;
            if (showEmoji && emojiRef.current && !emojiRef.current.contains(t)) setShowEmoji(false);
            if (optionsOpen && optionsRef.current && !optionsRef.current.contains(t)) setOptionsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showEmoji, optionsOpen]);

    // ------------------------------------------------------------------
    // Textarea autosize
    // ------------------------------------------------------------------
    const adjustHeight = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        const next = Math.min(ta.scrollHeight, MAX_TEXTAREA_HEIGHT);
        ta.style.height = `${next}px`;
        ta.style.overflowY = ta.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [text, adjustHeight]);

    // ------------------------------------------------------------------
    // Typing indicators
    // ------------------------------------------------------------------
    const emitTyping = useCallback(() => {
        const now = Date.now();
        if (now - typingLastRef.current > TYPING_THROTTLE_MS) {
            typingLastRef.current = now;
            try {
                getChatNsp().emit(CHAT_EVENTS.TYPING, { conversationId: conversation.id });
            } catch {
                /* socket not ready */
            }
        }
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(emitStopTyping, TYPING_IDLE_MS);
    }, [conversation.id]);

    function emitStopTyping() {
        typingLastRef.current = 0;
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        try {
            getChatNsp().emit(CHAT_EVENTS.STOP_TYPING, { conversationId: conversation.id });
        } catch {
            /* socket not ready */
        }
    }

    // ------------------------------------------------------------------
    // Mentions
    // ------------------------------------------------------------------
    const filteredMembers = useMemo(() => {
        const q = mentionQuery.toLowerCase();
        const others = members.filter((m) => m.user_id !== user?.id);
        if (!q) return others.slice(0, 8);
        return others.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
    }, [members, mentionQuery, user?.id]);

    const detectMention = (value: string, cursor: number) => {
        if (conversation.type === 'direct') return;
        const upToCursor = value.slice(0, cursor);
        const match = /(^|\s)@([\p{L}\p{N}._-]*)$/u.exec(upToCursor);
        if (match) {
            const start = cursor - match[2].length - 1; // include '@'
            mentionRangeRef.current = { start, end: cursor };
            setMentionQuery(match[2]);
            setMentionIndex(0);
            setMentionOpen(true);
        } else {
            setMentionOpen(false);
        }
    };

    const selectMention = (member: ConversationMemberView) => {
        const range = mentionRangeRef.current;
        if (!range) return;
        const insert = `@${member.name} `;
        const next = text.slice(0, range.start) + insert + text.slice(range.end);
        setText(next);
        setMentions((prev) => (prev.some((m) => m.id === member.user_id) ? prev : [...prev, { id: member.user_id, name: member.name }]));
        setMentionOpen(false);
        mentionRangeRef.current = null;
        requestAnimationFrame(() => {
            const ta = textareaRef.current;
            if (ta) {
                const pos = range.start + insert.length;
                ta.focus();
                ta.selectionStart = ta.selectionEnd = pos;
                adjustHeight();
            }
        });
    };

    // ------------------------------------------------------------------
    // Text change / key handling
    // ------------------------------------------------------------------
    const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setText(value);
        if (value.length > 0) emitTyping();
        detectMention(value, e.target.selectionStart ?? value.length);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionOpen && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex((i) => (i + 1) % filteredMembers.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMention(filteredMembers[mentionIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMentionOpen(false);
                return;
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    // ------------------------------------------------------------------
    // Emoji insertion
    // ------------------------------------------------------------------
    const insertAtCursor = (snippet: string) => {
        const ta = textareaRef.current;
        const start = ta?.selectionStart ?? text.length;
        const end = ta?.selectionEnd ?? text.length;
        const next = text.slice(0, start) + snippet + text.slice(end);
        setText(next);
        requestAnimationFrame(() => {
            if (ta) {
                ta.focus();
                ta.selectionStart = ta.selectionEnd = start + snippet.length;
                adjustHeight();
            }
        });
    };

    const pickEmoji = (emoji: string) => {
        insertAtCursor(emoji);
        setRecentEmojis((prev) => {
            const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 24);
            try {
                localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next));
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    const emojiGrid = useMemo(() => {
        const q = emojiSearch.trim().toLowerCase();
        if (q) {
            // The curated set carries no per-emoji keywords, so search matches
            // category names ("food", "travel"…) and, for pasted emoji, the
            // glyph itself.
            const byCategory = EMOJI_CATEGORIES.filter((c) => c.name.toLowerCase().includes(q)).flatMap((c) => c.emojis);
            const byGlyph = EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(emojiSearch.trim()));
            return Array.from(new Set([...byGlyph, ...byCategory]));
        }
        if (activeCategory === 'Recent') return recentEmojis;
        return EMOJI_CATEGORIES.find((c) => c.name === activeCategory)?.emojis ?? [];
    }, [emojiSearch, activeCategory, recentEmojis]);

    // ------------------------------------------------------------------
    // Attachments
    // ------------------------------------------------------------------
    const addFiles = (files: File[]) => {
        if (files.length === 0) return;
        setPending((prev) => {
            const room = MAX_ATTACHMENTS - prev.length;
            if (room <= 0) {
                toast.error(`You can attach up to ${MAX_ATTACHMENTS} files`);
                return prev;
            }
            const accepted: PendingFile[] = [];
            for (const file of files.slice(0, room)) {
                if (file.size > MAX_ATTACHMENT_BYTES) {
                    toast.error(`${file.name} exceeds the 25MB limit`);
                    continue;
                }
                accepted.push({
                    id: newId(),
                    file,
                    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                });
            }
            if (files.length > room) toast.error(`Only ${MAX_ATTACHMENTS} attachments allowed`);
            return [...prev, ...accepted];
        });
    };

    const removePending = (id: string) => {
        setPending((prev) => {
            const target = prev.find((p) => p.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((p) => p.id !== id);
        });
    };

    const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(Array.from(e.target.files));
        e.target.value = '';
    };

    const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = Array.from(e.clipboardData.files);
        const images = files.filter((f) => f.type.startsWith('image/'));
        if (images.length > 0) {
            e.preventDefault();
            addFiles(images);
        }
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files.length > 0) addFiles(Array.from(e.dataTransfer.files));
    };

    // ------------------------------------------------------------------
    // Voice recording
    // ------------------------------------------------------------------
    const startTicker = () => {
        if (tickerRef.current) clearInterval(tickerRef.current);
        tickerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    };
    const stopTicker = () => {
        if (tickerRef.current) {
            clearInterval(tickerRef.current);
            tickerRef.current = null;
        }
    };

    const startRecording = async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            toast.error('Voice recording is not supported in this browser');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];
            cancelledRef.current = false;
            let recorder: MediaRecorder;
            try {
                recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            } catch {
                recorder = new MediaRecorder(stream);
            }
            recorder.ondataavailable = (ev) => {
                if (ev.data.size > 0) chunksRef.current.push(ev.data);
            };
            recorder.onstop = () => {
                stopTicker();
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setRecState('idle');
                setElapsed(0);
                if (!cancelledRef.current && blob.size > 0) void sendVoice(blob);
            };
            recorderRef.current = recorder;
            recorder.start();
            setElapsed(0);
            setRecState('recording');
            startTicker();
        } catch {
            toast.error('Microphone access denied');
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };

    const pauseRecording = () => {
        const r = recorderRef.current;
        if (r && r.state === 'recording') {
            r.pause();
            stopTicker();
            setRecState('paused');
        }
    };
    const resumeRecording = () => {
        const r = recorderRef.current;
        if (r && r.state === 'paused') {
            r.resume();
            startTicker();
            setRecState('recording');
        }
    };
    const cancelRecording = () => {
        cancelledRef.current = true;
        const r = recorderRef.current;
        if (r && r.state !== 'inactive') r.stop();
        else {
            stopTicker();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            setRecState('idle');
            setElapsed(0);
        }
    };
    const finishRecording = () => {
        const r = recorderRef.current;
        if (r && r.state !== 'inactive') r.stop();
    };

    const sendVoice = async (blob: Blob) => {
        const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' });
        setUploading(true);
        try {
            const attachments = await chatService.uploadAttachments([file]);
            await sendMessage({ attachments });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to send voice note');
        } finally {
            setUploading(false);
        }
    };

    // ------------------------------------------------------------------
    // Send
    // ------------------------------------------------------------------
    const resetComposer = () => {
        setText('');
        pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        setPending([]);
        setMentions([]);
        setPriority('normal');
        setSticky(false);
        setScheduledFor('');
        setOptionsOpen(false);
        setReplyTarget(null);
        requestAnimationFrame(adjustHeight);
    };

    const handleSend = async () => {
        if (disabledReason || uploading) return;
        const content = text.trim();

        // Edit mode.
        if (editingMessage) {
            if (!content) return;
            try {
                await editMessage(editingMessage.id, content);
                setEditingMessage(null);
                setText('');
                requestAnimationFrame(adjustHeight);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err.message || 'Failed to edit message');
            }
            return;
        }

        if (!content && pending.length === 0) return;
        if (content.length > MAX_MESSAGE_LENGTH) {
            toast.error(`Message exceeds ${MAX_MESSAGE_LENGTH} characters`);
            return;
        }

        emitStopTyping();

        let attachments: ChatAttachment[] = [];
        if (pending.length > 0) {
            setUploading(true);
            try {
                attachments = await chatService.uploadAttachments(pending.map((p) => p.file));
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err.message || 'Failed to upload files');
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        const activeMentions = mentions.filter((m) => content.includes(`@${m.name}`)).map((m) => m.id);

        const payload: Parameters<typeof sendMessage>[0] = {
            content: content || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            reply_to_message_id: replyTarget?.id,
            mentions: activeMentions.length > 0 ? activeMentions : undefined,
            priority: isStaff && priority !== 'normal' ? priority : undefined,
            is_sticky: isStaff && sticky ? true : undefined,
            scheduled_for: isStaff && scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        };

        const wasScheduled = Boolean(payload.scheduled_for);
        try {
            await sendMessage(payload);
            if (wasScheduled) toast.success('Message scheduled');
            resetComposer();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to send message');
        }
    };

    // ------------------------------------------------------------------
    // Disabled bar
    // ------------------------------------------------------------------
    if (disabledReason) {
        return (
            <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Lock className="w-4 h-4" />
                    {disabledReason}
                </div>
            </div>
        );
    }

    const isRecording = recState !== 'idle';
    const canSend = (text.trim().length > 0 || pending.length > 0) && !uploading;

    return (
        <div
            className={`relative border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${
                dragActive ? 'ring-2 ring-inset ring-blue-500' : ''
            }`}
            onDragOver={(e) => {
                e.preventDefault();
                if (!isRecording) setDragActive(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                if (e.currentTarget === e.target) setDragActive(false);
            }}
            onDrop={onDrop}
        >
            {dragActive && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-50/90 dark:bg-blue-900/40 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">Drop files to attach</span>
                </div>
            )}

            {/* Reply / edit banner */}
            {(replyTarget || editingMessage) && (
                <div className="flex items-center gap-2 px-4 pt-2.5">
                    <div className="flex-1 min-w-0 flex items-center gap-2 border-l-2 border-blue-500 pl-2.5 py-1">
                        {editingMessage ? (
                            <Pencil className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                            <Reply className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {editingMessage ? 'Editing message' : `Replying to ${replyTarget?.sender_name}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {messagePreviewText(editingMessage ?? replyTarget!)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => (editingMessage ? (setEditingMessage(null), setText('')) : setReplyTarget(null))}
                        className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Pending attachment chips */}
            {pending.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                    {pending.map((p) => (
                        <div
                            key={p.id}
                            className="relative flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 max-w-[220px]"
                        >
                            {p.previewUrl ? (
                                <img src={p.previewUrl} alt="" className="w-9 h-9 rounded object-cover" />
                            ) : (
                                <div className="w-9 h-9 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{p.file.name}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatFileSize(p.file.size)}</p>
                            </div>
                            <button
                                onClick={() => removePending(p.id)}
                                className="ml-1 p-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                aria-label="Remove attachment"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Recording bar replaces the input row */}
            {isRecording ? (
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={cancelRecording}
                        className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label="Cancel recording"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 flex-1">
                        <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${recState === 'recording' ? 'animate-pulse' : ''}`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                            {formatDuration(elapsed)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {recState === 'paused' ? 'Paused' : 'Recording…'}
                        </span>
                    </div>
                    {recState === 'recording' ? (
                        <button
                            onClick={pauseRecording}
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Pause"
                        >
                            <Pause className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={resumeRecording}
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Resume"
                        >
                            <Play className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={finishRecording}
                        disabled={uploading}
                        className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                        aria-label="Send voice note"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex items-end gap-1.5 px-3 py-2.5">
                    {/* Attach */}
                    <input ref={fileInputRef} type="file" hidden multiple onChange={onFileInput} />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
                        aria-label="Attach files"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Emoji */}
                    <div className="relative shrink-0" ref={emojiRef}>
                        <button
                            onClick={() => setShowEmoji((v) => !v)}
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Emoji"
                        >
                            <Smile className="w-5 h-5" />
                        </button>
                        {showEmoji && (
                            <div className="absolute bottom-12 left-0 w-72 h-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                    <input
                                        value={emojiSearch}
                                        onChange={(e) => setEmojiSearch(e.target.value)}
                                        placeholder="Search emoji…"
                                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-1 min-h-0">
                                    {!emojiSearch && (
                                        <div className="w-12 shrink-0 overflow-y-auto border-r border-gray-100 dark:border-gray-700 py-1">
                                            {recentEmojis.length > 0 && (
                                                <button
                                                    onClick={() => setActiveCategory('Recent')}
                                                    className={`w-full py-1.5 text-lg ${activeCategory === 'Recent' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                                    title="Recent"
                                                >
                                                    🕘
                                                </button>
                                            )}
                                            {EMOJI_CATEGORIES.map((c) => (
                                                <button
                                                    key={c.name}
                                                    onClick={() => setActiveCategory(c.name)}
                                                    className={`w-full py-1.5 text-lg ${activeCategory === c.name ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                                    title={c.name}
                                                >
                                                    {c.emojis[0]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-y-auto p-2 grid grid-cols-7 gap-0.5 content-start">
                                        {emojiGrid.length === 0 ? (
                                            <p className="col-span-7 text-center text-xs text-gray-400 py-6">No emoji</p>
                                        ) : (
                                            emojiGrid.map((emoji, i) => (
                                                <button
                                                    key={`${emoji}-${i}`}
                                                    onClick={() => pickEmoji(emoji)}
                                                    className="w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    {emoji}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Textarea + mention dropdown */}
                    <div className="relative flex-1 min-w-0">
                        {mentionOpen && filteredMembers.length > 0 && (
                            <div className="absolute bottom-full mb-1 left-0 w-64 max-h-56 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                {filteredMembers.map((m, i) => (
                                    <button
                                        key={m.user_id}
                                        onClick={() => selectMention(m)}
                                        onMouseEnter={() => setMentionIndex(i)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
                                            i === mentionIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                                        }`}
                                    >
                                        <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                                            {m.name.slice(0, 1).toUpperCase()}
                                        </span>
                                        <span className="text-sm text-gray-900 dark:text-white truncate">{m.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={onChange}
                            onKeyDown={onKeyDown}
                            onPaste={onPaste}
                            onBlur={emitStopTyping}
                            rows={1}
                            placeholder={editingMessage ? 'Edit your message…' : 'Type a message…'}
                            className="w-full resize-none px-3 py-2 max-h-48 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
                        />
                    </div>

                    {/* Admin options */}
                    {isStaff && !editingMessage && (
                        <div className="relative shrink-0" ref={optionsRef}>
                            <button
                                onClick={() => setOptionsOpen((v) => !v)}
                                className={`p-2 rounded-full transition-colors ${
                                    optionsOpen || priority !== 'normal' || sticky || scheduledFor
                                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                aria-label="Delivery options"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {optionsOpen && (
                                <div className="absolute bottom-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                            Priority
                                        </p>
                                        <div className="flex gap-1">
                                            {(['normal', 'high', 'urgent'] as MessagePriority[]).map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setPriority(p)}
                                                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                                                        priority === p
                                                            ? p === 'urgent'
                                                                ? 'bg-red-600 text-white'
                                                                : p === 'high'
                                                                  ? 'bg-amber-500 text-white'
                                                                  : 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Sticky message</span>
                                        <input
                                            type="checkbox"
                                            checked={sticky}
                                            onChange={(e) => setSticky(e.target.checked)}
                                            className="accent-blue-600 w-4 h-4"
                                        />
                                    </label>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" /> Schedule
                                        </p>
                                        <input
                                            type="datetime-local"
                                            value={scheduledFor}
                                            onChange={(e) => setScheduledFor(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    {(priority === 'urgent' || priority === 'high') && (
                                        <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            This message will be highlighted for recipients.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Send or voice */}
                    {canSend || editingMessage ? (
                        <button
                            onClick={() => void handleSend()}
                            disabled={uploading || (Boolean(editingMessage) && text.trim().length === 0)}
                            className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 disabled:opacity-60 transition-colors"
                            aria-label={editingMessage ? 'Save edit' : 'Send message'}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => void startRecording()}
                            className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
                            aria-label="Record voice note"
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}

            {uploading && (
                <div className="px-4 pb-2 text-xs text-gray-500 dark:text-gray-400">Uploading…</div>
            )}
        </div>
    );
}

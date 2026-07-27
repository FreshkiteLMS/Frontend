import { env } from '@/config/env';
import type { ChatMessage } from '@/types/chat';

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/**
 * Resolve an attachment URL. Absolute URLs pass through; root-relative paths
 * (local-storage uploads like `/uploads/chat/x.png`) are prefixed with the API
 * server origin (env.API_URL minus its /api/v1 path).
 */
export function resolveFileUrl(url: string): string {
    if (!url) return url;
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
    let origin = 'http://localhost:3000';
    try {
        const u = new URL(env.API_URL);
        origin = `${u.protocol}//${u.host}`;
    } catch {
        // keep fallback
    }
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function toDate(value: string | number | Date): Date {
    return value instanceof Date ? value : new Date(value);
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** `3:45 PM` style timestamp for message bubbles. */
export function formatMessageTime(value: string | number | Date): string {
    const d = toDate(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Human relative last-seen: 'just now', '5 minutes ago', 'yesterday', … */
export function formatLastSeen(value: string | number | Date | null | undefined): string {
    if (!value) return 'a while ago';
    const d = toDate(value);
    if (isNaN(d.getTime())) return 'a while ago';
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 60_000) return 'just now';
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(d, yesterday)) return 'yesterday';
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** 'Today' / 'Yesterday' / weekday (this week) / 'Mar 4, 2026'. */
export function formatDaySeparator(value: string | number | Date): string {
    const d = toDate(value);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    if (isSameDay(d, now)) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, yesterday)) return 'Yesterday';
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** `mm:ss` for audio durations. */
export function formatDuration(totalSeconds: number): string {
    if (!isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
    const s = Math.round(totalSeconds);
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** `1.4 MB` style file size label. */
export function formatFileSize(bytes: number): string {
    if (!isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

/** Up to two initials from a display name. */
export function initialsOf(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-fuchsia-500',
    'bg-lime-600',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-pink-500',
];

/** Deterministic tailwind bg class for an id (pair with text-white). */
export function avatarColorFor(id: string): string {
    let hash = 0;
    for (let i = 0; i < (id || '').length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Linkify (XSS-safe tokenizer — returns segments, never HTML strings)
// ---------------------------------------------------------------------------

export interface LinkifySegment {
    type: 'text' | 'link' | 'mention';
    value: string;
    /** href for 'link' segments (adds https:// to bare www. links). */
    href?: string;
    /** Reserved for mention → user id resolution by the renderer. */
    userId?: string;
}

const LINKIFY_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|@[A-Za-z0-9._-]+)/g;

/**
 * Split message text into renderable segments. Pure tokenizer: the caller
 * renders each segment as a React node (text stays text — no HTML injection).
 */
export function linkifySegments(text: string): LinkifySegment[] {
    const segments: LinkifySegment[] = [];
    if (!text) return segments;
    let lastIndex = 0;
    for (const match of text.matchAll(LINKIFY_RE)) {
        const index = match.index ?? 0;
        const token = match[0];
        if (index > lastIndex) {
            segments.push({ type: 'text', value: text.slice(lastIndex, index) });
        }
        if (token.startsWith('@')) {
            segments.push({ type: 'mention', value: token });
        } else {
            // Trim trailing punctuation that is almost never part of a URL.
            const trimmed = token.replace(/[.,;:!?)\]}>]+$/, '');
            const trailing = token.slice(trimmed.length);
            segments.push({
                type: 'link',
                value: trimmed,
                href: trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed,
            });
            if (trailing) segments.push({ type: 'text', value: trailing });
        }
        lastIndex = index + token.length;
    }
    if (lastIndex < text.length) {
        segments.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return segments;
}

// ---------------------------------------------------------------------------
// Previews & grouping
// ---------------------------------------------------------------------------

/** Sidebar/reply preview text for a message (mirrors backend messagePreview). */
export function messagePreviewText(m: Pick<ChatMessage, 'type' | 'content' | 'attachments'> & { deleted_for_everyone?: boolean }): string {
    if (m.deleted_for_everyone) return 'Message deleted';
    switch (m.type) {
        case 'image':
            return '📷 Photo';
        case 'video':
            return '🎥 Video';
        case 'audio':
            return '🎤 Voice message';
        case 'file':
            return `📎 ${m.attachments?.[0]?.file_name || 'File'}`;
        case 'poll':
            return '📊 Poll';
        case 'event':
            return '📅 Event';
        case 'system':
            return m.content;
        default:
            return (m.content || '').slice(0, 120);
    }
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * Group consecutive messages by the same sender within a 5-minute window on
 * the same day. System messages are always their own group.
 */
export function groupConsecutive(messages: ChatMessage[]): ChatMessage[][] {
    const groups: ChatMessage[][] = [];
    for (const m of messages) {
        const current = groups[groups.length - 1];
        const prev = current?.[current.length - 1];
        const sameGroup =
            prev &&
            m.type !== 'system' &&
            prev.type !== 'system' &&
            prev.sender_id === m.sender_id &&
            isSameDay(toDate(prev.created_at), toDate(m.created_at)) &&
            toDate(m.created_at).getTime() - toDate(prev.created_at).getTime() < GROUP_WINDOW_MS;
        if (sameGroup && current) {
            current.push(m);
        } else {
            groups.push([m]);
        }
    }
    return groups;
}

// ---------------------------------------------------------------------------
// Emoji picker data (~8 categories × ~24 curated emojis)
// ---------------------------------------------------------------------------

export interface EmojiCategory {
    name: string;
    emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
    {
        name: 'Smileys',
        emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '😏', '😢', '😭', '😤'],
    },
    {
        name: 'Gestures',
        emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '🤝', '🙏', '💪', '👊', '✊', '🖐️', '✋', '👋', '🤙', '👉', '👈', '👆', '👇', '☝️', '🫶'],
    },
    {
        name: 'Emotions',
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯', '💢', '💥', '💫', '💦', '✨'],
    },
    {
        name: 'Animals & Nature',
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🦄', '🐝', '🦋', '🌸', '🌹', '🌻', '🌴', '🌊', '🔥'],
    },
    {
        name: 'Food & Drink',
        emojis: ['🍎', '🍌', '🍉', '🍇', '🍓', '🥭', '🍍', '🥥', '🍅', '🥑', '🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍫', '🍬', '☕', '🍵', '🥤', '🍺'],
    },
    {
        name: 'Activities',
        emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🥊', '🏆', '🥇', '🥈', '🥉', '🎯', '🎮', '🕹️', '🎲', '♟️', '🎳', '🎤', '🎧', '🎸', '🎹', '🎨'],
    },
    {
        name: 'Travel & Places',
        emojis: ['🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚀', '✈️', '🚁', '⛵', '🚢', '🚲', '🛴', '🏍️', '🚄', '🏠', '🏢', '🏫', '🏥', '🗼', '🗽', '🏖️', '🌍'],
    },
    {
        name: 'Objects & Symbols',
        emojis: ['💻', '🖥️', '⌨️', '🖱️', '📱', '📷', '🎥', '📚', '📖', '✏️', '📝', '📌', '📎', '🔍', '🔑', '🔒', '💡', '🔔', '⏰', '📅', '✅', '❌', '⚠️', '❓'],
    },
];

"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Ban,
    BookOpen,
    Check,
    ChevronDown,
    Flag,
    Github,
    Globe,
    Linkedin,
    Loader2,
    MessageCircle,
    Pencil,
    UserCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { usePresenceStore } from '@/stores/presence-store';
import { avatarColorFor, formatLastSeen, initialsOf } from '@/lib/chat-utils';
import type { ChatProfileView, PresenceStatus, UpdateChatProfileInput } from '@/types/chat';

const BADGE_EMOJI: Record<string, string> = {
    helpful_student: '🤝',
    top_contributor: '🏆',
    batch_mentor: '🎓',
    fast_responder: '⚡',
    streak_7: '🔥',
    streak_30: '💎',
};

const REPORT_REASONS = [
    'Harassment or bullying',
    'Spam or scam',
    'Hate speech',
    'Inappropriate content',
    'Impersonation',
    'Other',
];

const MAX_BIO = 500;

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

function isValidUrl(value: string): boolean {
    if (!value.trim()) return true;
    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/* Chip inputs                                                         */
/* ------------------------------------------------------------------ */

function TagInput({
    label,
    values,
    onChange,
    placeholder,
}: {
    label: string;
    values: string[];
    onChange: (next: string[]) => void;
    placeholder: string;
}) {
    const [draft, setDraft] = useState('');

    const commit = () => {
        const value = draft.trim();
        if (!value) return;
        if (values.length >= 20) {
            toast.error(`Up to 20 ${label.toLowerCase()} allowed`);
            return;
        }
        if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
        setDraft('');
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commit();
        } else if (event.key === 'Backspace' && !draft && values.length > 0) {
            onChange(values.slice(0, -1));
        }
    };

    return (
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                {label}
            </label>
            {values.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {values.map((v) => (
                        <span
                            key={v}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        >
                            {v}
                            <button
                                type="button"
                                onClick={() => onChange(values.filter((x) => x !== v))}
                                className="hover:text-blue-900 dark:hover:text-blue-100"
                                aria-label={`Remove ${v}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={commit}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Inline report modal (self-contained)                                */
/* ------------------------------------------------------------------ */

function InlineReportModal({
    userId,
    userName,
    onClose,
}: {
    userId: string;
    userName: string;
    onClose: () => void;
}) {
    const [reason, setReason] = useState(REPORT_REASONS[0]);
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            await chatService.report({ target_type: 'user', user_id: userId, reason, details: details.trim() });
            toast.success('Report submitted. Our team will review it.');
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to submit report'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report {userName}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                        aria-label="Close report dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className="space-y-2">
                        {REPORT_REASONS.map((r) => (
                            <label
                                key={r}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <input
                                    type="radio"
                                    name="report-reason"
                                    value={r}
                                    checked={reason === r}
                                    onChange={() => setReason(r)}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{r}</span>
                            </label>
                        ))}
                    </div>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        rows={3}
                        placeholder="Additional details (optional)"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    />
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                        Submit report
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* ProfileView                                                         */
/* ------------------------------------------------------------------ */

export function ProfileView({ userId }: { userId: string }) {
    const router = useRouter();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    const [profile, setProfile] = useState<ChatProfileView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [messaging, setMessaging] = useState(false);
    const [friendBusy, setFriendBusy] = useState(false);
    const [friendMenuOpen, setFriendMenuOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);

    // Edit form state
    const [bio, setBio] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const [githubUrl, setGithubUrl] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [showOnline, setShowOnline] = useState(true);
    const [allowDms, setAllowDms] = useState<'everyone' | 'friends' | 'none'>('everyone');

    const subscribe = usePresenceStore((s) => s.subscribe);
    // Subscribe to the map itself so live presence pushes re-render the header card.
    const presence = usePresenceStore((s) => s.statuses[userId]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const hydrateForm = useCallback((p: ChatProfileView) => {
        setBio(p.bio || '');
        setSkills(p.skills || []);
        setInterests(p.interests || []);
        setGithubUrl(p.github_url || '');
        setLinkedinUrl(p.linkedin_url || '');
        setPortfolioUrl(p.portfolio_url || '');
        setShowOnline(p.privacy?.show_online ?? true);
        setAllowDms(p.privacy?.allow_dms ?? 'everyone');
    }, []);

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const p = await chatSocialService.getProfile(userId);
            setProfile(p);
            hydrateForm(p);
        } catch (err) {
            setError(errorMessage(err, 'Failed to load profile'));
        } finally {
            setLoading(false);
        }
    }, [userId, hydrateForm]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (userId) subscribe([userId]);
    }, [userId, subscribe]);

    useEffect(() => {
        if (!friendMenuOpen) return;
        const onDown = (event: MouseEvent) => {
            if (!(event.target as Element).closest('.friend-state-menu')) setFriendMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [friendMenuOpen]);

    const isSelf = !!profile && (profile.friendship_status === 'self' || (mounted && !!user && user.id === userId));

    const openDirect = async () => {
        setMessaging(true);
        try {
            const conversation = await chatService.createDirect(userId);
            if (!conversation?.id) throw new Error('Failed to open conversation');
            router.push(`/chat/${conversation.id}`);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to open conversation'));
        } finally {
            setMessaging(false);
        }
    };

    const runFriendAction = async (fn: () => Promise<unknown>, successMessage: string, failure: string) => {
        setFriendBusy(true);
        try {
            await fn();
            toast.success(successMessage);
            await load();
        } catch (err) {
            toast.error(errorMessage(err, failure));
        } finally {
            setFriendBusy(false);
        }
    };

    const save = async () => {
        if (bio.length > MAX_BIO) {
            toast.error(`Bio must be ${MAX_BIO} characters or fewer`);
            return;
        }
        for (const [name, value] of [
            ['GitHub URL', githubUrl],
            ['LinkedIn URL', linkedinUrl],
            ['Portfolio URL', portfolioUrl],
        ] as const) {
            if (!isValidUrl(value)) {
                toast.error(`${name} must be a valid http(s) link`);
                return;
            }
        }

        const dto: UpdateChatProfileInput = {
            bio: bio.trim(),
            skills,
            interests,
            github_url: githubUrl.trim(),
            linkedin_url: linkedinUrl.trim(),
            portfolio_url: portfolioUrl.trim(),
            privacy: { show_online: showOnline, allow_dms: allowDms },
        };

        setSaving(true);
        try {
            const updated = await chatSocialService.updateMyProfile(dto);
            // updateMyProfile returns only the editable profile fields, not the
            // full view (no user/presence/friendship_status), so merge rather
            // than replace to keep the rest of the page intact.
            setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
            hydrateForm({ ...(profile ?? {}), ...updated } as ChatProfileView);
            setEditing(false);
            toast.success('Profile updated');
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to update profile'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center text-center px-4">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">Profile unavailable</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error || 'This profile could not be loaded.'}</p>
                <button
                    onClick={load}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                    Try again
                </button>
            </div>
        );
    }

    const person = profile.user;
    const status: PresenceStatus = presence?.status ?? profile.presence?.status ?? 'offline';
    const lastSeen = presence?.last_seen_at ?? profile.presence?.last_seen_at ?? null;
    const currentCourses = profile.courses?.current ?? [];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header card */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                        <div className="relative shrink-0">
                            <div
                                className={`w-20 h-20 rounded-full ${avatarColorFor(person.id)} text-white text-2xl font-bold flex items-center justify-center`}
                            >
                                {initialsOf(person.name)}
                            </div>
                            <span
                                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${presenceDotClass(status)}`}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{person.name}</h1>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                    {person.role}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {status === 'online' ? 'Online now' : `Last seen ${formatLastSeen(lastSeen)}`}
                            </p>
                            {(profile.streak?.current ?? 0) > 0 && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                    🔥 {profile.streak?.current}-day streak (best {profile.streak?.longest ?? 0})
                                </p>
                            )}

                            {/* Action row */}
                            {mounted && (
                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    {isSelf ? (
                                        <button
                                            onClick={() => setEditing((v) => !v)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                            {editing ? 'Close editor' : 'Edit profile'}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={openDirect}
                                                disabled={messaging}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {messaging ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <MessageCircle className="w-4 h-4" />
                                                )}
                                                Message
                                            </button>

                                            {profile.friendship_status === 'none' && (
                                                <button
                                                    onClick={() =>
                                                        runFriendAction(
                                                            () => chatSocialService.sendFriendRequest(userId),
                                                            'Friend request sent',
                                                            'Failed to send friend request'
                                                        )
                                                    }
                                                    disabled={friendBusy}
                                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors disabled:opacity-60"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    Add friend
                                                </button>
                                            )}

                                            {profile.friendship_status === 'request_sent' && (
                                                <span className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-semibold">
                                                    <Check className="w-4 h-4" />
                                                    Requested
                                                </span>
                                            )}

                                            {profile.friendship_status === 'request_received' && (
                                                <button
                                                    onClick={() => router.push('/friends')}
                                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    Respond to request
                                                </button>
                                            )}

                                            {profile.friendship_status === 'friends' && (
                                                <div className="relative friend-state-menu">
                                                    <button
                                                        onClick={() => setFriendMenuOpen((v) => !v)}
                                                        disabled={friendBusy}
                                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors disabled:opacity-60"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                        Friends
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                    {friendMenuOpen && (
                                                        <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button
                                                                onClick={() => {
                                                                    setFriendMenuOpen(false);
                                                                    runFriendAction(
                                                                        () => chatSocialService.unfriend(userId),
                                                                        `Removed ${person.name}`,
                                                                        'Failed to remove friend'
                                                                    );
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                            >
                                                                Unfriend
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {profile.friendship_status === 'blocked' ? (
                                                <button
                                                    onClick={() =>
                                                        runFriendAction(
                                                            () => chatSocialService.unblockUser(userId),
                                                            `Unblocked ${person.name}`,
                                                            'Failed to unblock user'
                                                        )
                                                    }
                                                    disabled={friendBusy}
                                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors disabled:opacity-60"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                    Unblock
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        if (!window.confirm(`Block ${person.name}?`)) return;
                                                        runFriendAction(
                                                            () => chatSocialService.blockUser(userId),
                                                            `Blocked ${person.name}`,
                                                            'Failed to block user'
                                                        );
                                                    }}
                                                    disabled={friendBusy}
                                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors disabled:opacity-60"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                    Block
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setReportOpen(true)}
                                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-semibold transition-colors"
                                            >
                                                <Flag className="w-4 h-4" />
                                                Report
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Edit form */}
                {isSelf && editing && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit profile</h2>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                Bio
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
                                rows={4}
                                placeholder="Tell your batchmates a little about yourself…"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                                {bio.length}/{MAX_BIO}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <TagInput label="Skills" values={skills} onChange={setSkills} placeholder="Type a skill and press Enter" />
                            <TagInput
                                label="Interests"
                                values={interests}
                                onChange={setInterests}
                                placeholder="Type an interest and press Enter"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {(
                                [
                                    ['GitHub', githubUrl, setGithubUrl, 'https://github.com/username'],
                                    ['LinkedIn', linkedinUrl, setLinkedinUrl, 'https://linkedin.com/in/username'],
                                    ['Portfolio', portfolioUrl, setPortfolioUrl, 'https://your-site.dev'],
                                ] as Array<[string, string, (v: string) => void, string]>
                            ).map(([label, value, setter, placeholder]) => (
                                <div key={label}>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                        {label}
                                    </label>
                                    <input
                                        value={value}
                                        onChange={(e) => setter(e.target.value)}
                                        placeholder={placeholder}
                                        className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                            isValidUrl(value)
                                                ? 'border-gray-300 dark:border-gray-700'
                                                : 'border-red-500 dark:border-red-500'
                                        }`}
                                    />
                                    {!isValidUrl(value) && (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">Enter a valid http(s) link</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    Show online status
                                </label>
                                <select
                                    value={showOnline ? 'yes' : 'no'}
                                    onChange={(e) => setShowOnline(e.target.value === 'yes')}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="yes">Visible to everyone</option>
                                    <option value="no">Hidden</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    Who can message me
                                </label>
                                <select
                                    value={allowDms}
                                    onChange={(e) => setAllowDms(e.target.value as 'everyone' | 'friends' | 'none')}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="everyone">Everyone</option>
                                    <option value="friends">Friends only</option>
                                    <option value="none">Nobody</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => {
                                    hydrateForm(profile);
                                    setEditing(false);
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Save changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Bio */}
                {profile.bio && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">About</h2>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{profile.bio}</p>
                    </div>
                )}

                {/* Skills + interests */}
                {((profile.skills?.length ?? 0) > 0 || (profile.interests?.length ?? 0) > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {(profile.skills?.length ?? 0) > 0 && (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                                    Skills
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {(profile.skills ?? []).map((s) => (
                                        <span
                                            key={s}
                                            className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(profile.interests?.length ?? 0) > 0 && (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                                    Interests
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {(profile.interests ?? []).map((s) => (
                                        <span
                                            key={s}
                                            className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Links */}
                {(profile.github_url || profile.linkedin_url || profile.portfolio_url) && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Links</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            {profile.github_url && (
                                <a
                                    href={profile.github_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                >
                                    <Github className="w-4 h-4" />
                                    GitHub
                                </a>
                            )}
                            {profile.linkedin_url && (
                                <a
                                    href={profile.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                >
                                    <Linkedin className="w-4 h-4" />
                                    LinkedIn
                                </a>
                            )}
                            {profile.portfolio_url && (
                                <a
                                    href={profile.portfolio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
                                >
                                    <Globe className="w-4 h-4" />
                                    Portfolio
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Current courses */}
                {currentCourses.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                            Current courses
                        </h2>
                        <ul className="space-y-2">
                            {currentCourses.map((title) => (
                                <li key={title} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <BookOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                    <span className="truncate">{title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Badges */}
                {(profile.badges?.length ?? 0) > 0 && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Badges</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {(profile.badges ?? []).map((b) => (
                                <div
                                    key={b.key}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                                >
                                    <span className="text-2xl leading-none">{BADGE_EMOJI[b.key] || '🏅'}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{b.label}</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {formatLastSeen(b.awarded_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Messages sent" value={profile.stats?.messages_sent ?? 0} />
                    <StatCard label="Helpful marks" value={profile.stats?.helpful_marks ?? 0} />
                    <StatCard label="Accepted answers" value={profile.stats?.accepted_answers ?? 0} />
                </div>
            </div>

            {reportOpen && (
                <InlineReportModal userId={userId} userName={person.name} onClose={() => setReportOpen(false)} />
            )}
        </div>
    );
}

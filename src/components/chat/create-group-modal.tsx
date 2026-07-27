"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    Camera,
    Check,
    HelpCircle,
    Loader2,
    Megaphone,
    Search,
    Users,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { avatarColorFor, initialsOf, resolveFileUrl } from '@/lib/chat-utils';
import type { ChatConversation, ChatUserSummary } from '@/types/chat';

interface CreateGroupModalProps {
    onClose: () => void;
    onCreated?: (c: ChatConversation) => void;
}

type GroupKind = 'group' | 'announcement' | 'doubt';

const KINDS: Array<{ value: GroupKind; label: string; hint: string; Icon: typeof Users; staffOnly: boolean }> = [
    { value: 'group', label: 'Group', hint: 'Everyone can chat', Icon: Users, staffOnly: false },
    { value: 'announcement', label: 'Announcement channel', hint: 'Only moderators can post', Icon: Megaphone, staffOnly: true },
    { value: 'doubt', label: 'Doubt channel', hint: 'Q&A style discussion', Icon: HelpCircle, staffOnly: false },
];

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const role = (user?.role || '') as string;
    const isStaff = role === 'admin' || role === 'teacher';

    const [step, setStep] = useState<1 | 2>(1);
    const [kind, setKind] = useState<GroupKind>('group');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ChatUserSummary[]>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<ChatUserSummary[]>([]);

    const [modsOnly, setModsOnly] = useState(false);
    const [reactionsEnabled, setReactionsEnabled] = useState(true);
    const [creating, setCreating] = useState(false);

    const isAnnouncement = kind === 'announcement';

    // Announcement channels force moderators-only posting.
    useEffect(() => {
        if (isAnnouncement) setModsOnly(true);
    }, [isAnnouncement]);

    // Debounced user search.
    useEffect(() => {
        const term = query.trim();
        if (term.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                const users = await chatSocialService.searchUsers(term);
                setResults(users);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);

    const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

    const toggleUser = (u: ChatUserSummary) => {
        setSelected((prev) => (prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]));
    };

    const pickAvatar = async (file: File | undefined) => {
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const attachments = await chatService.uploadAttachments([file]);
            if (attachments[0]?.url) setAvatarUrl(attachments[0].url);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to upload image');
        } finally {
            setUploadingAvatar(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const goNext = () => {
        if (!name.trim()) {
            toast.error('Please enter a name');
            return;
        }
        setStep(2);
    };

    const create = async () => {
        if (creating) return;
        if (!name.trim()) {
            toast.error('Please enter a name');
            return;
        }
        setCreating(true);
        try {
            const conversation = await chatService.createGroup({
                name: name.trim(),
                description: description.trim() || undefined,
                avatar_url: avatarUrl || undefined,
                type: kind,
                member_ids: selected.map((s) => s.id),
                settings: {
                    who_can_post: modsOnly || isAnnouncement ? 'moderators' : 'everyone',
                    reactions_enabled: reactionsEnabled,
                },
            });
            toast.success(isAnnouncement ? 'Channel created' : 'Group created');
            onCreated?.(conversation);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    const availableKinds = KINDS.filter((k) => !k.staffOnly || (mounted && isStaff));

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label="Back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                {step === 1 ? 'New conversation' : 'Add members'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Step {step} of 2</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {step === 1 ? (
                    <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                        {/* Type selector */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                Type
                            </p>
                            <div className="space-y-2">
                                {availableKinds.map(({ value, label, hint, Icon }) => {
                                    const active = kind === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setKind(value)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                                                active
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <div
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                                    active
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                                }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
                                            </div>
                                            {active && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:opacity-90 transition-opacity"
                                aria-label="Upload avatar"
                            >
                                {uploadingAvatar ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                ) : avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={resolveFileUrl(avatarUrl)} alt="Group avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-5 h-5" />
                                )}
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => pickAvatar(e.target.files?.[0])}
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                <p className="font-semibold text-gray-700 dark:text-gray-300">Group photo</p>
                                <p>Optional — PNG or JPG.</p>
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={80}
                                placeholder={isAnnouncement ? 'Batch 2025 Announcements' : 'Study group'}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                Description <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                maxLength={300}
                                placeholder="What is this conversation about?"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                        {/* Selected chips */}
                        {selected.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selected.map((u) => (
                                    <span
                                        key={u.id}
                                        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40"
                                    >
                                        <span
                                            className={`w-5 h-5 rounded-full ${avatarColorFor(u.id)} text-white text-[10px] font-bold flex items-center justify-center`}
                                        >
                                            {initialsOf(u.name)}
                                        </span>
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{u.name}</span>
                                        <button
                                            onClick={() => toggleUser(u)}
                                            className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200"
                                            aria-label={`Remove ${u.name}`}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search people by name or email"
                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="min-h-[120px]">
                            {searching ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                </div>
                            ) : results.length === 0 ? (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                                    {query.trim().length < 2 ? 'Type at least 2 characters to search.' : 'No users found.'}
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {results.map((u) => {
                                        const picked = selectedIds.has(u.id);
                                        return (
                                            <li key={u.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleUser(u)}
                                                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                                                        picked
                                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-9 h-9 rounded-full ${avatarColorFor(u.id)} text-white text-xs font-bold flex items-center justify-center shrink-0`}
                                                    >
                                                        {initialsOf(u.name)}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {u.name}
                                                        </span>
                                                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {u.email || u.role}
                                                        </span>
                                                    </span>
                                                    {picked && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Settings */}
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Settings
                            </p>
                            <label
                                className={`flex items-center justify-between gap-3 ${
                                    isAnnouncement ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                                        Only moderators can post
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                        {isAnnouncement ? 'Always on for announcement channels' : 'Members can still react'}
                                    </span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={modsOnly}
                                    disabled={isAnnouncement}
                                    onChange={(e) => setModsOnly(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                                />
                            </label>
                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-gray-900 dark:text-white">Reactions</span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                        Allow emoji reactions on messages
                                    </span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={reactionsEnabled}
                                    onChange={(e) => setReactionsEnabled(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={goNext}
                            disabled={!name.trim() || uploadingAvatar}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={create}
                            disabled={creating}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60"
                        >
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                            {creating ? 'Creating…' : `Create${selected.length ? ` (${selected.length})` : ''}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

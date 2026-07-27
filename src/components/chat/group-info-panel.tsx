"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowDownCircle,
    Ban,
    Camera,
    Check,
    Copy,
    GraduationCap,
    HelpCircle,
    Image as ImageIcon,
    Link2,
    Loader2,
    Lock,
    LogOut,
    Megaphone,
    MessageSquare,
    MoreVertical,
    Pencil,
    Pin,
    Radio,
    RefreshCw,
    Search,
    Settings as SettingsIcon,
    ShieldCheck,
    Trash2,
    Unlock,
    UserPlus,
    Users,
    VolumeX,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { useChatStore } from '@/stores/chat-store';
import { usePresenceStore } from '@/stores/presence-store';
import { avatarColorFor, initialsOf, resolveFileUrl } from '@/lib/chat-utils';
import type {
    ChatAttachment,
    ChatConversation,
    ChatUserSummary,
    ConversationMemberView,
    PresenceStatus,
} from '@/types/chat';

interface GroupInfoPanelProps {
    conversation: ChatConversation;
    onClose: () => void;
}

type Tab = 'members' | 'media' | 'settings';
type MemberFlag = 'notifications_muted' | 'pinned' | 'archived';

const TYPE_META: Record<string, { label: string; Icon: typeof Users; chip: string }> = {
    group: { label: 'Group', Icon: Users, chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    announcement: { label: 'Announcement', Icon: Megaphone, chip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    batch: { label: 'Batch', Icon: GraduationCap, chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    doubt: { label: 'Doubt channel', Icon: HelpCircle, chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    live: { label: 'Live room', Icon: Radio, chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    support: { label: 'Support', Icon: ShieldCheck, chip: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    direct: { label: 'Direct', Icon: MessageSquare, chip: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

const PRESENCE_DOT: Record<PresenceStatus, string> = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
};

const MUTE_OPTIONS: Array<{ label: string; minutes: number }> = [
    { label: 'Mute 10 minutes', minutes: 10 },
    { label: 'Mute 1 hour', minutes: 60 },
    { label: 'Mute 1 day', minutes: 1440 },
];

export function GroupInfoPanel({ conversation, onClose }: GroupInfoPanelProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);

    const messages = useChatStore((s) => s.messages[conversation.id]);
    const upsertConversation = useChatStore((s) => s.upsertConversation);
    const subscribe = usePresenceStore((s) => s.subscribe);
    const statuses = usePresenceStore((s) => s.statuses);

    const [tab, setTab] = useState<Tab>('members');
    const [members, setMembers] = useState<ConversationMemberView[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const [muteMenuFor, setMuteMenuFor] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [nameDraft, setNameDraft] = useState(conversation.name);
    const [descDraft, setDescDraft] = useState(conversation.description || '');
    const [savingMeta, setSavingMeta] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    const [adding, setAdding] = useState(false);
    const [addQuery, setAddQuery] = useState('');
    const [addResults, setAddResults] = useState<ChatUserSummary[]>([]);
    const [addSelected, setAddSelected] = useState<ChatUserSummary[]>([]);
    const [addSearching, setAddSearching] = useState(false);
    const [addSaving, setAddSaving] = useState(false);

    const [inviteToken, setInviteToken] = useState<string>(conversation.invite_token || '');
    const [rotatingInvite, setRotatingInvite] = useState(false);
    const [busyFlag, setBusyFlag] = useState<string | null>(null);
    const [lightbox, setLightbox] = useState<ChatAttachment | null>(null);

    useEffect(() => {
        setMounted(true);
        const id = window.setTimeout(() => setOpen(true), 10);
        return () => window.clearTimeout(id);
    }, []);

    const myRole = conversation.membership?.role;
    const globalRole = (user?.role || '') as string;
    const isAdmin = globalRole === 'admin' || globalRole === 'teacher';
    const isModerator = myRole === 'owner' || myRole === 'moderator' || isAdmin;
    const isOwner = myRole === 'owner' || isAdmin;

    const meta = TYPE_META[conversation.type] || TYPE_META.group;
    const TypeIcon = meta.Icon;

    const loadMembers = useCallback(async () => {
        setLoadingMembers(true);
        try {
            const list = await chatService.listMembers(conversation.id);
            setMembers(list);
            subscribe(list.map((m) => m.user_id));
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to load members');
        } finally {
            setLoadingMembers(false);
        }
    }, [conversation.id, subscribe]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    // Close per-member menus when clicking outside.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.member-menu-root')) {
                setMenuFor(null);
                setMuteMenuFor(null);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    // Debounced add-member search.
    useEffect(() => {
        if (!adding) return;
        const term = addQuery.trim();
        if (term.length < 2) {
            setAddResults([]);
            setAddSearching(false);
            return;
        }
        setAddSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                const users = await chatSocialService.searchUsers(term);
                const existing = new Set(members.map((m) => m.user_id));
                setAddResults(users.filter((u) => !existing.has(u.id)));
            } catch {
                setAddResults([]);
            } finally {
                setAddSearching(false);
            }
        }, 300);
        return () => window.clearTimeout(timer);
    }, [addQuery, adding, members]);

    const mediaAttachments = useMemo(() => {
        const list = messages || [];
        const out: ChatAttachment[] = [];
        for (const m of list) {
            if (m.deleted_for_everyone) continue;
            for (const a of m.attachments || []) {
                if (a.mime_type?.startsWith('image/') || a.mime_type?.startsWith('video/')) out.push(a);
            }
        }
        return out.reverse();
    }, [messages]);

    const saveMeta = async () => {
        if (savingMeta) return;
        setSavingMeta(true);
        try {
            const updated = await chatService.updateConversation(conversation.id, {
                name: nameDraft.trim() || conversation.name,
                description: descDraft.trim(),
            });
            upsertConversation({ ...conversation, ...updated });
            setEditing(false);
            toast.success('Updated');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update');
        } finally {
            setSavingMeta(false);
        }
    };

    const changeAvatar = async (file: File | undefined) => {
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const attachments = await chatService.uploadAttachments([file]);
            const url = attachments[0]?.url;
            if (!url) throw new Error('Upload failed');
            const updated = await chatService.updateConversation(conversation.id, { avatar_url: url });
            upsertConversation({ ...conversation, ...updated });
            toast.success('Photo updated');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update photo');
        } finally {
            setUploadingAvatar(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    const withMemberAction = async (fn: () => Promise<unknown>, successMsg: string) => {
        setMenuFor(null);
        setMuteMenuFor(null);
        try {
            await fn();
            toast.success(successMsg);
            await loadMembers();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Action failed');
        }
    };

    const messageMember = async (userId: string) => {
        setMenuFor(null);
        try {
            const conv = await chatService.createDirect(userId);
            if (!conv?.id) throw new Error('Failed to open conversation');
            upsertConversation(conv);
            onClose();
            router.push(`/chat/${conv.id}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to open conversation');
        }
    };

    const submitAddMembers = async () => {
        if (addSelected.length === 0 || addSaving) return;
        setAddSaving(true);
        try {
            await chatService.addMembers(conversation.id, addSelected.map((u) => u.id));
            toast.success(`${addSelected.length} member${addSelected.length === 1 ? '' : 's'} added`);
            setAddSelected([]);
            setAddQuery('');
            setAdding(false);
            await loadMembers();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to add members');
        } finally {
            setAddSaving(false);
        }
    };

    const toggleFlag = async (flag: MemberFlag) => {
        const next = !conversation.membership?.[flag];
        const payload: { pinned?: boolean; archived?: boolean; notifications_muted?: boolean } =
            flag === 'pinned' ? { pinned: next } : flag === 'archived' ? { archived: next } : { notifications_muted: next };
        setBusyFlag(flag);
        try {
            await chatService.setFlags(conversation.id, payload);
            upsertConversation({
                ...conversation,
                membership: { ...conversation.membership, ...payload },
            });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update setting');
        } finally {
            setBusyFlag(null);
        }
    };

    const rotateInvite = async () => {
        setRotatingInvite(true);
        try {
            const { invite_token } = await chatService.rotateInviteLink(conversation.id);
            setInviteToken(invite_token);
            upsertConversation({ ...conversation, invite_token });
            toast.success('Invite link ready');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to generate invite link');
        } finally {
            setRotatingInvite(false);
        }
    };

    const copyInvite = async () => {
        if (!inviteToken) return;
        const link = `${window.location.origin}/chat/join/${inviteToken}`;
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Invite link copied');
        } catch {
            toast.error('Could not copy link');
        }
    };

    const toggleLock = async () => {
        const locked = conversation.settings?.locked;
        if (!window.confirm(locked ? 'Unlock this group so members can post again?' : 'Lock this group? Only moderators will be able to post.')) return;
        try {
            if (locked) await chatService.unlockConversation(conversation.id);
            else await chatService.lockConversation(conversation.id);
            upsertConversation({
                ...conversation,
                settings: { ...conversation.settings, locked: !locked },
            });
            toast.success(locked ? 'Group unlocked' : 'Group locked');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update group');
        }
    };

    const toggleWhoCanPost = async () => {
        const next = conversation.settings?.who_can_post === 'moderators' ? 'everyone' : 'moderators';
        try {
            const updated = await chatService.updateConversation(conversation.id, {
                settings: { who_can_post: next },
            });
            upsertConversation({ ...conversation, ...updated });
            toast.success(next === 'moderators' ? 'Only moderators can post' : 'Everyone can post');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update group');
        }
    };

    const leaveGroup = async () => {
        if (!window.confirm('Leave this conversation? You will stop receiving its messages.')) return;
        try {
            await chatService.leaveConversation(conversation.id);
            const state = useChatStore.getState();
            const conversations = { ...state.conversations };
            delete conversations[conversation.id];
            useChatStore.setState({
                conversations,
                conversationOrder: state.conversationOrder.filter((id) => id !== conversation.id),
                activeConversationId: null,
            });
            toast.success('You left the conversation');
            onClose();
            router.push('/chat');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to leave conversation');
        }
    };

    const roleChip = (role: string) => {
        if (role === 'owner') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        if (role === 'moderator') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        return '';
    };

    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
                    open ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-hidden={!open}
            />

            <aside
                className={`fixed top-0 right-0 z-[70] h-full w-full sm:w-[400px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-out ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
                role="dialog"
                aria-label="Conversation info"
            >
                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Group info</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close panel"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Identity */}
                <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative">
                            <div
                                className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold ${
                                    conversation.avatar_url ? 'bg-gray-100 dark:bg-gray-800' : avatarColorFor(conversation.id)
                                }`}
                            >
                                {conversation.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={resolveFileUrl(conversation.avatar_url)}
                                        alt={conversation.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    initialsOf(conversation.name || 'Chat')
                                )}
                            </div>
                            {isModerator && (
                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-white dark:border-gray-900 transition-colors"
                                    aria-label="Change photo"
                                >
                                    {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                </button>
                            )}
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => changeAvatar(e.target.files?.[0])}
                            />
                        </div>

                        {editing ? (
                            <div className="w-full mt-4 space-y-2">
                                <input
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    maxLength={80}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Group name"
                                />
                                <textarea
                                    value={descDraft}
                                    onChange={(e) => setDescDraft(e.target.value)}
                                    rows={2}
                                    maxLength={300}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Description"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setNameDraft(conversation.name);
                                            setDescDraft(conversation.description || '');
                                        }}
                                        className="flex-1 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveMeta}
                                        disabled={savingMeta}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60"
                                    >
                                        {savingMeta ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mt-3">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{conversation.name}</h3>
                                    {isModerator && (
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                                            aria-label="Edit group details"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <span
                                    className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.chip}`}
                                >
                                    <TypeIcon className="w-3 h-3" />
                                    {meta.label}
                                </span>
                                {conversation.description && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{conversation.description}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {conversation.member_count || members.length} member
                                    {(conversation.member_count || members.length) === 1 ? '' : 's'}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    {(
                        [
                            { key: 'members' as const, label: 'Members', Icon: Users },
                            { key: 'media' as const, label: 'Media', Icon: ImageIcon },
                            { key: 'settings' as const, label: 'Settings', Icon: SettingsIcon },
                        ]
                    ).map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-b-2 ${
                                tab === key
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {tab === 'members' && (
                        <div className="p-4">
                            {isModerator && (
                                <div className="mb-3">
                                    {!adding ? (
                                        <button
                                            onClick={() => setAdding(true)}
                                            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors justify-center"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Add members
                                        </button>
                                    ) : (
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                    Add members
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setAdding(false);
                                                        setAddSelected([]);
                                                        setAddQuery('');
                                                    }}
                                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                                                    aria-label="Cancel adding members"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {addSelected.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {addSelected.map((u) => (
                                                        <span
                                                            key={u.id}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300"
                                                        >
                                                            {u.name}
                                                            <button
                                                                onClick={() =>
                                                                    setAddSelected((prev) => prev.filter((p) => p.id !== u.id))
                                                                }
                                                                aria-label={`Remove ${u.name}`}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                <input
                                                    value={addQuery}
                                                    onChange={(e) => setAddQuery(e.target.value)}
                                                    placeholder="Search people"
                                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {addSearching ? (
                                                <div className="flex justify-center py-3">
                                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                                </div>
                                            ) : (
                                                addResults.length > 0 && (
                                                    <ul className="max-h-40 overflow-y-auto space-y-1">
                                                        {addResults.map((u) => {
                                                            const picked = addSelected.some((p) => p.id === u.id);
                                                            return (
                                                                <li key={u.id}>
                                                                    <button
                                                                        onClick={() =>
                                                                            setAddSelected((prev) =>
                                                                                picked
                                                                                    ? prev.filter((p) => p.id !== u.id)
                                                                                    : [...prev, u],
                                                                            )
                                                                        }
                                                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                                                                            picked
                                                                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className={`w-7 h-7 rounded-full ${avatarColorFor(u.id)} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}
                                                                        >
                                                                            {initialsOf(u.name)}
                                                                        </span>
                                                                        <span className="min-w-0 flex-1 text-sm text-gray-900 dark:text-white truncate">
                                                                            {u.name}
                                                                        </span>
                                                                        {picked && (
                                                                            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                        )}
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )
                                            )}

                                            <button
                                                onClick={submitAddMembers}
                                                disabled={addSelected.length === 0 || addSaving}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                                            >
                                                {addSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Add {addSelected.length > 0 ? `(${addSelected.length})` : ''}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {loadingMembers ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                            ) : members.length === 0 ? (
                                <div className="flex flex-col items-center py-12 text-center">
                                    <Users className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No members yet.</p>
                                </div>
                            ) : (
                                <ul className="space-y-1">
                                    {members.map((m) => {
                                        const presence = statuses[m.user_id]?.status || 'offline';
                                        const isMe = mounted && user?.id === m.user_id;
                                        const muted = m.muted_until && new Date(m.muted_until).getTime() > Date.now();
                                        return (
                                            <li
                                                key={m.user_id}
                                                className="member-menu-root relative flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                                            >
                                                <div className="relative shrink-0">
                                                    <div
                                                        className={`w-10 h-10 rounded-full ${avatarColorFor(m.user_id)} text-white text-xs font-bold flex items-center justify-center`}
                                                    >
                                                        {initialsOf(m.name)}
                                                    </div>
                                                    <span
                                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${PRESENCE_DOT[presence]}`}
                                                    />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {m.name}
                                                            {isMe && <span className="text-gray-400 dark:text-gray-500"> (you)</span>}
                                                        </p>
                                                        {m.role !== 'member' && (
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleChip(m.role)}`}
                                                            >
                                                                {m.role}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {m.banned ? 'Banned' : muted ? 'Muted' : m.email}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setMuteMenuFor(null);
                                                        setMenuFor(menuFor === m.user_id ? null : m.user_id);
                                                    }}
                                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                                                    aria-label={`Actions for ${m.name}`}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {menuFor === m.user_id && (
                                                    <div className="absolute right-2 top-12 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        {!isMe && (
                                                            <button
                                                                onClick={() => messageMember(m.user_id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                                Message
                                                            </button>
                                                        )}

                                                        {isModerator && !isMe && (
                                                            <>
                                                                {isOwner && (
                                                                    <button
                                                                        onClick={() =>
                                                                            withMemberAction(
                                                                                () =>
                                                                                    chatService.setMemberRole(
                                                                                        conversation.id,
                                                                                        m.user_id,
                                                                                        m.role === 'moderator' ? 'member' : 'moderator',
                                                                                    ),
                                                                                m.role === 'moderator' ? 'Demoted to member' : 'Promoted to moderator',
                                                                            )
                                                                        }
                                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                    >
                                                                        {m.role === 'moderator' ? (
                                                                            <ArrowDownCircle className="w-4 h-4" />
                                                                        ) : (
                                                                            <ShieldCheck className="w-4 h-4" />
                                                                        )}
                                                                        {m.role === 'moderator' ? 'Demote to member' : 'Promote to moderator'}
                                                                    </button>
                                                                )}

                                                                {muted ? (
                                                                    <button
                                                                        onClick={() =>
                                                                            withMemberAction(
                                                                                () => chatService.unmuteMember(conversation.id, m.user_id),
                                                                                'Member unmuted',
                                                                            )
                                                                        }
                                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                    >
                                                                        <VolumeX className="w-4 h-4" />
                                                                        Unmute
                                                                    </button>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() =>
                                                                                setMuteMenuFor(muteMenuFor === m.user_id ? null : m.user_id)
                                                                            }
                                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                        >
                                                                            <VolumeX className="w-4 h-4" />
                                                                            Mute…
                                                                        </button>
                                                                        {muteMenuFor === m.user_id && (
                                                                            <div className="mt-1 mx-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 py-1">
                                                                                {MUTE_OPTIONS.map((opt) => (
                                                                                    <button
                                                                                        key={opt.minutes}
                                                                                        onClick={() =>
                                                                                            withMemberAction(
                                                                                                () =>
                                                                                                    chatService.muteMember(
                                                                                                        conversation.id,
                                                                                                        m.user_id,
                                                                                                        opt.minutes,
                                                                                                    ),
                                                                                                'Member muted',
                                                                                            )
                                                                                        }
                                                                                        className="w-full text-left px-4 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                                    >
                                                                                        {opt.label}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <button
                                                                    onClick={() =>
                                                                        withMemberAction(
                                                                            () =>
                                                                                m.banned
                                                                                    ? chatService.unbanMember(conversation.id, m.user_id)
                                                                                    : chatService.banMember(conversation.id, m.user_id),
                                                                            m.banned ? 'Member unbanned' : 'Member banned',
                                                                        )
                                                                    }
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                    {m.banned ? 'Unban' : 'Ban'}
                                                                </button>

                                                                <button
                                                                    onClick={() =>
                                                                        withMemberAction(
                                                                            () => chatService.removeMember(conversation.id, m.user_id),
                                                                            'Member removed',
                                                                        )
                                                                    }
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Remove from group
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}

                    {tab === 'media' && (
                        <div className="p-4">
                            {mediaAttachments.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-center">
                                    <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No photos or videos in the loaded history.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-1.5">
                                    {mediaAttachments.map((a) => (
                                        <button
                                            key={a.id}
                                            onClick={() => setLightbox(a)}
                                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:opacity-90 transition-opacity"
                                        >
                                            {a.mime_type.startsWith('image/') ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={resolveFileUrl(a.url)}
                                                    alt={a.file_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video src={resolveFileUrl(a.url)} className="w-full h-full object-cover" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'settings' && (
                        <div className="p-4 space-y-6">
                            {/* My settings */}
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    My settings
                                </p>
                                {(
                                    [
                                        { flag: 'notifications_muted' as const, label: 'Mute notifications', Icon: VolumeX },
                                        { flag: 'pinned' as const, label: 'Pin chat', Icon: Pin },
                                        { flag: 'archived' as const, label: 'Archive chat', Icon: ArrowDownCircle },
                                    ]
                                ).map(({ flag, label, Icon }) => (
                                    <label
                                        key={flag}
                                        className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
                                    >
                                        <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            {label}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(conversation.membership?.[flag])}
                                            disabled={busyFlag === flag}
                                            onChange={() => toggleFlag(flag)}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                                        />
                                    </label>
                                ))}
                            </div>

                            {/* Invite link */}
                            {isModerator && conversation.type !== 'direct' && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                        Invite link
                                    </p>
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                                        {inviteToken ? (
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 min-w-0 truncate text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5">
                                                    {inviteToken}
                                                </code>
                                                <button
                                                    onClick={copyInvite}
                                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                                                    aria-label="Copy invite link"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                No invite link yet. Generate one to let people join.
                                            </p>
                                        )}
                                        <button
                                            onClick={rotateInvite}
                                            disabled={rotatingInvite}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors disabled:opacity-60"
                                        >
                                            {rotatingInvite ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : inviteToken ? (
                                                <RefreshCw className="w-4 h-4" />
                                            ) : (
                                                <Link2 className="w-4 h-4" />
                                            )}
                                            {inviteToken ? 'Rotate link' : 'Generate link'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Moderator zone */}
                            {isModerator && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                        Moderation
                                    </p>
                                    <div className="space-y-1">
                                        <label className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer">
                                            <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Megaphone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                Only moderators can post
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={conversation.settings?.who_can_post === 'moderators'}
                                                onChange={toggleWhoCanPost}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                                            />
                                        </label>
                                        <button
                                            onClick={toggleLock}
                                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                                        >
                                            {conversation.settings?.locked ? (
                                                <Unlock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            ) : (
                                                <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            )}
                                            {conversation.settings?.locked ? 'Unlock group' : 'Lock group'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Danger zone */}
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={leaveGroup}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Leave conversation
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Media lightbox */}
            {lightbox && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <button
                        onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                        aria-label="Close preview"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                        {lightbox.mime_type.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={resolveFileUrl(lightbox.url)}
                                alt={lightbox.file_name}
                                className="max-w-full max-h-[85vh] rounded-xl object-contain"
                            />
                        ) : (
                            <video
                                src={resolveFileUrl(lightbox.url)}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-xl"
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

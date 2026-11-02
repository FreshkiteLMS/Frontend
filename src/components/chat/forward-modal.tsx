"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Forward, Hash, Loader2, Search, Send, User, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { useChatStore } from '@/stores/chat-store';
import { useFriendStore } from '@/stores/friend-store';
import { chatSocialService } from '@/services/api/chat-social.api';
import { avatarColorFor, initialsOf, resolveFileUrl } from '@/lib/chat-utils';
import { Modal } from '@/components/ui/modal';
import type { ChatConversation, ChatUserRole } from '@/types/chat';

interface ForwardModalProps {
    messageIds: string[];
    onClose: () => void;
}

/** One selectable recipient: an existing chat (group, channel, DM) or a person. */
type Recipient =
    | { kind: 'conversation'; key: string; id: string; title: string; subtitle: string; avatarUrl: string | null; group: boolean }
    | { kind: 'user'; key: string; id: string; title: string; subtitle: string; avatarUrl: null; group: false };

type Tab = 'all' | 'people' | 'groups';

const TYPE_LABEL: Record<string, string> = {
    direct: 'Direct message',
    group: 'Group',
    batch: 'Batch group',
    course: 'Course group',
    doubt: 'Doubt channel',
    announcement: 'Announcements',
    support: 'Support',
    live: 'Live session',
};

const roleLabel = (role?: ChatUserRole | string) =>
    role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : role === 'student' ? 'Student' : 'Member';

function conversationRecipient(c: ChatConversation): Recipient {
    if (c.type === 'direct') {
        const other = c.other_user;
        return {
            kind: 'conversation', key: `c:${c.id}`, id: c.id,
            title: other?.name || 'Direct message',
            subtitle: other ? roleLabel(other.role) : 'Direct message',
            avatarUrl: other?.avatar ?? null,
            group: false,
        };
    }
    return {
        kind: 'conversation', key: `c:${c.id}`, id: c.id,
        title: c.name || 'Conversation',
        subtitle: `${TYPE_LABEL[c.type] ?? 'Group'}${c.member_count ? ` · ${c.member_count} members` : ''}`,
        avatarUrl: c.avatar_url,
        group: true,
    };
}

/**
 * Forward messages to people and/or chats. Lists the user's conversations
 * (groups and existing DMs), their friends, and — while searching — anyone the
 * server's user search returns. Picking a person forwards to the direct chat
 * with them (created if needed); the server applies the same block / privacy
 * rules as starting a chat and reports any recipient it refused.
 *
 * Rendered through a portal (see Modal): message rows use
 * `content-visibility: auto`, which clipped the old in-place dialog.
 */
export function ForwardModal({ messageIds, onClose }: ForwardModalProps) {
    const { user } = useAuth();
    const myId = user?.id || '';
    const conversations = useChatStore((s) => s.conversations);
    const order = useChatStore((s) => s.conversationOrder);
    const forwardMessages = useChatStore((s) => s.forwardMessages);
    const friends = useFriendStore((s) => s.friends);
    const loadFriends = useFriendStore((s) => s.loadFriends);

    const [query, setQuery] = useState('');
    const [tab, setTab] = useState<Tab>('all');
    const [selected, setSelected] = useState<Recipient[]>([]);
    const [sending, setSending] = useState(false);
    const [failures, setFailures] = useState<Array<{ title: string; message: string }>>([]);
    const [searchResults, setSearchResults] = useState<Recipient[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        loadFriends().catch(() => undefined);
    }, [loadFriends]);

    // People search on the server (debounced) once 2+ characters are typed.
    useEffect(() => {
        const term = query.trim();
        if (term.length < 2 || tab === 'groups') {
            setSearchResults([]);
            setSearching(false);
            setSearchError(null);
            return;
        }
        let cancelled = false;
        setSearching(true);
        const t = window.setTimeout(() => {
            chatSocialService.searchUsers(term)
                .then((users) => {
                    if (cancelled) return;
                    setSearchError(null);
                    setSearchResults(users.filter((u) => u.id !== myId).map((u) => ({
                        kind: 'user', key: `u:${u.id}`, id: u.id, title: u.name,
                        subtitle: [roleLabel(u.role), (u as { student_code?: string | null }).student_code].filter(Boolean).join(' · '),
                        avatarUrl: null, group: false,
                    })));
                })
                .catch(() => { if (!cancelled) setSearchError('People search is unavailable right now.'); })
                .finally(() => { if (!cancelled) setSearching(false); });
        }, 300);
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [query, tab, myId]);

    const { chats, people } = useMemo(() => {
        const convs = order.map((id) => conversations[id]).filter((c): c is ChatConversation => Boolean(c));
        const chatRows = convs.map(conversationRecipient);
        // A person with an existing DM appears once (as that chat).
        const dmUserIds = new Set(convs.filter((c) => c.type === 'direct' && c.other_user).map((c) => c.other_user!.id));
        const seen = new Set<string>();
        const peopleRows: Recipient[] = [];
        for (const f of friends) {
            if (f.id === myId || dmUserIds.has(f.id) || seen.has(f.id)) continue;
            seen.add(f.id);
            peopleRows.push({ kind: 'user', key: `u:${f.id}`, id: f.id, title: f.name, subtitle: `${roleLabel(f.role)} · Friend`, avatarUrl: null, group: false });
        }
        for (const r of searchResults) {
            if (dmUserIds.has(r.id) || seen.has(r.id)) continue;
            seen.add(r.id);
            peopleRows.push(r);
        }
        return { chats: chatRows, people: peopleRows };
    }, [order, conversations, friends, searchResults, myId]);

    const q = query.trim().toLowerCase();
    const matches = (r: Recipient) => !q || r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q);
    const isServerHit = (r: Recipient) => searchResults.some((s) => s.key === r.key);

    const groupRows = chats.filter((r) => r.group && matches(r));
    const personRows = [
        ...chats.filter((r) => !r.group && matches(r)),
        ...people.filter((r) => matches(r) || isServerHit(r)),
    ];
    const sections = [
        { key: 'people', title: 'People', icon: User, rows: tab === 'groups' ? [] : personRows },
        { key: 'groups', title: 'Groups & channels', icon: Users, rows: tab === 'people' ? [] : groupRows },
    ].filter((s) => s.rows.length > 0);

    const isSelected = (r: Recipient) => selected.some((s) => s.key === r.key);
    const toggle = (r: Recipient) => {
        setFailures([]);
        setSelected((prev) => (prev.some((s) => s.key === r.key) ? prev.filter((s) => s.key !== r.key) : [...prev, r]));
    };

    const send = async () => {
        if (sending || selected.length === 0) return;
        setSending(true);
        setFailures([]);
        try {
            const { failed } = await forwardMessages(messageIds, {
                conversationIds: selected.filter((s) => s.kind === 'conversation').map((s) => s.id),
                userIds: selected.filter((s) => s.kind === 'user').map((s) => s.id),
            });
            const delivered = selected.length - failed.length;
            if (failed.length === 0) {
                toast.success(selected.length === 1 ? `Forwarded to ${selected[0].title}` : `Forwarded to ${selected.length} chats`);
                onClose();
                return;
            }
            // Partial success: keep only the refused recipients selected and say why.
            const refused = selected.filter((s) => failed.some((f) => f.kind === s.kind && f.id === s.id));
            setFailures(refused.map((r) => ({ title: r.title, message: failed.find((f) => f.id === r.id)?.message || 'Could not forward' })));
            setSelected(refused);
            if (delivered > 0) toast.success(`Forwarded to ${delivered} chat${delivered === 1 ? '' : 's'}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Failed to forward');
        } finally {
            setSending(false);
        }
    };

    const count = messageIds.length;

    return (
        <Modal
            open
            onClose={sending ? () => undefined : onClose}
            title={`Forward ${count > 1 ? `${count} messages` : 'message'}`}
            description="Choose people or chats"
            size="md"
            bodyClassName="p-0"
            icon={
                <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Forward className="w-4.5 h-4.5" aria-hidden="true" />
                </span>
            }
            footer={
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums" aria-live="polite">
                        {selected.length === 0 ? 'No one selected' : `${selected.length} selected`}
                    </span>
                    <div className="ml-auto flex gap-2">
                        <button type="button" onClick={onClose} disabled={sending} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60">
                            Cancel
                        </button>
                        <button type="button" onClick={send} disabled={sending || selected.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {sending ? 'Forwarding…' : 'Forward'}
                        </button>
                    </div>
                </div>
            }
        >
            {/* Search + tabs (stay visible while the list scrolls) */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                        data-autofocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search people or groups"
                        aria-label="Search people or groups"
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm"
                    />
                    {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" aria-label="Searching" />}
                </div>
                <div role="tablist" aria-label="Recipient type" className="flex gap-1">
                    {([['all', 'All'], ['people', 'People'], ['groups', 'Groups']] as const).map(([t, text]) => (
                        <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {text}
                        </button>
                    ))}
                </div>
                {selected.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto" aria-label="Selected recipients">
                        {selected.map((r) => (
                            <li key={r.key}>
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 pl-2.5 pr-1 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200 ui-fade-in">
                                    {r.group ? <Hash className="w-3 h-3" aria-hidden="true" /> : <User className="w-3 h-3" aria-hidden="true" />}
                                    <span className="max-w-[140px] truncate">{r.title}</span>
                                    <button type="button" onClick={() => toggle(r)} aria-label={`Remove ${r.title}`} className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/60">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {failures.length > 0 && (
                <div role="alert" className="mx-4 mt-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <p className="flex items-center gap-1.5 font-semibold mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Couldn’t forward to:</p>
                    <ul className="space-y-0.5">
                        {failures.map((f) => <li key={f.title}><strong>{f.title}</strong> — {f.message}</li>)}
                    </ul>
                </div>
            )}

            <div className="px-2 py-2 min-h-[240px]">
                {sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                        {searching ? (
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" aria-label="Searching" />
                        ) : (
                            <>
                                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" aria-hidden="true" />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{q ? `No one matches “${query.trim()}”` : 'No chats yet'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {searchError ?? (q.length === 1 ? 'Type at least 2 characters to search everyone.' : 'Try another name.')}
                                </p>
                            </>
                        )}
                    </div>
                ) : sections.map((section) => (
                    <section key={section.key} aria-label={section.title} className="mb-1">
                        <h3 className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                            <section.icon className="w-3.5 h-3.5" aria-hidden="true" /> {section.title}
                        </h3>
                        <ul role="listbox" aria-multiselectable="true" aria-label={section.title}>
                            {section.rows.map((r) => {
                                const on = isSelected(r);
                                return (
                                    <li key={r.key} role="option" aria-selected={on}>
                                        <button type="button" onClick={() => toggle(r)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${on ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                            <span className="relative shrink-0" aria-hidden="true">
                                                {r.avatarUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={resolveFileUrl(r.avatarUrl)} alt="" className={`w-10 h-10 object-cover ${r.group ? 'rounded-xl' : 'rounded-full'}`} />
                                                ) : (
                                                    <span className={`w-10 h-10 ${r.group ? 'rounded-xl' : 'rounded-full'} ${avatarColorFor(r.id)} text-white flex items-center justify-center text-sm font-semibold`}>
                                                        {r.group ? <Users className="w-4.5 h-4.5" aria-hidden="true" /> : initialsOf(r.title)}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{r.title}</span>
                                                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{r.subtitle}</span>
                                            </span>
                                            <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'}`} aria-hidden="true">
                                                {on && <Check className="w-3.5 h-3.5" />}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
                {!q && tab !== 'groups' && (
                    <p className="px-3 pt-2 pb-1 text-xs text-gray-400 dark:text-gray-500">Search to find anyone else.</p>
                )}
            </div>
        </Modal>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { Check, Loader2, Megaphone, Search, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { batchService } from '@/services/api/batch.api';
import { chatService } from '@/services/api/chat.api';
import { chatSocialService } from '@/services/api/chat-social.api';
import { avatarColorFor, initialsOf } from '@/lib/chat-utils';
import type { Batch } from '@/types/batch';
import type { ChatUserSummary, MessagePriority } from '@/types/chat';

interface BulkMessageModalProps {
    onClose: () => void;
}

type Audience = 'all_students' | 'batches' | 'users';

const PRIORITIES: Array<{ value: MessagePriority; label: string }> = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export function BulkMessageModal({ onClose }: BulkMessageModalProps) {
    const [audience, setAudience] = useState<Audience>('all_students');

    const [batches, setBatches] = useState<Batch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [batchIds, setBatchIds] = useState<string[]>([]);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ChatUserSummary[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<ChatUserSummary[]>([]);

    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<MessagePriority>('normal');
    const [isSticky, setIsSticky] = useState(false);
    const [scheduledFor, setScheduledFor] = useState('');
    const [sending, setSending] = useState(false);

    // Load batches once the batch audience is chosen.
    useEffect(() => {
        if (audience !== 'batches' || batches.length > 0 || loadingBatches) return;
        let cancelled = false;
        setLoadingBatches(true);
        batchService
            .getAll(1, 100)
            .then((list) => {
                if (!cancelled) setBatches(Array.isArray(list) ? [...list] : []);
            })
            .catch((err: any) => {
                if (!cancelled) toast.error(err?.response?.data?.message || err.message || 'Failed to load batches');
            })
            .finally(() => {
                if (!cancelled) setLoadingBatches(false);
            });
        return () => {
            cancelled = true;
        };
    }, [audience, batches.length, loadingBatches]);

    // Debounced user search.
    useEffect(() => {
        if (audience !== 'users') return;
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
    }, [query, audience]);

    const toggleBatch = (id: string) => {
        setBatchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
    };

    const toggleUser = (u: ChatUserSummary) => {
        setSelectedUsers((prev) => (prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]));
    };

    const audienceReady =
        audience === 'all_students' ||
        (audience === 'batches' && batchIds.length > 0) ||
        (audience === 'users' && selectedUsers.length > 0);

    const canSend = content.trim().length > 0 && audienceReady;

    const send = async () => {
        if (sending) return;
        if (!canSend) {
            toast.error('Pick an audience and write a message');
            return;
        }
        setSending(true);
        try {
            const result = await chatService.adminBulkMessage({
                audience:
                    audience === 'all_students'
                        ? { all_students: true }
                        : audience === 'batches'
                          ? { batch_ids: batchIds }
                          : { user_ids: selectedUsers.map((u) => u.id) },
                content: content.trim(),
                priority,
                is_sticky: isSticky,
                scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
            });
            toast.success(`${result?.sent ?? 0} messages sent`);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to send bulk message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Bulk message</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sends a direct message to each recipient</p>
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

                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Audience */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                            Audience
                        </p>
                        <div className="space-y-1">
                            {(
                                [
                                    { value: 'all_students' as const, label: 'All students' },
                                    { value: 'batches' as const, label: 'Specific batches' },
                                    { value: 'users' as const, label: 'Specific people' },
                                ]
                            ).map((opt) => (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        name="bulk-audience"
                                        checked={audience === opt.value}
                                        onChange={() => setAudience(opt.value)}
                                        className="w-4 h-4 border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {audience === 'batches' && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                            {loadingBatches ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                </div>
                            ) : batches.length === 0 ? (
                                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No batches found.</p>
                            ) : (
                                <ul className="max-h-44 overflow-y-auto space-y-1">
                                    {batches.map((b) => {
                                        const picked = batchIds.includes(b.id);
                                        return (
                                            <li key={b.id}>
                                                <button
                                                    onClick={() => toggleBatch(b.id)}
                                                    className={`w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
                                                        picked
                                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                                    }`}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {b.name}
                                                        </span>
                                                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                            {b.students ?? 0} students
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
                    )}

                    {audience === 'users' && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-3">
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedUsers.map((u) => (
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
                                            <button onClick={() => toggleUser(u)} aria-label={`Remove ${u.name}`}>
                                                <X className="w-3.5 h-3.5 text-blue-400 hover:text-blue-700 dark:hover:text-blue-200" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search people by name or email"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {searching ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                </div>
                            ) : (
                                results.length > 0 && (
                                    <ul className="max-h-40 overflow-y-auto space-y-1">
                                        {results.map((u) => {
                                            const picked = selectedUsers.some((p) => p.id === u.id);
                                            return (
                                                <li key={u.id}>
                                                    <button
                                                        onClick={() => toggleUser(u)}
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
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm text-gray-900 dark:text-white truncate">
                                                                {u.name}
                                                            </span>
                                                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {u.email || u.role}
                                                            </span>
                                                        </span>
                                                        {picked && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )
                            )}
                        </div>
                    )}

                    {/* Message */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Message</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            maxLength={4000}
                            placeholder="Write the announcement…"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-right">{content.length}/4000</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as MessagePriority)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                Schedule <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledFor}
                                onChange={(e) => setScheduledFor(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-900 dark:text-white">Sticky message</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                                Highlight this message in each conversation
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={isSticky}
                            onChange={(e) => setIsSticky(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                    </label>
                </div>

                <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={send}
                        disabled={!canSend || sending}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Sending…' : scheduledFor ? 'Schedule' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}

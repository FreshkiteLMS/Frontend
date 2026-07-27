"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { chatService } from '@/services/api/chat.api';
import { formatMessageTime, messagePreviewText } from '@/lib/chat-utils';
import type { ChatMessage, ConversationMemberView, MessageSearchQuery } from '@/types/chat';

interface MessageSearchPanelProps {
    conversationId: string;
    onClose: () => void;
    onJumpTo?: (messageId: string) => void;
}

type TypeFilter = 'all' | 'media' | 'files' | 'links';

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;

/**
 * In-conversation message search: docked right drawer with a debounced query,
 * sender/type/date filters and a results list. Clicking a result jumps to the
 * message in the main view.
 */
export function MessageSearchPanel({ conversationId, onClose, onJumpTo }: MessageSearchPanelProps) {
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [senderId, setSenderId] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [members, setMembers] = useState<ConversationMemberView[]>([]);
    const [results, setResults] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const reqRef = useRef(0);

    // Debounce the query input (400ms).
    useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 400);
        return () => clearTimeout(t);
    }, [query]);

    // Load members once for the "From" filter.
    useEffect(() => {
        let alive = true;
        chatService
            .listMembers(conversationId)
            .then((m) => {
                if (alive) setMembers(m);
            })
            .catch(() => {
                /* non-fatal: filter simply stays empty */
            });
        return () => {
            alive = false;
        };
    }, [conversationId]);

    const hasCriteria = useMemo(
        () => debounced.length > 0 || Boolean(senderId) || typeFilter !== 'all' || Boolean(dateFrom) || Boolean(dateTo),
        [debounced, senderId, typeFilter, dateFrom, dateTo]
    );

    useEffect(() => {
        if (!hasCriteria) {
            setResults([]);
            setSearched(false);
            return;
        }
        const reqId = ++reqRef.current;
        setLoading(true);
        const q: MessageSearchQuery = {
            q: debounced || undefined,
            conversation_id: conversationId,
            sender_id: senderId || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            limit: 50,
        };
        if (typeFilter === 'media') q.has_attachments = true;
        else if (typeFilter === 'files') q.type = 'file';

        chatService
            .searchMessages(q)
            .then((res) => {
                if (reqRef.current !== reqId) return;
                let data = res.data;
                if (typeFilter === 'links') data = data.filter((m) => URL_RE.test(m.content || ''));
                setResults(data);
                setSearched(true);
            })
            .catch(() => {
                if (reqRef.current === reqId) {
                    setResults([]);
                    setSearched(true);
                }
            })
            .finally(() => {
                if (reqRef.current === reqId) setLoading(false);
            });
    }, [debounced, senderId, typeFilter, dateFrom, dateTo, conversationId, hasCriteria]);

    const renderPreview = (m: ChatMessage) => {
        const text = messagePreviewText(m);
        const q = debounced;
        if (!q || m.type !== 'text') return <span>{text}</span>;
        const idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return <span>{text}</span>;
        return (
            <span>
                {text.slice(0, idx)}
                <mark className="bg-yellow-200 dark:bg-yellow-500/40 text-gray-900 dark:text-white rounded-sm px-0.5">
                    {text.slice(idx, idx + q.length)}
                </mark>
                {text.slice(idx + q.length)}
            </span>
        );
    };

    return (
        <div className="absolute inset-y-0 right-0 z-[70] w-full sm:w-[380px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search in conversation…"
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                <button
                    onClick={() => setShowFilters((v) => !v)}
                    className={`p-2 rounded-lg transition-colors ${
                        showFilters
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    aria-label="Filters"
                >
                    <SlidersHorizontal className="w-5 h-5" />
                </button>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Close search"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {showFilters && (
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                            From
                        </label>
                        <select
                            value={senderId}
                            onChange={(e) => setSenderId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Anyone</option>
                            {members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                            Type
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {(['all', 'media', 'files', 'links'] as TypeFilter[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                                        typeFilter === t
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                From date
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                To date
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : !hasCriteria ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <Search className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Search messages by keyword, sender, type or date.
                        </p>
                    </div>
                ) : results.length === 0 && searched ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <Search className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No messages found.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {results.map((m) => (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    onClick={() => onJumpTo?.(m.id)}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {m.sender_name}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                            {formatMessageTime(m.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                        {renderPreview(m)}
                                    </p>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Clock, Loader2, X } from 'lucide-react';
import { chatService } from '@/services/api/chat.api';
import { useChatStore } from '@/stores/chat-store';
import { PersonAvatar } from '@/components/chat/reaction-chips';
import type { ChatMessage, MessageInfo } from '@/types/chat';

function when(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
        ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : d.toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/**
 * "Message info" for a message you sent: when it was sent, who has read it
 * (and when), who has received it but not read it yet, and who hasn't
 * received it. Built from per-member receipt records, and refreshed live as
 * receipt counters for this message change.
 */
export function MessageInfoModal({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
    const [info, setInfo] = useState<MessageInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Receipt counters arrive over the socket; refetch details when they move.
    const counters = useChatStore((s) => {
        const m = (s.messages[message.conversation_id] || []).find((x) => x.id === message.id);
        return `${m?.delivered_count ?? 0}:${m?.read_count ?? 0}`;
    });

    const load = useCallback(async () => {
        try {
            setInfo(await chatService.messageInfo(message.id));
            setError(null);
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message || e?.message || 'Could not load message info');
        }
    }, [message.id]);

    useEffect(() => {
        void load();
    }, [load, counters]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const total = info?.recipient_count ?? 0;

    return (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Message info">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full sm:max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white">Message info</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-3 whitespace-pre-wrap">{message.content || 'Attachment'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Sent {when(message.created_at)}{message.edited_at ? ` · edited ${when(message.edited_at)}` : ''}
                    </p>
                </div>

                <div className="overflow-y-auto p-5 space-y-5">
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    {!info && !error && (
                        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    )}
                    {info && (
                        <>
                            <Section
                                icon={<CheckCheck className="w-4 h-4 text-blue-500" />}
                                title={`Read by ${info.read.length} of ${total}`}
                                empty="Nobody has read this yet."
                                rows={info.read.map((r) => ({ person: r.user, meta: r.read_at ? when(r.read_at) : 'Read' }))}
                            />
                            <Section
                                icon={<CheckCheck className="w-4 h-4 text-gray-400" />}
                                title={`Delivered, not read (${info.delivered.length})`}
                                empty="—"
                                rows={info.delivered.map((r) => ({ person: r.user, meta: when(r.delivered_at) }))}
                            />
                            <Section
                                icon={<Clock className="w-4 h-4 text-gray-400" />}
                                title={`Not delivered yet (${info.pending.length})`}
                                empty="—"
                                rows={info.pending.map((r) => ({ person: r.user, meta: '' }))}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Section({
    icon,
    title,
    rows,
    empty,
}: {
    icon: React.ReactNode;
    title: string;
    rows: Array<{ person: { id: string; name: string; avatar_url: string | null }; meta: string }>;
    empty: string;
}) {
    return (
        <section>
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                {icon} {title}
            </h4>
            {rows.length === 0 ? (
                <p className="text-sm text-gray-400">{empty}</p>
            ) : (
                <ul className="space-y-1.5">
                    {rows.map((r) => (
                        <li key={r.person.id} className="flex items-center gap-3">
                            <PersonAvatar person={r.person} size={32} />
                            <span className="flex-1 min-w-0 truncate text-sm text-gray-800 dark:text-gray-100">{r.person.name}</span>
                            {r.meta && <span className="text-xs text-gray-400 shrink-0">{r.meta}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

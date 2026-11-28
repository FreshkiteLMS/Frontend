"use client";

import { useState } from 'react';
import { History, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { AUDIT_LABEL, batchAdminService } from '@/services/api/batch-admin.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { useStaffAccess } from '@/hooks/use-staff-access';
import { Empty, ErrorState, Panel, SkeletonBlock, btnPrimary, btnSecondary, fmtDateTime, fmtRelative, inputCls, useAsync } from '@/components/admin/insights/ui';

/** Batch announcements: a notification to every active member, kept as history. */
export function BatchAnnouncements({ batchId, memberCount }: { batchId: string; memberCount: number }) {
    const access = useStaffAccess();
    const canSend = access.can('communication.announcements');
    const canRead = access.can('communication.view_history');
    const [page, setPage] = useState(1);
    const list = useAsync(() => batchAdminService.announcements(batchId, page), `ann:${batchId}:${page}`, canRead);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    const send = async () => {
        setBusy(true);
        try {
            const a = await batchAdminService.announce(batchId, title.trim(), body.trim());
            toast.success(`Sent to ${a.recipients} student${a.recipients === 1 ? '' : 's'}`);
            setTitle(''); setBody('');
            if (canRead) list.reload();
        } catch (err) { toast.error(apiErrorMessage(err, 'The announcement was not sent')); } finally { setBusy(false); }
    };
    return (
        <div className="space-y-5">
            {canSend && (
                <Panel title="New announcement" subtitle={`Every active member (${memberCount}) gets it as a notification, in the app and on their phone.`}>
                    <label className="block text-sm text-gray-700 dark:text-gray-300">Title
                        <input className={`${inputCls} mt-1 w-full`} value={title} maxLength={140} onChange={e => setTitle(e.target.value)} />
                    </label>
                    <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">Message
                        <textarea rows={4} className={`${inputCls} mt-1 w-full`} value={body} maxLength={4000} onChange={e => setBody(e.target.value)} />
                    </label>
                    <div className="mt-3 flex justify-end"><button type="button" className={btnPrimary} disabled={busy || !title.trim() || !body.trim()} onClick={send}><Megaphone className="h-4 w-4" aria-hidden="true" />{busy ? 'Sending…' : 'Send announcement'}</button></div>
                </Panel>
            )}
            {canRead && (
                <Panel title="Sent announcements">
                    {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <SkeletonBlock rows={3} /> : list.data.rows.length === 0 ? (
                        <Empty icon={<Megaphone className="h-10 w-10" />} title="No announcements yet" />
                    ) : (
                        <>
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {list.data.rows.map(a => (
                                    <li key={a.id} className="py-3">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.title}</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{a.body}</p>
                                        <p className="mt-1 text-xs text-gray-500">{a.authorName}{a.authorRole === 'mentor' ? ' (mentor)' : ''} · {fmtDateTime(a.createdAt)} · {a.recipients} recipient{a.recipients === 1 ? '' : 's'}</p>
                                    </li>
                                ))}
                            </ul>
                            {list.data.totalPages > 1 && (
                                <div className="mt-3 flex justify-end gap-2">
                                    <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Newer</button>
                                    <button type="button" className={btnSecondary} disabled={page >= list.data.totalPages} onClick={() => setPage(p => p + 1)}>Older</button>
                                </div>
                            )}
                        </>
                    )}
                </Panel>
            )}
        </div>
    );
}

/** Who changed what in this batch (append-only audit trail). */
export function BatchHistory({ batchId }: { batchId: string }) {
    const [page, setPage] = useState(1);
    const list = useAsync(() => batchAdminService.audit(batchId, page), `audit:${batchId}:${page}`);
    return (
        <Panel title="Change history" subtitle="Every change to this batch, its members, link and mentors. Entries cannot be edited or deleted.">
            {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <SkeletonBlock rows={4} /> : list.data.rows.length === 0 ? (
                <Empty icon={<History className="h-10 w-10" />} title="Nothing recorded yet" />
            ) : (
                <>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {list.data.rows.map(r => (
                            <li key={r.id} className="flex gap-3 py-2.5 text-sm">
                                <span className="min-w-0 flex-1">
                                    <span className="font-medium text-gray-900 dark:text-white">{AUDIT_LABEL[r.action] ?? r.action}</span>
                                    <span className="text-gray-600 dark:text-gray-400"> · {r.actorName || (r.actorRole === 'system' ? 'System' : 'Unknown')}{r.actorRole === 'mentor' ? ' (mentor)' : r.actorRole === 'student' ? ' (student)' : ''}</span>
                                </span>
                                <time className="shrink-0 text-xs text-gray-500" title={fmtDateTime(r.at)}>{fmtRelative(r.at)}</time>
                            </li>
                        ))}
                    </ul>
                    {list.data.totalPages > 1 && (
                        <div className="mt-3 flex justify-end gap-2">
                            <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Newer</button>
                            <button type="button" className={btnSecondary} disabled={page >= list.data.totalPages} onClick={() => setPage(p => p + 1)}>Older</button>
                        </div>
                    )}
                </>
            )}
        </Panel>
    );
}

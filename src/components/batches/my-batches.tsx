"use client";

import Link from 'next/link';
import { BookOpen, Calendar, Inbox, Layers, Lock, Megaphone, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { studentBatchService } from '@/services/api/batch-admin.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { Empty, ErrorState, Panel, Pill, SkeletonBlock, btnSecondary, fmtDate, fmtRelative, useAsync } from '@/components/admin/insights/ui';
import { LIFECYCLE_LABEL, LIFECYCLE_TONE } from '@/types/batch-admin';
import api from '@/services/api/axios';

const REQUEST_LABEL: Record<string, { label: string; tone: string }> = {
    pending: { label: 'Waiting for review', tone: 'info' },
    approved: { label: 'Approved', tone: 'active' },
    rejected: { label: 'Not approved', tone: 'danger' },
    cancelled: { label: 'Withdrawn', tone: 'neutral' },
};

/** The student's batches, their courses and mentors, announcements and joining requests. */
export function MyBatches() {
    const batches = useAsync(() => studentBatchService.myBatches(), 'my-batches');
    const requests = useAsync(() => studentBatchService.myRequests(), 'my-batch-requests');
    const news = useAsync(() => api.get('/student/batch-announcements').then(r => r.data.data as { id: string; batchId: string; title: string; body: string; authorName: string; createdAt: string }[]), 'my-batch-news');
    const [busy, setBusy] = useState<string | null>(null);
    const cancel = async (id: string) => {
        setBusy(id);
        try { await studentBatchService.cancelRequest(id); toast.success('Request withdrawn'); requests.reload(); }
        catch (err) { toast.error(apiErrorMessage(err, 'Could not withdraw the request')); } finally { setBusy(null); }
    };
    const nameOf = new Map((batches.data ?? []).map(b => [b.id, b.name]));

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Batches</h1>
            <p className="mt-0.5 mb-6 text-sm text-gray-500 dark:text-gray-400">The batches you belong to and the courses they give you.</p>
            <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    {batches.error ? <ErrorState error={batches.error} onRetry={batches.reload} /> : !batches.data ? <SkeletonBlock rows={4} /> : batches.data.length === 0 ? (
                        <Panel><Empty icon={<Layers className="h-10 w-10" />} title="You are not in a batch yet">Open the invitation link your institute shared to join one.</Empty></Panel>
                    ) : batches.data.map(b => (
                        <Panel key={b.id}>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{b.name}</h2>
                                <Pill tone={LIFECYCLE_TONE[b.lifecycle]}>{LIFECYCLE_LABEL[b.lifecycle]}</Pill>
                                {b.membership === 'disabled' && <Pill tone="inactive">Membership disabled</Pill>}
                            </div>
                            {b.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{b.description}</p>}
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />{fmtDate(b.startDate)}{b.endDate ? ` – ${fmtDate(b.endDate)}` : ''}</span>
                                {b.mentors.length > 0 && <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden="true" />{b.mentors.join(', ')}</span>}
                            </div>
                            {!b.courseAccess && (
                                <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300"><Lock className="h-4 w-4" aria-hidden="true" />
                                    {b.membership === 'disabled' ? 'Your membership is disabled, so this batch gives no course access right now.' : 'This batch is archived and its courses are closed.'}
                                </p>
                            )}
                            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                                {b.courses.map(c => (
                                    <li key={c.id}>
                                        {c.available ? (
                                            <Link href={`/student/courses/${c.id}`} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:border-blue-200 hover:bg-blue-50/40 dark:border-gray-800 dark:hover:bg-blue-900/10">
                                                <BookOpen className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" /><span className="text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
                                            </Link>
                                        ) : (
                                            <span className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 opacity-60 dark:border-gray-800">
                                                <Lock className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" /><span className="text-sm text-gray-700 dark:text-gray-300">{c.title}</span>
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    ))}
                </div>
                <div className="space-y-5">
                    <Panel title="Announcements">
                        {news.error ? <ErrorState error={news.error} onRetry={news.reload} /> : !news.data ? <SkeletonBlock rows={2} /> : news.data.length === 0 ? (
                            <Empty icon={<Megaphone className="h-8 w-8" />} title="No announcements" />
                        ) : (
                            <ul className="space-y-3">
                                {news.data.slice(0, 10).map(a => (
                                    <li key={a.id}>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.title}</p>
                                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{a.body}</p>
                                        <p className="mt-0.5 text-xs text-gray-500">{nameOf.get(a.batchId) ?? 'Batch'} · {a.authorName} · {fmtRelative(a.createdAt)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                    <Panel title="Joining requests">
                        {requests.error ? <ErrorState error={requests.error} onRetry={requests.reload} /> : !requests.data ? <SkeletonBlock rows={2} /> : requests.data.length === 0 ? (
                            <Empty icon={<Inbox className="h-8 w-8" />} title="No requests" />
                        ) : (
                            <ul className="space-y-3">
                                {requests.data.map(r => (
                                    <li key={r.id} className="text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">{r.batchName}</span>
                                            <Pill tone={REQUEST_LABEL[r.status].tone}>{REQUEST_LABEL[r.status].label}</Pill>
                                        </div>
                                        <p className="text-xs text-gray-500">Sent {fmtRelative(r.createdAt)}</p>
                                        {r.decisionReason && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Reason: {r.decisionReason}</p>}
                                        {r.status === 'pending' && <button type="button" className={`${btnSecondary} mt-2`} disabled={busy === r.id} onClick={() => cancel(r.id)}>Withdraw</button>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
}

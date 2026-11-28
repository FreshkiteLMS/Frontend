"use client";

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, CheckCircle2, Clock, Layers, Users, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentBatchService } from '@/services/api/batch-admin.api';
import { apiErrorCode, apiErrorMessage } from '@/services/api/structured-course.api';
import { useAuth } from '@/hooks/use-auth';
import { SkeletonBlock, btnPrimary, btnSecondary, fmtDate, inputCls, useAsync } from '@/components/admin/insights/ui';
import type { JoinResult } from '@/types/batch-admin';

const LINK_ERRORS: Record<string, { title: string; text: string }> = {
    INVITATION_INVALID: { title: 'This link does not work', text: 'Check that you copied the whole link, or ask for a new one.' },
    INVITATION_EXPIRED: { title: 'This link has expired', text: 'Ask the person who shared it for a new link.' },
    INVITATION_REVOKED: { title: 'This link was turned off', text: 'Ask the person who shared it for a new link.' },
    INVITATION_EXHAUSTED: { title: 'This link has been used up', text: 'It has reached its limit. Ask for a new link.' },
    BATCH_ARCHIVED: { title: 'This batch is closed', text: 'It is no longer accepting students.' },
};

/**
 * The page behind a batch invitation link. Signed-out visitors are sent to
 * login (and back here) by the route proxy. Everything is validated again by
 * the server when the student presses Join.
 */
export function JoinBatch({ token }: { token: string }) {
    const { user } = useAuth();
    const preview = useAsync(() => studentBatchService.preview(token), `join:${token}`);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<JoinResult | null>(null);

    const join = async () => {
        setBusy(true);
        try {
            const r = await studentBatchService.join(token, message.trim() || undefined);
            setResult(r);
            if (r.result === 'joined') toast.success('You joined the batch');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'You could not join'));
            preview.reload();
        } finally { setBusy(false); }
    };

    const code = preview.error ? apiErrorCode(preview.error) : undefined;
    if (preview.error) {
        const e = (code && LINK_ERRORS[code]) || { title: 'This link could not be opened', text: apiErrorMessage(preview.error, 'Please try again later.') };
        return <Shell><State icon={<XCircle className="h-12 w-12 text-red-500" />} title={e.title}>{e.text}</State></Shell>;
    }
    if (!preview.data) return <Shell><SkeletonBlock rows={6} /></Shell>;
    const { batch, joinMode, state } = preview.data;

    const done = result?.result === 'joined' || result?.result === 'already_member' || state === 'member';
    const pending = result?.result === 'request_submitted' || result?.result === 'request_pending' || state === 'pending';

    return (
        <Shell>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                <p className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400"><Layers className="h-4 w-4" aria-hidden="true" /> You are invited to join a batch</p>
                <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{batch.name}</h1>
                {batch.description && <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-300">{batch.description}</p>}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />{fmtDate(batch.startDate)}{batch.endDate ? ` – ${fmtDate(batch.endDate)}` : ''}</span>
                    {batch.mentors.length > 0 && <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden="true" />Mentor{batch.mentors.length === 1 ? '' : 's'}: {batch.mentors.join(', ')}</span>}
                    {batch.seatsLeft !== null && <span>{batch.seatsLeft} seat{batch.seatsLeft === 1 ? '' : 's'} left</span>}
                </div>

                <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-gray-400">Courses you get</h2>
                {batch.courses.length === 0 ? <p className="mt-2 text-sm text-gray-500">Courses will be added by the batch team.</p> : (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {batch.courses.map(c => (
                            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <BookOpen className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                                <span className="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
                    {done ? (
                        <State icon={<CheckCircle2 className="h-10 w-10 text-green-600" />} title={result?.result === 'joined' ? 'You are in!' : 'You are already a member'}>
                            The batch courses are in My Courses.
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Link href="/student/courses" className={btnPrimary}>Go to My Courses</Link>
                                <Link href="/student/batches" className={btnSecondary}>My Batches</Link>
                            </div>
                        </State>
                    ) : pending ? (
                        <State icon={<Clock className="h-10 w-10 text-amber-500" />} title="Request sent">
                            The batch team will review it. You will get a notification when they decide.
                            <div className="mt-4"><Link href="/student/batches" className={btnSecondary}>See my requests</Link></div>
                        </State>
                    ) : state === 'not_student' ? (
                        <State icon={<XCircle className="h-10 w-10 text-gray-400" />} title="Only student accounts can join">
                            You are signed in as {user?.email ?? 'a staff account'}. Sign in with a student account to join.
                        </State>
                    ) : state === 'disabled' ? (
                        <State icon={<XCircle className="h-10 w-10 text-gray-400" />} title="Your membership is disabled">Contact the batch administrator.</State>
                    ) : state === 'full' ? (
                        <State icon={<XCircle className="h-10 w-10 text-gray-400" />} title="This batch is full">No seats are left right now.</State>
                    ) : (
                        <div className="flex flex-col items-stretch gap-3 sm:items-start">
                            {joinMode === 'approval' && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">This batch reviews every request. Add a note for the team (optional).</p>
                                    <textarea rows={2} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} aria-label="Note for the batch team" className={`${inputCls} w-full`} />
                                </>
                            )}
                            <button type="button" className={`${btnPrimary} justify-center px-6 py-3 text-base`} disabled={busy} onClick={join}>
                                {busy ? 'Please wait…' : joinMode === 'approval' ? 'Ask to join' : 'Join batch'}
                            </button>
                            <p className="text-xs text-gray-500">Signed in as {user?.email}. Not you? Log out and use the right account.</p>
                        </div>
                    )}
                </div>
            </div>
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</div>;
}

function State({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center text-center">
            {icon}
            <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{children}</div>
        </div>
    );
}

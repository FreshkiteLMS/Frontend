"use client";

import Link from 'next/link';
import { AlertTriangle, BarChart3, Layers, Megaphone, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { mentorSelfService } from '@/services/api/mentor.api';
import { useStaffAccess } from '@/hooks/use-staff-access';
import { Empty, ErrorState, Figure, Panel, Pill, ProgressBar, SkeletonBlock, btnSecondary, fmtDate, fmtRelative, useAsync } from '@/components/admin/insights/ui';
import { LIFECYCLE_LABEL, LIFECYCLE_TONE } from '@/types/batch-admin';

const ACTION_TEXT: Record<string, string> = {
    'membership.added': 'was added to', 'membership.joined': 'joined', 'membership.removed': 'left', 'membership.disabled': 'was disabled in',
    'membership.transferred_in': 'transferred into', 'membership.transferred_out': 'transferred out of', 'join_request.submitted': 'asked to join',
    'join_request.approved': 'was approved for', 'join_request.rejected': 'was not approved for', 'join_request.cancelled': 'withdrew a request for',
};

/**
 * The mentor's home. Every number is computed by the server inside the
 * mentor's scope; sections whose permission is off are not sent at all.
 */
export function MentorDashboard() {
    const access = useStaffAccess();
    const dash = useAsync(() => mentorSelfService.dashboard(), 'mentor-dashboard');
    const me = access.me;
    const d = dash.data;
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Mentor Dashboard</p>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hello{me?.name ? `, ${me.name.split(' ')[0]}` : ''}</h1>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {me ? (me.fullAdmin ? 'You have Full Administrative Access.' : me.batchScope === 'all' ? 'You can see every batch.' : `You mentor ${me.batches.length} batch${me.batches.length === 1 ? '' : 'es'}.`) : ' '}
                        {me?.mentorCode && <span className="ml-2 font-mono text-xs">{me.mentorCode}</span>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {access.can('students.view') && <Link href="/admin/students" className={btnSecondary}><Users className="h-4 w-4" aria-hidden="true" /> My students</Link>}
                    {access.can('batches.view') && <Link href="/admin/batches" className={btnSecondary}><Layers className="h-4 w-4" aria-hidden="true" /> My batches</Link>}
                    <Link href="/chat" className={btnSecondary}><MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat</Link>
                </div>
            </div>

            {dash.error ? <ErrorState error={dash.error} onRetry={dash.reload} /> : !d ? <SkeletonBlock rows={6} /> : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {[
                            { label: 'Batches', value: d.overview.batches, sub: d.overview.activeBatches !== null ? `${d.overview.activeBatches} active` : undefined },
                            { label: 'Students', value: d.overview.students, sub: d.overview.studentScope === 'all' ? 'every student' : 'in your batches' },
                            { label: 'Active students', value: d.overview.activeStudents, sub: `last ${d.overview.activeDays} days` },
                            { label: 'Need attention', value: d.overview.needAttention, sub: 'inactive or under 20%' },
                            { label: 'Average progress', value: d.overview.averageProgress !== null ? `${d.overview.averageProgress}%` : null },
                            { label: 'Joining requests', value: d.overview.pendingRequests, sub: 'waiting' },
                        ].filter(c => c.value !== null && c.value !== undefined).map(c => (
                            <div key={c.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><Figure label={c.label} value={c.value} sub={c.sub} /></div>
                        ))}
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            {d.batches === null ? (
                                <Panel title="My batches"><p className="text-sm text-gray-600 dark:text-gray-400">You do not have permission to view batches. Ask an administrator if you need it.</p></Panel>
                            ) : (
                                <Panel title="My batches" actions={access.can('batches.view') ? <Link href="/admin/batches" className="text-sm text-blue-600 hover:underline">All batches</Link> : undefined}>
                                    {d.batches.length === 0 ? <Empty icon={<Layers className="h-10 w-10" />} title="No batches yet">An administrator assigns batches to you.</Empty> : (
                                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {d.batches.map(b => (
                                                <li key={b.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Link href={`/admin/batches/${b.id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">{b.name}</Link>
                                                            <Pill tone={LIFECYCLE_TONE[b.lifecycle]}>{LIFECYCLE_LABEL[b.lifecycle]}</Pill>
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-gray-500">{fmtDate(b.startDate)}{b.endDate ? ` – ${fmtDate(b.endDate)}` : ''} · {b.students} student{b.students === 1 ? '' : 's'}{b.maxStudents ? ` of ${b.maxStudents}` : ''} · {b.activeStudents} active</p>
                                                        {b.courses.length > 0 && <p className="mt-0.5 truncate text-xs text-gray-500">{b.courses.join(', ')}</p>}
                                                    </div>
                                                    <div className="w-full sm:w-40">
                                                        <ProgressBar value={b.progress ?? 0} label={`Average progress ${b.progress ?? 0}%`} />
                                                        <span className="mt-1 block text-xs text-gray-500">{b.progress === null ? 'No progress yet' : `${b.progress}% average`}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Panel>
                            )}
                        </div>
                        <div className="space-y-5">
                            <Panel title="Recent batch activity">
                                {d.recentActivity.length === 0 ? <p className="text-sm text-gray-500">Nothing yet.</p> : (
                                    <ul className="space-y-2 text-sm">
                                        {d.recentActivity.map((r, i) => (
                                            <li key={i}>
                                                <span className="text-gray-900 dark:text-white">{r.student}</span>
                                                <span className="text-gray-600 dark:text-gray-400"> {ACTION_TEXT[r.action] ?? r.action} </span>
                                                <Link href={`/admin/batches/${r.batchId}`} className="text-blue-600 hover:underline">{r.batchName}</Link>
                                                <span className="block text-xs text-gray-500">{fmtRelative(r.at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                            {me?.effective && <AccessCard />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** What I can do — the same summary administrators see. */
function AccessCard() {
    const { me, can } = useStaffAccess();
    if (!me?.effective) return null;
    const e = me.effective;
    const shortcuts = [
        { show: can('analytics.batch'), icon: BarChart3, text: 'Batch analytics on each batch page' },
        { show: can('communication.announcements'), icon: Megaphone, text: 'Send announcements from a batch page' },
        { show: can('batches.approve_requests'), icon: AlertTriangle, text: 'Approve joining requests in the Joining tab' },
    ].filter(s => s.show);
    return (
        <Panel title="Your access">
            <p className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200"><ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />{e.batches.label} · {e.students.label}</p>
            <ul className="mt-3 space-y-2 text-sm">
                {e.groups.filter(g => g.allowed.length).map(g => (
                    <li key={g.key}><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{g.label}</span><span className="block text-gray-700 dark:text-gray-300">{g.allowed.join(', ')}</span></li>
                ))}
            </ul>
            {shortcuts.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
                    {shortcuts.map(s => <li key={s.text} className="flex items-center gap-1.5"><s.icon className="h-3.5 w-3.5" aria-hidden="true" />{s.text}</li>)}
                </ul>
            )}
        </Panel>
    );
}

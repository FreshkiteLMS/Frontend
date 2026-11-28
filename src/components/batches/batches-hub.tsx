"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Archive, BarChart3, BookOpen, Calendar, ChevronLeft, ChevronRight, Edit, Layers, Link2, MoreHorizontal, Plus, RotateCcw, Search,
    TrendingUp, UserCheck, UserCog, Users, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api/axios';
import { batchAdminService } from '@/services/api/batch-admin.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { useStaffAccess } from '@/hooks/use-staff-access';
import type { BatchListRow } from '@/types/admin-insights';
import { LIFECYCLE_LABEL, LIFECYCLE_TONE, type BatchLifecycle, type BatchSummary } from '@/types/batch-admin';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Breadcrumbs, ErrorState, Pill, btnSecondary, fmtDate, useAsync } from '@/components/admin/insights/ui';

interface ListResponse { data: BatchListRow[]; meta: { page: number; limit: number; total: number; totalPages: number }; summary?: BatchSummary }

const LIMIT = 12;

/**
 * Batch Management list (administrators and mentors): summary cards that
 * double as status filters, search, and one card per batch with its courses,
 * mentors, seats and progress. The API returns only the batches in the
 * caller's scope; actions are shown per permission and re-checked by the API.
 */
export function BatchesHub() {
    const router = useRouter();
    const sp = useSearchParams();
    const access = useStaffAccess();
    const [q, setQ] = useState(sp.get('q') ?? '');
    const [debounced, setDebounced] = useState(q);
    const lifecycle = (sp.get('status') ?? '') as '' | BatchLifecycle;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const [confirm, setConfirm] = useState<{ batch: BatchListRow; kind: 'archive' | 'restore' } | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
    useEffect(() => {
        if ((sp.get('q') ?? '') === debounced) return;
        setParams({ q: debounced || null, page: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]);

    function setParams(next: Record<string, string | null>) {
        const p = new URLSearchParams(sp.toString());
        for (const [k, v] of Object.entries(next)) { if (v) p.set(k, v); else p.delete(k); }
        router.replace(`/admin/batches${p.toString() ? `?${p}` : ''}`, { scroll: false });
    }

    const list = useAsync<ListResponse>(
        () => api.get('/admin/batches', { params: { q: debounced || undefined, lifecycle: lifecycle || undefined, page, limit: LIMIT, summary: 1, sort: 'created', dir: 'desc' } }).then(r => r.data),
        `hub:${debounced}:${lifecycle}:${page}`,
    );
    const s = list.data?.summary;
    const rows = list.data?.data ?? [];
    const meta = list.data?.meta;

    const act = async () => {
        if (!confirm) return;
        setBusy(true);
        try {
            if (confirm.kind === 'archive') await batchAdminService.archive(confirm.batch.id);
            else await batchAdminService.restore(confirm.batch.id);
            toast.success(confirm.kind === 'archive' ? 'Batch archived' : 'Batch restored');
            setConfirm(null);
            list.reload();
        } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); } finally { setBusy(false); }
    };

    const filters: Array<{ id: '' | BatchLifecycle; label: string; value?: number; dot: string }> = [
        { id: '', label: 'All batches', value: s?.total, dot: 'bg-gray-400' },
        { id: 'active', label: 'Active', value: s?.active, dot: 'bg-green-500' },
        { id: 'upcoming', label: 'Upcoming', value: s?.upcoming, dot: 'bg-blue-500' },
        { id: 'completed', label: 'Completed', value: s?.completed, dot: 'bg-gray-500' },
        { id: 'archived', label: 'Archived', value: s?.archived, dot: 'bg-amber-500' },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: access.isMentor ? 'Mentor dashboard' : 'Dashboard', href: access.isMentor ? '/mentor' : '/admin' }, { label: 'Batches' }]} />
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Management</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {access.isMentor && access.me?.batchScope !== 'all' ? 'The batches assigned to you.' : 'Create and manage student batches, their courses, mentors and invitation links.'}
                        {s ? <span className="text-gray-500"> · {s.totalStudents} student{s.totalStudents === 1 ? '' : 's'} in batches</span> : null}
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative hidden sm:block">
                        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search batches..." aria-label="Search batches"
                            className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    </div>
                    {access.can('batches.create') && (
                        <Link href="/admin/batches/new" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                            <Plus className="h-5 w-5" aria-hidden="true" /> Create Batch
                        </Link>
                    )}
                </div>
            </div>

            {/* Search on small screens */}
            <div className="relative mb-4 sm:hidden">
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search batches..." aria-label="Search batches"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            </div>

            {/* Status cards — also the filter */}
            <div role="tablist" aria-label="Filter by status" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {filters.map(f => {
                    const on = lifecycle === f.id;
                    return (
                        <button key={f.label} type="button" role="tab" aria-selected={on} onClick={() => setParams({ status: f.id || null, page: null })}
                            className={`rounded-2xl border p-4 text-left transition-all ${on ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20' : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700'}`}>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"><span className={`h-2 w-2 rounded-full ${f.dot}`} aria-hidden="true" />{f.label}</span>
                            <span className="mt-1 block text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{f.value ?? '—'}</span>
                        </button>
                    );
                })}
            </div>

            {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : list.loading && !list.data ? (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800/60" />)}
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
                    <Layers className="mx-auto mb-3 h-12 w-12 text-gray-200 dark:text-gray-700" aria-hidden="true" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">{debounced || lifecycle ? 'No batches match' : 'No batches yet'}</p>
                    <p className="mt-1 text-sm text-gray-400">{debounced || lifecycle ? 'Try another search or status.' : access.can('batches.create') ? 'Create your first batch to start organising students.' : 'An administrator assigns batches to you.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {rows.map(b => <BatchCard key={b.id} batch={b} onArchive={kind => setConfirm({ batch: b, kind })} />)}
                </div>
            )}

            {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Page {meta.page} of {meta.totalPages} · {meta.total} batches</span>
                    <div className="flex gap-2">
                        <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
                        <button type="button" className={btnSecondary} disabled={page >= meta.totalPages} onClick={() => setParams({ page: String(page + 1) })}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                    </div>
                </div>
            )}

            <ConfirmDialog open={!!confirm} busy={busy} tone={confirm?.kind === 'archive' ? 'danger' : 'primary'}
                title={confirm?.kind === 'archive' ? `Archive ${confirm?.batch.name}?` : `Restore ${confirm?.batch.name}?`}
                message={confirm?.kind === 'archive'
                    ? 'The invitation link stops working and no one can join. Members, history and progress are kept. Course access follows the batch’s archived-access setting.'
                    : 'The batch accepts members again. Create a new invitation link if you need one.'}
                confirmLabel={confirm?.kind === 'archive' ? 'Archive' : 'Restore'} onConfirm={act} onCancel={() => setConfirm(null)} />
        </div>
    );
}

function BatchCard({ batch, onArchive }: { batch: BatchListRow; onArchive: (kind: 'archive' | 'restore') => void }) {
    const router = useRouter();
    const access = useStaffAccess();
    const lc = (batch.lifecycle ?? (batch.status === 'archived' ? 'archived' : 'active')) as BatchLifecycle;
    const go = (tab?: string) => router.push(`/admin/batches/${batch.id}${tab ? `?tab=${tab}` : ''}`);
    const meetingsOff = batch.capabilities && !batch.capabilities.meetings;
    const seatsPct = batch.maxStudents ? Math.min(100, Math.round((batch.students / batch.maxStudents) * 100)) : null;
    const mentors = batch.mentors ?? [];

    const quick = [
        { show: access.can('students.view'), icon: <Users className="h-4 w-4" />, label: 'Students', tab: 'members' },
        { show: access.can('batches.view'), icon: <BookOpen className="h-4 w-4" />, label: 'Courses', tab: 'courses' },
        { show: access.can('batches.invitations'), icon: <Link2 className="h-4 w-4" />, label: 'Invite', tab: 'joining' },
        { show: access.can('analytics.batch'), icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics', tab: 'analytics' },
    ].filter(x => x.show);

    return (
        <div className={`group overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-md dark:bg-gray-800 ${lc === 'archived' ? 'border-gray-200 opacity-80 dark:border-gray-700' : 'border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-700'}`}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => go()} className="min-w-0 flex-1 text-left">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{batch.name}</h3>
                            <Pill tone={LIFECYCLE_TONE[lc]}>{LIFECYCLE_LABEL[lc]}</Pill>
                            {batch.joinMode === 'approval' && <Pill tone="neutral">Approval</Pill>}
                        </div>
                        <p className="line-clamp-1 text-sm text-gray-500 dark:text-gray-400">{batch.description || <span className="font-mono text-xs">{batch.batch_number}</span>}</p>
                    </button>
                    <CardMenu batch={batch} lifecycle={lc} onArchive={onArchive} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(batch.startDate)}{batch.endDate ? ` – ${fmtDate(batch.endDate)}` : ''}</span>
                    {batch.description && <span className="font-mono">{batch.batch_number}</span>}
                    <span className="flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" aria-hidden="true" />{mentors.length ? mentors.map(m => m.name).join(', ') : 'No mentor'}</span>
                </div>

                {/* Courses */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {batch.courseTitles.length === 0 ? <span className="text-xs text-gray-400">No courses assigned</span> : (
                        <>
                            {batch.courseTitles.slice(0, 4).map(t => <span key={t} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{t}</span>)}
                            {batch.courseTitles.length > 4 && <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">+{batch.courseTitles.length - 4} more</span>}
                        </>
                    )}
                </div>

                {/* Stat tiles */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatTile icon={<Users className="h-4 w-4 text-blue-500" />} value={batch.maxStudents ? `${batch.students}/${batch.maxStudents}` : batch.students} label={batch.maxStudents ? 'Seats used' : 'Students'} />
                    <StatTile icon={<UserCheck className="h-4 w-4 text-green-500" />} value={batch.activeStudents ?? 0} label="Active 14d" />
                    {meetingsOff
                        ? <StatTile icon={<Layers className="h-4 w-4 text-indigo-500" />} value={batch.groupCount ?? 0} label="Groups" />
                        : <StatTile icon={<Video className="h-4 w-4 text-indigo-500" />} value={batch.meetingsScheduled ?? 0} label="Meetings" />}
                </div>

                {/* Progress */}
                <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Avg progress</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{batch.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${batch.progress || 0}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-400">
                        {batch.completionRate ?? 0}% finished all their courses
                        {seatsPct !== null ? ` · ${seatsPct}% of seats taken` : ''}
                    </p>
                </div>
            </div>

            {quick.length > 0 && (
                <div className="flex items-center divide-x divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
                    {quick.map(x => (
                        <button key={x.label} type="button" onClick={() => go(x.tab)}
                            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-blue-400">
                            {x.icon}{x.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
    return (
        <div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-700/40">
            <div className="flex items-center gap-1.5">{icon}<span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{value}</span></div>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
}

function CardMenu({ batch, lifecycle, onArchive }: { batch: BatchListRow; lifecycle: BatchLifecycle; onArchive: (kind: 'archive' | 'restore') => void }) {
    const access = useStaffAccess();
    const [open, setOpen] = useState(false);
    const link = (tab: string) => `/admin/batches/${batch.id}?tab=${tab}`;
    const items: Array<{ href?: string; label: string; icon: typeof Users; onClick?: () => void; show: boolean }> = [
        { href: link('settings'), label: 'Edit', icon: Edit, show: access.can('batches.edit') },
        { href: link('members'), label: 'Manage students', icon: Users, show: access.can('students.view') },
        { href: link('courses'), label: 'Manage courses', icon: BookOpen, show: access.can('batches.view') },
        { href: link('mentors'), label: 'Manage mentors', icon: UserCog, show: access.can('batches.view') },
        { href: link('joining'), label: 'Invitation link', icon: Link2, show: access.can('batches.invitations') },
        { label: lifecycle === 'archived' ? 'Restore' : 'Archive', icon: lifecycle === 'archived' ? RotateCcw : Archive, onClick: () => onArchive(lifecycle === 'archived' ? 'restore' : 'archive'), show: access.can('batches.archive') },
    ].filter(i => i.show);
    if (!items.length) return null;
    return (
        <div className="relative shrink-0">
            <button type="button" className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label={`Actions for ${batch.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
                    <div role="menu" className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        {items.map(i => {
                            const Icon = i.icon;
                            const cls = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50';
                            return i.href
                                ? <Link key={i.label} role="menuitem" href={i.href} className={cls}><Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />{i.label}</Link>
                                : <button key={i.label} role="menuitem" type="button" className={cls} onClick={() => { setOpen(false); i.onClick?.(); }}><Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />{i.label}</button>;
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

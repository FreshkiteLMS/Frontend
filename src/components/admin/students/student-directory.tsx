"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal, UserMinus, UserPlus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import { batchService } from '@/services/api/batch.api';
import { courseService } from '@/services/api/course.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { DirectoryFilters, DirectoryRow, DirectorySort } from '@/types/admin-insights';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { useDebouncedValue } from '@/components/courses/structured-questions/useDebouncedValue';
import {
    ACTIVITY_LABEL, Avatar, Empty, ErrorState, Pill, ProgressBar, StudentCode, btnPrimary, btnSecondary, fmtRelative, inputCls, useAsync,
} from '../insights/ui';

const SORTS: { value: DirectorySort; dir: 'asc' | 'desc'; label: string }[] = [
    { value: 'joined', dir: 'desc', label: 'Recently joined' },
    { value: 'last_active', dir: 'desc', label: 'Last active' },
    { value: 'progress', dir: 'desc', label: 'Highest progress' },
    { value: 'progress', dir: 'asc', label: 'Lowest progress' },
    { value: 'activity', dir: 'desc', label: 'Most active (30 days)' },
    { value: 'activity', dir: 'asc', label: 'Least active (30 days)' },
    { value: 'assignments', dir: 'desc', label: 'Most assignments finished' },
    { value: 'performance', dir: 'desc', label: 'Best performance (points)' },
    { value: 'name', dir: 'asc', label: 'Name A–Z' },
];

const PROGRESS_BANDS: { label: string; min?: number; max?: number }[] = [
    { label: 'Any progress' },
    { label: 'Not started (0%)', min: 0, max: 0 },
    { label: '1–24%', min: 1, max: 24 },
    { label: '25–49%', min: 25, max: 49 },
    { label: '50–74%', min: 50, max: 74 },
    { label: '75–99%', min: 75, max: 99 },
    { label: 'Complete (100%)', min: 100, max: 100 },
];

const BOOL_KEYS = ['completed', 'inProgress', 'pendingAssignments', 'pendingAudio'] as const;

function readFilters(sp: URLSearchParams): DirectoryFilters {
    const n = (k: string) => (sp.get(k) !== null && sp.get(k) !== '' ? Number(sp.get(k)) : undefined);
    return {
        q: sp.get('q') ?? '',
        batchId: sp.get('batchId') ?? '',
        courseId: sp.get('courseId') ?? '',
        activity: (sp.get('activity') as DirectoryFilters['activity']) ?? '',
        activeDays: n('activeDays') ?? 14,
        progressMin: n('progressMin'),
        progressMax: n('progressMax'),
        completed: sp.get('completed') === 'true',
        inProgress: sp.get('inProgress') === 'true',
        pendingAssignments: sp.get('pendingAssignments') === 'true',
        pendingAudio: sp.get('pendingAudio') === 'true',
        sort: (sp.get('sort') as DirectorySort) ?? 'joined',
        dir: (sp.get('dir') as 'asc' | 'desc') ?? 'desc',
        page: n('page') ?? 1,
        limit: n('limit') ?? 25,
    };
}

/**
 * The student directory. Used globally (Students page) and scoped to one
 * batch (batch → Students tab) — the same component, API and row shape, so
 * both entry points show the same figures and open the same Student 360 page.
 * Filters live in the URL so a view can be shared or reloaded.
 */
export function StudentDirectory({ scope, onMembershipChanged }: { scope?: { batchId: string; batchName: string }; onMembershipChanged?: () => void }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const filters = useMemo(() => readFilters(new URLSearchParams(sp.toString())), [sp]);
    const [search, setSearch] = useState(filters.q ?? '');
    const debounced = useDebouncedValue(search.trim(), 350);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [busy, setBusy] = useState(false);

    const setParams = (patch: Record<string, string | number | boolean | undefined | null>, resetPage = true) => {
        const next = new URLSearchParams(sp.toString());
        for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === '' || v === false) next.delete(k);
            else next.set(k, String(v));
        }
        if (resetPage) next.delete('page');
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };

    // Debounced search → URL.
    useEffect(() => {
        if ((filters.q ?? '') !== debounced) setParams({ q: debounced });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]);

    const key = JSON.stringify({ scope: scope?.batchId, ...filters });
    const state = useAsync(
        () => (scope ? adminInsightsService.batchStudents(scope.batchId, filters) : adminInsightsService.directory(filters)),
        key,
    );
    useEffect(() => { setSelected(new Set()); }, [key]);

    const batches = useAsync(() => batchService.getAll(1, 100).then(r => r.data), 'batches');
    const courses = useAsync(() => courseService.getAllCourses({}), 'courses');

    const rows = state.data?.rows ?? [];
    const allSelected = rows.length > 0 && rows.every(r => selected.has(r.userId));
    const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const selectedRows = rows.filter(r => selected.has(r.userId));
    const band = PROGRESS_BANDS.findIndex(b => b.min === filters.progressMin && b.max === filters.progressMax);
    const activeFilterCount = [filters.batchId, filters.courseId, filters.activity, filters.progressMin !== undefined ? 'p' : '', ...BOOL_KEYS.map(k => (filters[k] ? 'x' : ''))].filter(Boolean).length;

    const open = (r: DirectoryRow) => router.push(`/admin/students/${encodeURIComponent(r.userId)}${scope ? `?batch=${encodeURIComponent(scope.batchId)}` : ''}`);

    const exportCsv = async () => {
        try {
            if (scope) await adminInsightsService.exportBatchStudents(scope.batchId, filters);
            else await adminInsightsService.exportDirectory(filters);
        } catch (err) { toast.error(apiErrorMessage(err, 'Export failed')); }
    };

    const removeSelected = async () => {
        if (!scope) return;
        setBusy(true);
        try {
            for (const r of selectedRows) await batchService.removeStudent(scope.batchId, r.id);
            toast.success(`Removed ${selectedRows.length} student${selectedRows.length === 1 ? '' : 's'} from ${scope.batchName}`);
            setConfirmRemove(false);
            state.reload();
            onMembershipChanged?.();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not remove the students'));
        } finally { setBusy(false); }
    };

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1 min-w-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={scope ? 'Search this batch by name, email or Student ID' : 'Search by name, email, Student ID or batch name'}
                        aria-label="Search students"
                        className={`${inputCls} w-full pl-9`}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="dir-sort">Sort</label>
                    <select
                        id="dir-sort"
                        className={inputCls}
                        value={`${filters.sort}:${filters.dir}`}
                        onChange={e => { const [s, d] = e.target.value.split(':'); setParams({ sort: s, dir: d }); }}
                    >
                        {SORTS.map(s => <option key={`${s.value}:${s.dir}`} value={`${s.value}:${s.dir}`}>{s.label}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowFilters(v => !v)} className={btnSecondary} aria-expanded={showFilters}>
                        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
                    </button>
                    <button type="button" onClick={exportCsv} className={btnSecondary} title="Download the filtered list as CSV">
                        <Download className="h-4 w-4" aria-hidden="true" /> Export
                    </button>
                    {scope && (
                        <button type="button" onClick={() => setAddOpen(true)} className={btnPrimary}>
                            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add students
                        </button>
                    )}
                </div>
            </div>

            {showFilters && (
                <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {!scope && (
                        <label className="text-xs text-gray-600 dark:text-gray-400">Batch
                            <select className={`${inputCls} mt-1 w-full`} value={filters.batchId} onChange={e => setParams({ batchId: e.target.value })}>
                                <option value="">All batches</option>
                                {(batches.data ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="text-xs text-gray-600 dark:text-gray-400">Course
                        <select className={`${inputCls} mt-1 w-full`} value={filters.courseId} onChange={e => setParams({ courseId: e.target.value })}>
                            <option value="">All courses</option>
                            {(courses.data ?? []).filter(c => c.id).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </label>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Activity
                        <div className="mt-1 flex gap-2">
                            <select className={`${inputCls} flex-1`} value={filters.activity} onChange={e => setParams({ activity: e.target.value })}>
                                <option value="">Any</option>
                                <option value="active">Active recently</option>
                                <option value="inactive">Not active recently</option>
                                <option value="never">No activity yet</option>
                            </select>
                            <select className={inputCls} aria-label="Activity window" value={filters.activeDays} onChange={e => setParams({ activeDays: e.target.value })}>
                                {[7, 14, 30, 60].map(d => <option key={d} value={d}>{d} days</option>)}
                            </select>
                        </div>
                    </label>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Overall progress
                        <select className={`${inputCls} mt-1 w-full`} value={band < 0 ? 0 : band} onChange={e => { const b = PROGRESS_BANDS[Number(e.target.value)]; setParams({ progressMin: b.min, progressMax: b.max }); }}>
                            {PROGRESS_BANDS.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
                        </select>
                    </label>
                    <fieldset className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <legend className="sr-only">Only students who</legend>
                        {([
                            ['completed', 'Completed a course'],
                            ['inProgress', 'Have a course in progress'],
                            ['pendingAssignments', 'Have unfinished assignments'],
                            ['pendingAudio', 'Have pending audio attempts / evaluations'],
                        ] as const).map(([k, label]) => (
                            <label key={k} className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={!!filters[k]} onChange={e => setParams({ [k]: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                                {label}
                            </label>
                        ))}
                        {activeFilterCount > 0 && (
                            <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                onClick={() => setParams({ batchId: '', courseId: '', activity: '', progressMin: undefined, progressMax: undefined, completed: false, inProgress: false, pendingAssignments: false, pendingAudio: false })}>
                                <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
                            </button>
                        )}
                    </fieldset>
                </div>
            )}

            {/* Bulk bar */}
            {selected.size > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5 text-sm">
                    <span className="font-medium text-blue-900 dark:text-blue-200">{selected.size} selected</span>
                    <button type="button" onClick={() => setAssignOpen(true)} className={btnSecondary}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add to a batch</button>
                    {scope && <button type="button" onClick={() => setConfirmRemove(true)} className={`${btnSecondary} text-red-600 dark:text-red-400`}><UserMinus className="h-4 w-4" aria-hidden="true" /> Remove from this batch</button>}
                    <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-700 dark:text-blue-300 hover:underline">Clear selection</button>
                </div>
            )}

            {state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="w-10 px-3 py-3">
                                        <input type="checkbox" aria-label="Select all on this page" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.userId)))} className="h-4 w-4 rounded border-gray-300" />
                                    </th>
                                    <th className="px-3 py-3">Student</th>
                                    {!scope && <th className="px-3 py-3">Batches</th>}
                                    <th className="px-3 py-3">Courses</th>
                                    <th className="px-3 py-3 min-w-[150px]">Overall progress</th>
                                    <th className="px-3 py-3">Assignments</th>
                                    <th className="px-3 py-3">Audio practice</th>
                                    <th className="px-3 py-3">Last active</th>
                                    <th className="px-3 py-3">{scope ? 'Batch rank' : 'Rank'}</th>
                                    <th className="px-3 py-3">Pending</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {state.loading && !state.data ? (
                                    Array.from({ length: 6 }, (_, i) => (
                                        <tr key={i} className="animate-pulse"><td colSpan={10} className="px-3 py-4"><div className="h-6 rounded bg-gray-100 dark:bg-gray-800" /></td></tr>
                                    ))
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={10} className="p-6">
                                        <Empty icon={<Users className="h-10 w-10" />} title={activeFilterCount || filters.q ? 'No students match these filters' : scope ? 'No students in this batch yet' : 'No students yet'}>
                                            {scope && !activeFilterCount && !filters.q ? 'Use “Add students” to add members.' : null}
                                        </Empty>
                                    </td></tr>
                                ) : rows.map(r => (
                                    <tr key={r.userId} className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 ${state.loading ? 'opacity-60' : ''}`} onClick={() => open(r)}>
                                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.userId)} onChange={() => toggle(r.userId)} className="h-4 w-4 rounded border-gray-300" />
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-3 min-w-[220px]">
                                                <Avatar name={r.name} url={r.avatarUrl} />
                                                <div className="min-w-0">
                                                    <a href={`/admin/students/${r.userId}`} onClick={e => { e.preventDefault(); open(r); }} className="block truncate font-medium text-gray-900 dark:text-white hover:underline">{r.name}</a>
                                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{r.email}</p>
                                                    <div className="mt-0.5"><StudentCode code={r.studentCode} /></div>
                                                </div>
                                            </div>
                                        </td>
                                        {!scope && (
                                            <td className="px-3 py-3">
                                                {r.batches.length === 0 ? <span className="text-xs text-gray-400">—</span> : (
                                                    <div className="flex max-w-[180px] flex-wrap gap-1">
                                                        {r.batches.slice(0, 2).map(b => <span key={b.id} className="rounded bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-300">{b.name}</span>)}
                                                        {r.batches.length > 2 && <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">+{r.batches.length - 2}</span>}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                            <span className="tabular-nums">{r.enrolledCourses}</span> enrolled
                                            <p className="text-xs text-gray-500">{r.completedCourses} done · {r.inProgressCourses} in progress</p>
                                        </td>
                                        <td className="px-3 py-3"><ProgressBar value={r.overallProgress} label={`${r.name} overall progress`} /></td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {r.assignments.total === 0 ? <span className="text-xs text-gray-400">None</span> : (
                                                <><span className="tabular-nums text-gray-800 dark:text-gray-200">{r.assignments.finished}/{r.assignments.total}</span>
                                                    {r.assignments.pending > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{r.assignments.pending} pending</p>}</>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {r.audio.questions_total === 0 && r.audio.attempts === 0 ? <span className="text-xs text-gray-400">None</span> : (
                                                <><span className="tabular-nums text-gray-800 dark:text-gray-200">{r.audio.practised}/{r.audio.questions_total}</span>
                                                    <p className="text-xs text-gray-500">{r.audio.attempts} attempts{r.audio.avg_best !== null ? ` · avg ${r.audio.avg_best}/10` : ''}</p></>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <span className="text-gray-700 dark:text-gray-300">{fmtRelative(r.lastActivityAt)}</span>
                                            <div className="mt-0.5"><Pill tone={r.activityStatus}>{ACTIVITY_LABEL[r.activityStatus]}</Pill></div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap tabular-nums text-gray-700 dark:text-gray-300">
                                            {(scope ? r.batchRank : r.rank) ? `#${scope ? r.batchRank : r.rank}` : '—'}
                                            {r.points !== null && <p className="text-xs text-gray-500">{r.points} pts</p>}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-col gap-1">
                                                {r.pending.attemptRequests > 0 && <Pill tone="inactive">{r.pending.attemptRequests} attempt request{r.pending.attemptRequests === 1 ? '' : 's'}</Pill>}
                                                {r.pending.enrollmentRequests > 0 && <Pill tone="info">{r.pending.enrollmentRequests} enrolment</Pill>}
                                                {r.pending.audioProcessing > 0 && <Pill tone="neutral">{r.pending.audioProcessing} evaluating</Pill>}
                                                {!r.pending.attemptRequests && !r.pending.enrollmentRequests && !r.pending.audioProcessing && <span className="text-xs text-gray-400">—</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {state.data && state.data.total > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                                {(state.data.page - 1) * state.data.limit + 1}–{Math.min(state.data.total, state.data.page * state.data.limit)} of {state.data.total} students
                            </span>
                            <div className="flex items-center gap-2">
                                <select aria-label="Rows per page" className={inputCls} value={filters.limit} onChange={e => setParams({ limit: e.target.value })}>
                                    {[25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                                </select>
                                <button type="button" className={btnSecondary} disabled={state.data.page <= 1} onClick={() => setParams({ page: state.data!.page - 1 }, false)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                                <span className="tabular-nums">Page {state.data.page} of {state.data.totalPages}</span>
                                <button type="button" className={btnSecondary} disabled={state.data.page >= state.data.totalPages} onClick={() => setParams({ page: state.data!.page + 1 }, false)} aria-label="Next page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AssignToBatchModal
                open={assignOpen}
                students={selectedRows}
                batches={(batches.data ?? []).filter(b => b.id !== scope?.batchId)}
                onClose={() => setAssignOpen(false)}
                onDone={() => { setAssignOpen(false); setSelected(new Set()); state.reload(); }}
            />
            {scope && (
                <AddStudentsModal
                    open={addOpen}
                    batchId={scope.batchId}
                    batchName={scope.batchName}
                    onClose={() => setAddOpen(false)}
                    onDone={() => { setAddOpen(false); state.reload(); onMembershipChanged?.(); }}
                />
            )}
            <ConfirmDialog
                open={confirmRemove}
                title="Remove from batch?"
                message={<>Remove {selectedRows.length} student{selectedRows.length === 1 ? '' : 's'} from <strong>{scope?.batchName}</strong>? They lose access to the batch&apos;s courses and groups. Their learning history and other batches are not affected.</>}
                confirmLabel="Remove"
                busy={busy}
                onConfirm={removeSelected}
                onCancel={() => setConfirmRemove(false)}
            />
        </div>
    );
}

function AssignToBatchModal({ open, students, batches, onClose, onDone }: { open: boolean; students: DirectoryRow[]; batches: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
    const [batchId, setBatchId] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        if (!batchId) return;
        setBusy(true);
        try {
            await batchService.assignStudents(batchId, students.map(s => s.id));
            toast.success(`${students.length} student${students.length === 1 ? '' : 's'} added to ${batches.find(b => b.id === batchId)?.name}`);
            onDone();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not add the students'));
        } finally { setBusy(false); }
    };
    return (
        <Modal open={open} onClose={onClose} title="Add to a batch" description={`${students.length} selected student${students.length === 1 ? '' : 's'}`} size="sm"
            footer={<div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} disabled={!batchId || busy} onClick={submit}>{busy ? 'Adding…' : 'Add'}</button></div>}>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Batch
                <select className={`${inputCls} mt-1 w-full`} value={batchId} onChange={e => setBatchId(e.target.value)}>
                    <option value="">Choose a batch…</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </label>
            <p className="mt-2 text-xs text-gray-500">Students already in that batch are left as they are. Being in one batch never removes anyone from another.</p>
        </Modal>
    );
}

/** Pick students (server-side search) to add to a batch. */
export function AddStudentsModal({ open, batchId, batchName, onClose, onDone }: { open: boolean; batchId: string; batchName: string; onClose: () => void; onDone: () => void }) {
    const [q, setQ] = useState('');
    const dq = useDebouncedValue(q.trim(), 300);
    const [picked, setPicked] = useState<Map<string, DirectoryRow>>(new Map());
    const [busy, setBusy] = useState(false);
    const results = useAsync(() => adminInsightsService.directory({ q: dq, limit: 20, sort: 'name', dir: 'asc' }), `add:${dq}`, open);
    useEffect(() => { if (!open) { setPicked(new Map()); setQ(''); } }, [open]);
    const submit = async () => {
        setBusy(true);
        try {
            await batchService.assignStudents(batchId, Array.from(picked.values()).map(s => s.id));
            toast.success(`${picked.size} student${picked.size === 1 ? '' : 's'} added to ${batchName}`);
            onDone();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not add the students'));
        } finally { setBusy(false); }
    };
    return (
        <Modal open={open} onClose={onClose} title={`Add students to ${batchName}`} size="lg"
            footer={<div className="flex items-center justify-between gap-2"><span className="text-sm text-gray-500">{picked.size} selected</span><div className="flex gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} disabled={!picked.size || busy} onClick={submit}>{busy ? 'Adding…' : `Add ${picked.size || ''}`}</button></div></div>}>
            <input type="search" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email or Student ID" aria-label="Search students" className={`${inputCls} w-full`} />
            <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-100 dark:border-gray-800">
                {results.loading && !results.data ? <p className="p-4 text-sm text-gray-500">Searching…</p> : results.error ? <div className="p-3"><ErrorState error={results.error} onRetry={results.reload} /></div> :
                    (results.data?.rows ?? []).length === 0 ? <p className="p-4 text-sm text-gray-500">No students found.</p> :
                    results.data!.rows.map(s => {
                        const inBatch = s.batches.some(b => b.id === batchId);
                        return (
                            <label key={s.userId} className={`flex items-center gap-3 px-3 py-2.5 ${inBatch ? 'opacity-60' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                                <input type="checkbox" disabled={inBatch} checked={inBatch || picked.has(s.userId)} className="h-4 w-4 rounded border-gray-300"
                                    onChange={() => setPicked(p => { const n = new Map(p); if (n.has(s.userId)) n.delete(s.userId); else n.set(s.userId, s); return n; })} />
                                <Avatar name={s.name} url={s.avatarUrl} size={28} />
                                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{s.name}</span><span className="block truncate text-xs text-gray-500">{s.email}</span></span>
                                {inBatch ? <span className="text-xs text-gray-500">Already a member</span> : <StudentCode code={s.studentCode} />}
                            </label>
                        );
                    })}
            </div>
        </Modal>
    );
}

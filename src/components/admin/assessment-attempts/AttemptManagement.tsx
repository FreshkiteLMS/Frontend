"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Eye, Loader2, Search, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { attemptsService } from '@/services/api/assessment-attempts.api';
import { courseService } from '@/services/api/course.api';
import { apiErrorMessage } from '@/services/api/discount.api';
import {
    ASSESSMENT_KIND_LABELS,
    type AdminAttemptRequest,
    type AllowanceDetail,
    type AllowanceRow,
    type AttemptsOverview,
} from '@/types/assessment-attempts';

type Meta = { page: number; totalPages: number; total: number };
const input = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';
const STATUS_CHIP: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    REJECTED: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    NONE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function Pager({ meta, page, setPage }: { meta: Meta | null; page: number; setPage: (fn: (p: number) => number) => void }) {
    if (!meta || meta.totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 text-xs text-gray-500">
            <span>Page {meta.page} of {meta.totalPages} · {meta.total}</span>
            <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages} aria-label="Next page" className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
        </div>
    );
}

/** Approve with an explicit number of attempts, or reject with a reason. */
function DecisionModal({ request, mode, onClose, onDone }: { request: AdminAttemptRequest; mode: 'approve' | 'reject'; onClose: () => void; onDone: () => void }) {
    const [count, setCount] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const n = Number(count);
    const validCount = /^\d+$/.test(count) && n >= 1 && n <= 50;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'approve' && !validCount) { setError('Enter how many additional attempts to grant (1–50).'); return; }
        if (mode === 'reject' && reason.trim().length < 3) { setError('Give the student a reason (at least 3 characters).'); return; }
        setBusy(true);
        setError(null);
        try {
            if (mode === 'approve') await attemptsService.approve(request.id, n, notes.trim());
            else await attemptsService.reject(request.id, reason.trim(), notes.trim());
            toast.success(mode === 'approve' ? `Granted ${n} attempt${n === 1 ? '' : 's'} to ${request.student.name}` : 'Request rejected');
            onDone();
        } catch (err) {
            setError(apiErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={busy ? () => undefined : onClose}
            size="md"
            title={mode === 'approve' ? 'Approve additional attempts' : 'Reject request'}
            description={`${request.student.name} · ${request.itemTitle}`}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button type="submit" form="attempt-decision" disabled={busy} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{mode === 'approve' ? 'Approve' : 'Reject'}
                    </button>
                </div>
            }
        >
            <form id="attempt-decision" onSubmit={submit} className="space-y-4" noValidate>
                <dl className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-center text-sm">
                    <div><dt className="text-[11px] text-gray-500">Used</dt><dd className="font-bold tabular-nums">{request.currentUsed}</dd></div>
                    <div><dt className="text-[11px] text-gray-500">Allowed now</dt><dd className="font-bold tabular-nums">{request.currentAllowed}</dd></div>
                    <div><dt className="text-[11px] text-gray-500">Requested</dt><dd className="font-bold tabular-nums">+{request.requestedCount}</dd></div>
                </dl>
                <blockquote className="rounded-lg border-l-4 border-gray-200 dark:border-gray-700 pl-3 text-sm text-gray-700 dark:text-gray-300">“{request.reason}”</blockquote>
                {mode === 'approve' ? (
                    <div>
                        <label htmlFor="ad-count" className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Additional attempts to grant</label>
                        <input id="ad-count" data-autofocus inputMode="numeric" value={count} onChange={e => { setCount(e.target.value.replace(/\D/g, '').slice(0, 2)); setError(null); }} placeholder={`e.g. ${Math.min(request.requestedCount, 2)}`} className={`${input} w-32`} />
                        <p className="mt-1 text-xs text-gray-500">{validCount ? `New total allowance: ${request.currentAllowed + n}` : 'You choose the number — it does not have to match the request.'}</p>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="ad-reason" className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Reason shown to the student</label>
                        <textarea id="ad-reason" data-autofocus value={reason} onChange={e => { setReason(e.target.value); setError(null); }} rows={3} maxLength={1000} className={`${input} w-full resize-y`} />
                    </div>
                )}
                <div>
                    <label htmlFor="ad-notes" className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Admin notes <span className="font-normal text-gray-400">(internal, optional)</span></label>
                    <textarea id="ad-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1000} className={`${input} w-full resize-y`} />
                </div>
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </form>
        </Modal>
    );
}

function AllowanceDetailModal({ row, onClose, onChanged }: { row: AllowanceRow; onClose: () => void; onChanged: () => void }) {
    const [d, setD] = useState<AllowanceDetail | null>(null);
    const [count, setCount] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const item = { kind: row.kind, courseId: row.courseId, itemId: row.itemId };
    useEffect(() => {
        attemptsService.allowanceDetail(row.userId, item).then(setD).catch(e => toast.error(apiErrorMessage(e)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row.userId, row.kind, row.courseId, row.itemId]);

    const grant = async () => {
        const n = Number(count);
        if (!(n >= 1 && n <= 50)) { toast.error('Grant between 1 and 50 attempts.'); return; }
        setBusy(true);
        try {
            setD(await attemptsService.grant(row.userId, item, n, notes.trim()));
            setCount(''); setNotes('');
            toast.success(`Granted ${n} attempt${n === 1 ? '' : 's'}`);
            onChanged();
        } catch (e) {
            toast.error(apiErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open onClose={onClose} size="xl" title={`${row.student.name} · ${row.itemTitle}`} description={`${ASSESSMENT_KIND_LABELS[row.kind]} · ${row.courseTitle}`}>
            {!d ? <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-label="Loading" /> : (
                <div className="space-y-5 text-sm">
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[['Used', d.attemptsUsed], ['Default', d.defaultAllowed], ['Extra granted', d.additionalGranted], ['Allowed', d.allowed]].map(([k, v]) => (
                            <div key={k as string} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3"><dt className="text-[11px] text-gray-500">{k}</dt><dd className="text-lg font-bold tabular-nums">{v}</dd></div>
                        ))}
                    </dl>
                    <section>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Grant attempts directly</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <input aria-label="Attempts to grant" inputMode="numeric" value={count} onChange={e => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Count" className={`${input} w-24`} />
                            <input aria-label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" maxLength={1000} className={`${input} flex-1 min-w-[160px]`} />
                            <button type="button" onClick={grant} disabled={busy || !count} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Grant</button>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Audit trail</h4>
                        {d.grants.length === 0 && d.requests.length === 0 ? <p className="mt-1 text-gray-500">No requests or grants yet.</p> : (
                            <ul className="mt-2 space-y-2">
                                {d.requests.map(r => (
                                    <li key={r.id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                                        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[r.status]}`}>{r.status}</span><span className="text-gray-500">{fmt(r.createdAt)}</span><span>requested +{r.requestedCount}{r.approvedCount ? `, granted +${r.approvedCount}` : ''}</span></div>
                                        <p className="mt-1 text-gray-700 dark:text-gray-300">“{r.reason}”</p>
                                        {r.rejectionReason && <p className="mt-1 text-rose-700 dark:text-rose-400">Rejected: {r.rejectionReason}</p>}
                                        {r.adminNotes && <p className="mt-1 text-gray-500">Notes: {r.adminNotes}</p>}
                                    </li>
                                ))}
                                {d.grants.filter(g => !g.requestId).map((g, i) => (
                                    <li key={i} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 text-gray-700 dark:text-gray-300">Direct grant +{g.count} by {g.grantedBy} · {fmt(g.grantedAt)}{g.notes ? ` · ${g.notes}` : ''}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </Modal>
    );
}

export function AttemptManagement() {
    const router = useRouter();
    const [overview, setOverview] = useState<AttemptsOverview | null>(null);
    const [tab, setTab] = useState<'requests' | 'progress'>('requests');
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);

    // Requests
    const [rq, setRq] = useState({ status: 'PENDING', kind: '', q: '' });
    const [reqs, setReqs] = useState<AdminAttemptRequest[]>([]);
    const [reqMeta, setReqMeta] = useState<Meta | null>(null);
    const [reqPage, setReqPage] = useState(1);
    const [decision, setDecision] = useState<{ request: AdminAttemptRequest; mode: 'approve' | 'reject' } | null>(null);

    // Student progress
    const [pf, setPf] = useState({ q: '', kind: '', courseId: '', status: '', approval: '' });
    const [rows, setRows] = useState<AllowanceRow[]>([]);
    const [rowMeta, setRowMeta] = useState<Meta | null>(null);
    const [rowPage, setRowPage] = useState(1);
    const [viewing, setViewing] = useState<AllowanceRow | null>(null);
    const [loading, setLoading] = useState(false);

    const loadOverview = useCallback(() => attemptsService.overview().then(setOverview).catch(() => undefined), []);
    useEffect(() => { void loadOverview(); }, [loadOverview]);
    useEffect(() => { courseService.getAll({ limit: 100 }).then(r => setCourses(r.data.filter(c => !!c.id).map(c => ({ id: c.id as string, title: c.title })))).catch(() => undefined); }, []);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        try {
            const r = await attemptsService.requests({ ...rq, page: reqPage, limit: 20 });
            setReqs(r.data); setReqMeta(r.meta);
        } catch (e) { toast.error(apiErrorMessage(e)); } finally { setLoading(false); }
    }, [rq, reqPage]);
    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const r = await attemptsService.allowances({ ...pf, page: rowPage, limit: 20 });
            setRows(r.data); setRowMeta(r.meta);
        } catch (e) { toast.error(apiErrorMessage(e)); } finally { setLoading(false); }
    }, [pf, rowPage]);
    useEffect(() => { if (tab === 'requests') { const t = setTimeout(() => void loadRequests(), 250); return () => clearTimeout(t); } }, [tab, loadRequests]);
    useEffect(() => { if (tab === 'progress') { const t = setTimeout(() => void loadRows(), 250); return () => clearTimeout(t); } }, [tab, loadRows]);

    const refreshAll = () => { void loadOverview(); if (tab === 'requests') void loadRequests(); else void loadRows(); };

    const cards = overview ? [
        ['Total attempts', overview.totalAttempts], ['Students at limit', overview.studentsAtLimit], ['Pending requests', overview.pendingRequests],
        ['Approved', overview.approvedRequests], ['Rejected', overview.rejectedRequests],
    ] : [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => router.push('/admin')} className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessment Attempt Management</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Every student gets {overview?.defaultAttempts ?? 3} recorded attempts per course audio question and per Problem Solving logic explanation. Review requests for more here.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                {overview ? cards.map(([k, v]) => (
                    <div key={k as string} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{k}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{v}</p>
                    </div>
                )) : [0, 1, 2, 3, 4].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
            </div>

            <div role="tablist" aria-label="Attempt management" className="mt-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
                {([['requests', `Requests${overview?.pendingRequests ? ` (${overview.pendingRequests})` : ''}`], ['progress', 'Student progress']] as const).map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === id ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>{label}</button>
                ))}
            </div>

            {tab === 'requests' ? (
                <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" /><input value={rq.q} onChange={e => { setRq({ ...rq, q: e.target.value }); setReqPage(1); }} placeholder="Student name, email or ID" aria-label="Search student" className={`${input} pl-9`} /></div>
                        <select aria-label="Approval status" value={rq.status} onChange={e => { setRq({ ...rq, status: e.target.value }); setReqPage(1); }} className={input}>
                            <option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">All</option>
                        </select>
                        <select aria-label="Assessment type" value={rq.kind} onChange={e => { setRq({ ...rq, kind: e.target.value }); setReqPage(1); }} className={input}>
                            <option value="">All types</option><option value="COURSE_QUESTION">Course</option><option value="PROBLEM_LOGIC">Problem Solving</option>
                        </select>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Used / allowed</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Date</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {loading && !reqs.length ? <tr><td colSpan={7} className="px-4 py-6"><div className="h-5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /></td></tr>
                                        : reqs.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">{rq.status === 'PENDING' ? 'No pending requests.' : 'No requests match.'}</td></tr>
                                            : reqs.map(r => (
                                                <tr key={r.id}>
                                                    <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{r.student.name}</p><p className="text-xs text-gray-500">{r.student.studentCode ?? r.student.email}</p></td>
                                                    <td className="px-4 py-3"><p className="text-gray-900 dark:text-white">{r.itemTitle}</p><p className="text-xs text-gray-500">{ASSESSMENT_KIND_LABELS[r.kind]} · {r.courseTitle}</p></td>
                                                    <td className="px-4 py-3 tabular-nums">{r.currentUsed} / {r.currentAllowed}</td>
                                                    <td className="px-4 py-3 tabular-nums">+{r.requestedCount}{r.approvedCount ? <span className="block text-xs text-emerald-600">granted +{r.approvedCount}</span> : null}</td>
                                                    <td className="px-4 py-3 max-w-[260px]"><p className="line-clamp-2 text-gray-700 dark:text-gray-300" title={r.reason}>{r.reason}</p>{r.rejectionReason && <p className="text-xs text-rose-600">Rejected: {r.rejectionReason}</p>}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{fmt(r.createdAt)}</td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        {r.status === 'PENDING' ? (
                                                            <span className="inline-flex gap-1">
                                                                <button onClick={() => setDecision({ request: r, mode: 'approve' })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden="true" />Approve</button>
                                                                <button onClick={() => setDecision({ request: r, mode: 'reject' })} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-800 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20"><X className="h-3.5 w-3.5" aria-hidden="true" />Reject</button>
                                                            </span>
                                                        ) : <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[r.status]}`}>{r.status}{r.reviewedBy ? ` · ${r.reviewedBy}` : ''}</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager meta={reqMeta} page={reqPage} setPage={setReqPage} />
                    </div>
                </div>
            ) : (
                <div className="mt-4 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" /><input value={pf.q} onChange={e => { setPf({ ...pf, q: e.target.value }); setRowPage(1); }} placeholder="Student" aria-label="Search student" className={`${input} w-full pl-9`} /></div>
                        <select aria-label="Course" value={pf.courseId} onChange={e => { setPf({ ...pf, courseId: e.target.value }); setRowPage(1); }} className={input}>
                            <option value="">All courses</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <select aria-label="Assessment type" value={pf.kind} onChange={e => { setPf({ ...pf, kind: e.target.value }); setRowPage(1); }} className={input}>
                            <option value="">All types</option><option value="COURSE_QUESTION">Course</option><option value="PROBLEM_LOGIC">Problem Solving</option>
                        </select>
                        <select aria-label="Attempt status" value={pf.status} onChange={e => { setPf({ ...pf, status: e.target.value }); setRowPage(1); }} className={input}>
                            <option value="">Any attempt status</option><option value="limit_reached">Limit reached</option><option value="in_progress">In progress</option><option value="extended">Extended</option>
                        </select>
                        <select aria-label="Approval status" value={pf.approval} onChange={e => { setPf({ ...pf, approval: e.target.value }); setRowPage(1); }} className={input}>
                            <option value="">Any approval</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="none">No requests</option>
                        </select>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Attempts used</th><th className="px-4 py-3">Allowed</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Action</span></th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {loading && !rows.length ? <tr><td colSpan={7} className="px-4 py-6"><div className="h-5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /></td></tr>
                                        : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No students match.</td></tr>
                                            : rows.map(r => (
                                                <tr key={`${r.userId}-${r.kind}-${r.itemId}`}>
                                                    <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{r.student.name}</p><p className="text-xs text-gray-500">{r.student.studentCode ?? r.student.email}</p></td>
                                                    <td className="px-4 py-3"><p className="text-gray-900 dark:text-white">{r.itemTitle}</p><p className="text-xs text-gray-500">{r.courseTitle}</p></td>
                                                    <td className="px-4 py-3">{ASSESSMENT_KIND_LABELS[r.kind]}</td>
                                                    <td className="px-4 py-3 tabular-nums">{r.attemptsUsed}</td>
                                                    <td className="px-4 py-3 tabular-nums">{r.allowed}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.approval === 'PENDING' ? STATUS_CHIP.PENDING : r.limitReached ? STATUS_CHIP.REJECTED : r.additionalGranted ? STATUS_CHIP.APPROVED : STATUS_CHIP.NONE}`}>
                                                            {r.approval === 'PENDING' ? 'Request pending' : r.limitReached ? 'Limit reached' : r.additionalGranted ? 'Approved' : 'In progress'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right"><button onClick={() => setViewing(r)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"><Eye className="h-3.5 w-3.5" aria-hidden="true" />View</button></td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager meta={rowMeta} page={rowPage} setPage={setRowPage} />
                    </div>
                </div>
            )}

            {decision && <DecisionModal request={decision.request} mode={decision.mode} onClose={() => setDecision(null)} onDone={() => { setDecision(null); refreshAll(); }} />}
            {viewing && <AllowanceDetailModal row={viewing} onClose={() => setViewing(null)} onChanged={refreshAll} />}
        </div>
    );
}

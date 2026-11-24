"use client";

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Eye, Loader2, Search, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { enrollmentAdminApi, apiErrorMessage } from '@/services/api/enrollment-management.api';
import type { ApprovalStatus } from '@/types/enrollment-request';
import type { AdminAccessRequest, AdminEnrollment, AuditLogEntry, PageMeta, ResourceType } from '@/types/enrollment';
import { accessEndLabel, defaultDraft, draftToDuration, fmtDate, fmtDateTime, type DurationDraft } from '@/lib/access-window';
import {
    DetailRow, DurationPicker, EmptyBox, EnrollmentStatusBadge, ErrorBox, LoadingRows, Pagination, RESOURCE_LABEL, RequestStatusBadge,
    ResourceIcon, StudentCell, cardCls, dangerBtn, inputCls, labelCls, primaryBtn, secondaryBtn, th,
} from './shared';
import { AuditTrail } from './audit-log-tab';

const TABS: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const TAB_LABEL: Record<ApprovalStatus, string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled' };

type Detail = {
    request: AdminAccessRequest;
    enrollment: AdminEnrollment | null;
    currentAccess: { hasAccess: boolean; until: string | null | undefined; via?: string } | null;
    auditTrail: AuditLogEntry[];
};

export function AccessRequestsTab({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
    const [status, setStatus] = useState<ApprovalStatus>('PENDING');
    const [type, setType] = useState<ResourceType | ''>('');
    const [rows, setRows] = useState<AdminAccessRequest[]>([]);
    const [meta, setMeta] = useState<PageMeta | null>(null);
    const [counts, setCounts] = useState<Record<ApprovalStatus, number>>({ PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState<{ id: string; mode: 'view' | 'approve' | 'reject' } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await enrollmentAdminApi.requests({ status, product_type: type, q: q || undefined, page, limit: 15 });
            setRows(r.rows);
            setMeta(r.meta);
            setCounts(r.counts);
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load access requests'));
        } finally {
            setLoading(false);
        }
    }, [status, type, q, page]);
    useEffect(() => { load(); }, [load, refreshKey]);

    return (
        <div className="space-y-4">
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto" role="tablist" aria-label="Request status">
                {TABS.map(t => (
                    <button key={t} type="button" role="tab" aria-selected={status === t} onClick={() => { setStatus(t); setPage(1); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${status === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        {TAB_LABEL[t]}
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{counts[t] ?? 0}</span>
                    </button>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <form className="relative flex-1" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(1); }}>
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or resource… (Enter)" aria-label="Search requests" className={`${inputCls} pl-9`} />
                </form>
                <select aria-label="Resource type" className={`${inputCls} sm:w-52`} value={type} onChange={e => { setType(e.target.value as ResourceType | ''); setPage(1); }}>
                    <option value="">All resource types</option>
                    {(Object.keys(RESOURCE_LABEL) as ResourceType[]).map(t => <option key={t} value={t}>{RESOURCE_LABEL[t]}</option>)}
                </select>
            </div>

            {loading && !rows.length ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={load} /> : rows.length === 0 ? (
                <EmptyBox title={`No ${TAB_LABEL[status].toLowerCase()} requests`} hint={status === 'PENDING' ? 'New student requests appear here.' : undefined} />
            ) : (
                <div className={`${cardCls} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>{['Student', 'Requested', 'Type', 'Date', 'Student reason', 'Status'].map(h => th(h))}<th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
                            </thead>
                            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 ${loading ? 'opacity-60' : ''}`}>
                                {rows.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                        <td className="px-4 py-3 max-w-[16rem]"><StudentCell name={r.student_name} email={r.student_email} code={r.student_code} /></td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-gray-900 dark:text-white"><ResourceIcon type={r.product_type} className="w-4 h-4 text-gray-400" /> {r.product_name}</span>
                                            <span className="block text-[11px] font-mono text-gray-400 mt-0.5">{r.reference}</span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{RESOURCE_LABEL[r.product_type]}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmtDate(r.created_at)}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={r.notes || undefined}>{r.notes || '—'}</td>
                                        <td className="px-4 py-3"><RequestStatusBadge status={r.status} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button type="button" onClick={() => setOpen({ id: r.id, mode: 'view' })} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={`View request from ${r.student_name}`}>
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {r.status === 'PENDING' && (
                                                    <>
                                                        <button type="button" onClick={() => setOpen({ id: r.id, mode: 'approve' })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
                                                            <Check className="w-3.5 h-3.5" /> Approve
                                                        </button>
                                                        <button type="button" onClick={() => setOpen({ id: r.id, mode: 'reject' })} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-xs font-semibold rounded-lg">
                                                            <X className="w-3.5 h-3.5" /> Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={meta} onPage={setPage} />
                </div>
            )}

            {open && (
                <RequestModal
                    id={open.id}
                    initialMode={open.mode}
                    onClose={() => setOpen(null)}
                    onDone={() => { setOpen(null); load(); onChanged(); }}
                />
            )}
        </div>
    );
}

function RequestModal({ id, initialMode, onClose, onDone }: { id: string; initialMode: 'view' | 'approve' | 'reject'; onClose: () => void; onDone: () => void }) {
    const [mode, setMode] = useState(initialMode);
    const [data, setData] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState<DurationDraft>(defaultDraft('LIFETIME'));
    const [response, setResponse] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        try {
            setData(await enrollmentAdminApi.request(id));
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load this request'));
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const r = data?.request;
    const preview = draftToDuration(draft);

    const approve = async () => {
        if (!r || preview.error || !preview.duration) return;
        setBusy(true);
        try {
            await enrollmentAdminApi.approve(r.id, { duration: preview.duration, adminResponse: response.trim() || undefined, adminNotes: adminNotes.trim() || undefined });
            toast.success(`Approved — ${r.student_name} now has access to ${r.product_name}`);
            onDone();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'Could not approve'));
            load();
        } finally {
            setBusy(false);
        }
    };

    const reject = async () => {
        if (!r || !reason.trim()) return;
        setBusy(true);
        try {
            await enrollmentAdminApi.reject(r.id, { reason: reason.trim(), adminNotes: adminNotes.trim() || undefined });
            toast.success('Request rejected');
            onDone();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'Could not reject'));
            load();
        } finally {
            setBusy(false);
        }
    };

    const pending = r?.status === 'PENDING';
    const footer = !r ? null : mode === 'approve' && pending ? (
        <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setMode('view')} disabled={busy}>Back</button>
            <button type="button" className={primaryBtn} onClick={approve} disabled={busy || !!preview.error}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve & grant access</button>
        </div>
    ) : mode === 'reject' && pending ? (
        <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setMode('view')} disabled={busy}>Back</button>
            <button type="button" className={dangerBtn} onClick={reject} disabled={busy || !reason.trim()}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Reject request</button>
        </div>
    ) : pending ? (
        <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setMode('reject')}><X className="w-4 h-4" /> Reject</button>
            <button type="button" className={primaryBtn} onClick={() => setMode('approve')}><Check className="w-4 h-4" /> Approve</button>
        </div>
    ) : null;

    const title = mode === 'approve' && pending ? 'Approve request' : mode === 'reject' && pending ? 'Reject request' : 'Request details';

    return (
        <Modal open onClose={busy ? () => undefined : onClose} size="lg" title={title} description={r ? `${r.reference} · ${r.student_name}` : undefined} footer={footer}>
            {error ? <ErrorBox message={error} onRetry={load} /> : !r ? <LoadingRows rows={4} /> : (
                <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <StudentCell name={r.student_name} email={r.student_email} code={r.student_code} />
                        <RequestStatusBadge status={r.status} />
                    </div>
                    <dl>
                        <DetailRow label="Requested">{RESOURCE_LABEL[r.product_type]} · {r.product_name}</DetailRow>
                        <DetailRow label="Request date">{fmtDateTime(r.created_at)}</DetailRow>
                        {r.student_phone && <DetailRow label="Phone">{r.student_phone}</DetailRow>}
                        {r.reviewed_at && <DetailRow label="Reviewed">{fmtDateTime(r.reviewed_at)}</DetailRow>}
                        {r.cancelled_at && <DetailRow label="Cancelled">{fmtDateTime(r.cancelled_at)}</DetailRow>}
                        {(r.admin_response || r.rejection_reason) && <DetailRow label="Response to student">{r.admin_response || r.rejection_reason}</DetailRow>}
                        {r.admin_notes && <DetailRow label="Admin notes">{r.admin_notes}</DetailRow>}
                    </dl>
                    {r.notes && (
                        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                            <p className="text-[11px] uppercase tracking-wide text-blue-500 mb-1">Student’s reason</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{r.notes}</p>
                        </div>
                    )}
                    {pending && data?.currentAccess?.hasAccess && (
                        <p className="text-sm p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300" role="status">
                            The student already has access {data.currentAccess.until ? `until ${fmtDate(data.currentAccess.until)}` : 'permanently'} through {data.currentAccess.via}.
                            {data.currentAccess.until ? ' Approve with a longer duration, or reject.' : ' Reject this request instead.'}
                        </p>
                    )}
                    {pending && data?.currentAccess === null && (
                        <p className="text-sm p-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300" role="status">This resource is no longer active, so it can’t be approved. Reject the request with a reason.</p>
                    )}

                    {mode === 'approve' && pending && (
                        <div className="space-y-4 pt-1">
                            <div>
                                <p className={labelCls}>Access duration</p>
                                <DurationPicker value={draft} onChange={setDraft} disabled={busy} />
                            </div>
                            <label className="block">
                                <span className={labelCls}>Response to the student <span className="font-normal text-gray-400">(optional)</span></span>
                                <textarea className={`${inputCls} resize-none`} rows={2} maxLength={1000} value={response} onChange={e => setResponse(e.target.value)} disabled={busy} />
                            </label>
                            <label className="block">
                                <span className={labelCls}>Internal admin notes <span className="font-normal text-gray-400">(never shown to the student)</span></span>
                                <textarea className={`${inputCls} resize-none`} rows={2} maxLength={1000} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} disabled={busy} />
                            </label>
                        </div>
                    )}
                    {mode === 'reject' && pending && (
                        <div className="space-y-4 pt-1">
                            <label className="block">
                                <span className={labelCls}>Rejection reason <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(shown to the student)</span></span>
                                <textarea className={`${inputCls} resize-none`} rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} autoFocus aria-required="true" />
                            </label>
                            <label className="block">
                                <span className={labelCls}>Internal admin notes <span className="font-normal text-gray-400">(optional)</span></span>
                                <textarea className={`${inputCls} resize-none`} rows={2} maxLength={1000} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} disabled={busy} />
                            </label>
                        </div>
                    )}

                    {data?.enrollment && (
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Resulting enrollment</h4>
                            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm">
                                <span>{accessEndLabel(data.enrollment.expires_at)}</span>
                                <EnrollmentStatusBadge status={data.enrollment.effective_status} />
                            </div>
                        </div>
                    )}
                    {mode === 'view' && (
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">History</h4>
                            <AuditTrail entries={data!.auditTrail} />
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}

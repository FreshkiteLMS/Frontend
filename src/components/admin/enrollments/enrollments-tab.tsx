"use client";

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, CalendarClock, Eye, Loader2, Search } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { enrollmentAdminApi, apiErrorMessage } from '@/services/api/enrollment-management.api';
import type { AccessSource, AdminEnrollment, AuditLogEntry, EnrollmentStatus, PageMeta, ResourceType } from '@/types/enrollment';
import { accessEndLabel, defaultDraft, draftToDuration, fmtDate, fmtDateTime, type DurationDraft } from '@/lib/access-window';
import {
    DetailRow, DurationPicker, EmptyBox, EnrollmentStatusBadge, ErrorBox, LoadingRows, Pagination, RESOURCE_LABEL, ResourceIcon,
    SOURCE_LABEL, StudentCell, cardCls, dangerBtn, inputCls, labelCls, primaryBtn, secondaryBtn, th,
} from './shared';
import { AuditTrail } from './audit-log-tab';

const STATUSES: (EnrollmentStatus | '')[] = ['', 'ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED', 'CANCELLED'];
const STATUS_LABEL: Record<string, string> = { '': 'All statuses', ACTIVE: 'Active', PENDING: 'Scheduled', EXPIRED: 'Expired', REVOKED: 'Revoked', CANCELLED: 'Cancelled' };

export function EnrollmentsTab({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
    const [rows, setRows] = useState<AdminEnrollment[]>([]);
    const [meta, setMeta] = useState<PageMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<{ status: EnrollmentStatus | ''; resourceType: ResourceType | ''; accessSource: AccessSource | ''; q: string }>({ status: '', resourceType: '', accessSource: '', q: '' });
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await enrollmentAdminApi.list({ ...filters, page, limit: 15 });
            setRows(r.rows);
            setMeta(r.meta);
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load enrollments'));
        } finally {
            setLoading(false);
        }
    }, [filters, page]);
    useEffect(() => { load(); }, [load, refreshKey]);

    const setFilter = <K extends keyof typeof filters>(k: K, v: (typeof filters)[K]) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

    return (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
                <form className="relative flex-1" onSubmit={e => { e.preventDefault(); setFilter('q', search.trim()); }}>
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, email, course or admin… (Enter)" aria-label="Search enrollments" className={`${inputCls} pl-9`} />
                </form>
                <div className="grid grid-cols-3 gap-2 lg:w-[34rem]">
                    <select aria-label="Status" className={inputCls} value={filters.status} onChange={e => setFilter('status', e.target.value as EnrollmentStatus | '')}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <select aria-label="Access type" className={inputCls} value={filters.resourceType} onChange={e => setFilter('resourceType', e.target.value as ResourceType | '')}>
                        <option value="">All types</option>
                        {(Object.keys(RESOURCE_LABEL) as ResourceType[]).map(t => <option key={t} value={t}>{RESOURCE_LABEL[t]}</option>)}
                    </select>
                    <select aria-label="Source" className={inputCls} value={filters.accessSource} onChange={e => setFilter('accessSource', e.target.value as AccessSource | '')}>
                        <option value="">All sources</option>
                        {(['ADMIN_GRANT', 'STUDENT_REQUEST', 'PROMOTIONAL'] as AccessSource[]).map(s => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
                    </select>
                </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin-granted and request-approved access. Razorpay purchases keep working as before and are not listed here.</p>

            {loading && !rows.length ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={load} /> : rows.length === 0 ? (
                <EmptyBox title="No enrollments found" hint={filters.q || filters.status || filters.resourceType || filters.accessSource ? 'Try different filters.' : 'Grant access to a student to see it here.'} />
            ) : (
                <div className={`${cardCls} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>{['Student', 'Access', 'Source', 'Granted by', 'Start', 'Expiry', 'Status'].map(h => th(h))}<th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
                            </thead>
                            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 ${loading ? 'opacity-60' : ''}`}>
                                {rows.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                        <td className="px-4 py-3 max-w-[16rem]"><StudentCell name={e.student_name} email={e.student_email} code={e.student_code} /></td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-gray-900 dark:text-white"><ResourceIcon type={e.resource_type} className="w-4 h-4 text-gray-400" /> {e.resource_name}</span>
                                            <span className="block text-[11px] uppercase tracking-wide text-gray-400 mt-0.5">{RESOURCE_LABEL[e.resource_type]}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{SOURCE_LABEL[e.access_source]}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{e.granted_by_name || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(e.starts_at)}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{e.expires_at ? fmtDate(e.expires_at) : 'Lifetime'}</td>
                                        <td className="px-4 py-3"><EnrollmentStatusBadge status={e.effective_status} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <button type="button" onClick={() => setOpenId(e.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={`View enrollment for ${e.student_name}`}>
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={meta} onPage={setPage} />
                </div>
            )}

            {openId && <EnrollmentDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => { load(); onChanged(); }} />}
        </div>
    );
}

/** Presets count from the current start — or from now once the enrollment has expired. */
const baseStartOf = (e: AdminEnrollment): Date | undefined => (e.effective_status === 'EXPIRED' ? undefined : new Date(e.starts_at));

/** Enrollment details + extend/edit + revoke. Also used from the overview table. */
export function EnrollmentDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
    const [data, setData] = useState<{ enrollment: AdminEnrollment; auditTrail: AuditLogEntry[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'view' | 'extend' | 'revoke'>('view');
    const [draft, setDraft] = useState<DurationDraft>(defaultDraft('3_MONTHS'));
    const [notes, setNotes] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        try {
            const d = await enrollmentAdminApi.get(id);
            setData(d);
            setNotes(d.enrollment.admin_notes || '');
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load this enrollment'));
        }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const e = data?.enrollment;
    const live = e && (e.status === 'ACTIVE' || e.status === 'PENDING');
    const editable = e && e.status !== 'REVOKED' && e.status !== 'CANCELLED';

    const saveWindow = async () => {
        if (!e) return;
        const base = baseStartOf(e);
        const preview = draftToDuration(draft, new Date(), base);
        if (preview.error || !preview.duration) { toast.error(preview.error || 'Invalid dates'); return; }
        setBusy(true);
        try {
            const adminNotes = notes.trim() || null;
            const newStart = draft.startDate ? { startsAt: preview.startsAt.toISOString() } : {};
            const body = draft.preset === 'CUSTOM' || draft.preset === 'LIFETIME'
                ? { expiresAt: preview.expiresAt ? preview.expiresAt.toISOString() : null, ...newStart, adminNotes }
                // Presets count from the current start (server default) — or from now once expired.
                : { duration: { preset: draft.preset, ...(draft.startDate ? newStart : base ? {} : { startsAt: new Date().toISOString() }) }, adminNotes };
            await enrollmentAdminApi.update(e.id, body);
            toast.success('Enrollment updated');
            setMode('view');
            await load();
            onChanged();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not update the enrollment'));
        } finally {
            setBusy(false);
        }
    };

    const revoke = async () => {
        if (!e) return;
        setBusy(true);
        try {
            await enrollmentAdminApi.revoke(e.id, reason.trim());
            toast.success('Access revoked');
            setMode('view');
            await load();
            onChanged();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not revoke access'));
        } finally {
            setBusy(false);
        }
    };

    const footer = !e ? null : mode === 'extend' ? (
        <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setMode('view')} disabled={busy}>Cancel</button>
            <button type="button" className={primaryBtn} onClick={saveWindow} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Save changes</button>
        </div>
    ) : mode === 'revoke' ? (
        <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setMode('view')} disabled={busy}>Cancel</button>
            <button type="button" className={dangerBtn} onClick={revoke} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Revoke access</button>
        </div>
    ) : (
        <div className="flex justify-end gap-2">
            {editable && <button type="button" className={secondaryBtn} onClick={() => setMode('extend')}><CalendarClock className="w-4 h-4" /> {e.effective_status === 'EXPIRED' ? 'Reactivate' : 'Extend / edit'}</button>}
            {live && <button type="button" className={`${secondaryBtn} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`} onClick={() => setMode('revoke')}><Ban className="w-4 h-4" /> Revoke</button>}
        </div>
    );

    return (
        <Modal open onClose={busy ? () => undefined : onClose} size="lg" title="Enrollment details" description={e ? `${e.student_name} · ${e.resource_name}` : undefined} footer={footer}>
            {error ? <ErrorBox message={error} onRetry={load} /> : !e ? <LoadingRows rows={4} /> : mode === 'extend' ? (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Currently {accessEndLabel(e.expires_at).toLowerCase()}. Pick the new window — presets count from the current start date{e.effective_status === 'EXPIRED' ? ' (today, since it has expired)' : ''}.</p>
                    <DurationPicker value={draft} onChange={setDraft} baseStart={baseStartOf(e)} />
                    <label className="block">
                        <span className={labelCls}>Admin notes (internal)</span>
                        <textarea className={`${inputCls} resize-none`} rows={2} maxLength={1000} value={notes} onChange={ev => setNotes(ev.target.value)} />
                    </label>
                </div>
            ) : mode === 'revoke' ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        {e.student_name} loses access to <strong>{e.resource_name}</strong> immediately. The record and its history are kept, and the student is notified.
                    </p>
                    <label className="block">
                        <span className={labelCls}>Reason <span className="font-normal text-gray-400">(shown to the student)</span></span>
                        <textarea className={`${inputCls} resize-none`} rows={3} maxLength={1000} value={reason} onChange={ev => setReason(ev.target.value)} />
                    </label>
                </div>
            ) : (
                <div className="space-y-5">
                    <dl>
                        <DetailRow label="Status"><EnrollmentStatusBadge status={e.effective_status} /></DetailRow>
                        <DetailRow label="Student">{e.student_name}{e.student_code ? ` · ${e.student_code}` : ''}</DetailRow>
                        <DetailRow label="Email">{e.student_email}</DetailRow>
                        <DetailRow label="Access">{RESOURCE_LABEL[e.resource_type]} · {e.resource_name}</DetailRow>
                        <DetailRow label="Source">{SOURCE_LABEL[e.access_source]}</DetailRow>
                        <DetailRow label="Start">{fmtDateTime(e.starts_at)}</DetailRow>
                        <DetailRow label="Expiry">{e.expires_at ? fmtDateTime(e.expires_at) : 'Lifetime'}</DetailRow>
                        <DetailRow label="Granted by">{e.granted_by_name || '—'}</DetailRow>
                        <DetailRow label="Created">{fmtDateTime(e.created_at)}</DetailRow>
                        {e.request_id && <DetailRow label="From request">{`AR-${e.request_id.replace(/-/g, '').slice(0, 8).toUpperCase()}`}</DetailRow>}
                        {e.grant_reason && <DetailRow label="Reason">{e.grant_reason}</DetailRow>}
                        {e.internal_reference && <DetailRow label="Reference">{e.internal_reference}</DetailRow>}
                        {e.admin_notes && <DetailRow label="Admin notes">{e.admin_notes}</DetailRow>}
                        {e.revoked_at && <DetailRow label="Revoked">{`${fmtDateTime(e.revoked_at)}${e.revoke_reason ? ` — ${e.revoke_reason}` : ''}`}</DetailRow>}
                    </dl>
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">History</h4>
                        <AuditTrail entries={data!.auditTrail} />
                    </div>
                </div>
            )}
        </Modal>
    );
}

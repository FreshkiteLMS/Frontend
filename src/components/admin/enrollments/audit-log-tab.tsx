"use client";

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { enrollmentAdminApi, apiErrorMessage } from '@/services/api/enrollment-management.api';
import type { AuditAction, AuditLogEntry, PageMeta } from '@/types/enrollment';
import { fmtDateTime } from '@/lib/access-window';
import { EmptyBox, ErrorBox, LoadingRows, Pagination, cardCls, inputCls, th } from './shared';

export const ACTION_LABEL: Record<AuditAction, string> = {
    ACCESS_GRANTED: 'Access granted',
    SUBSCRIPTION_ACTIVATED: 'Subscription activated',
    REQUEST_SUBMITTED: 'Request submitted',
    REQUEST_CANCELLED: 'Request cancelled',
    REQUEST_APPROVED: 'Request approved',
    REQUEST_REJECTED: 'Request rejected',
    ACCESS_REVOKED: 'Access revoked',
    ACCESS_EXTENDED: 'Access extended',
    ACCESS_UPDATED: 'Enrollment edited',
    ACCESS_STARTED: 'Scheduled access started',
    ACCESS_EXPIRED: 'Access expired',
    SUBSCRIPTION_EXPIRED: 'Subscription expired',
};

const ACTION_DOT: Partial<Record<AuditAction, string>> = {
    ACCESS_GRANTED: 'bg-emerald-500', SUBSCRIPTION_ACTIVATED: 'bg-emerald-500', REQUEST_APPROVED: 'bg-emerald-500', ACCESS_STARTED: 'bg-emerald-500',
    ACCESS_EXTENDED: 'bg-blue-500', ACCESS_UPDATED: 'bg-blue-500', REQUEST_SUBMITTED: 'bg-blue-500',
    ACCESS_REVOKED: 'bg-red-500', REQUEST_REJECTED: 'bg-red-500',
    ACCESS_EXPIRED: 'bg-amber-500', SUBSCRIPTION_EXPIRED: 'bg-amber-500', REQUEST_CANCELLED: 'bg-gray-400',
};

/** Compact timeline for one enrollment / request. */
export function AuditTrail({ entries }: { entries: AuditLogEntry[] }) {
    if (!entries.length) return <p className="text-sm text-gray-500">No history recorded.</p>;
    return (
        <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-1.5 space-y-3">
            {entries.map(a => (
                <li key={a.id} className="ml-4">
                    <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ${ACTION_DOT[a.action] ?? 'bg-gray-400'}`} aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{ACTION_LABEL[a.action] ?? a.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {fmtDateTime(a.created_at)} · {a.actor_name || a.actor_role}{a.actor_role === 'system' ? '' : ` (${a.actor_role})`}
                        {a.previous_status || a.new_status ? ` · ${a.previous_status ?? '—'} → ${a.new_status ?? '—'}` : ''}
                    </p>
                    {a.notes && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">“{a.notes}”</p>}
                </li>
            ))}
        </ol>
    );
}

export function AuditLogTab({ refreshKey }: { refreshKey: number }) {
    const [rows, setRows] = useState<AuditLogEntry[]>([]);
    const [meta, setMeta] = useState<PageMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState('');
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await enrollmentAdminApi.auditLogs({ action: action || undefined, q: q || undefined, page, limit: 20 });
            setRows(r.rows);
            setMeta(r.meta);
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load the audit log'));
        } finally {
            setLoading(false);
        }
    }, [action, q, page]);
    useEffect(() => { load(); }, [load, refreshKey]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                <form className="relative flex-1" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(1); }}>
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, course or admin… (Enter)" aria-label="Search audit log" className={`${inputCls} pl-9`} />
                </form>
                <select aria-label="Action" className={`${inputCls} sm:w-60`} value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
                    <option value="">All actions</option>
                    {(Object.keys(ACTION_LABEL) as AuditAction[]).map(a => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
                </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">The audit log is append-only: entries can’t be edited or deleted.</p>

            {loading && !rows.length ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={load} /> : rows.length === 0 ? (
                <EmptyBox title="No audit entries" hint={q || action ? 'Try different filters.' : undefined} />
            ) : (
                <div className={`${cardCls} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>{['When', 'Action', 'Student', 'Resource', 'Status change', 'By', 'Notes'].map(h => th(h))}</tr>
                            </thead>
                            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 ${loading ? 'opacity-60' : ''}`}>
                                {rows.map(a => (
                                    <tr key={a.id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmtDateTime(a.created_at)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">{ACTION_LABEL[a.action] ?? a.action}</td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.student_name || '—'}</td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.resource_name || '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{a.previous_status || a.new_status ? `${a.previous_status ?? '—'} → ${a.new_status ?? '—'}` : '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{a.actor_name || a.actor_role}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={a.notes || undefined}>{a.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={meta} onPage={setPage} />
                </div>
            )}
        </div>
    );
}

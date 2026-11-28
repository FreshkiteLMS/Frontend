"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCog, UserPlus } from 'lucide-react';
import { mentorAdminService } from '@/services/api/mentor.api';
import {
    Avatar, Breadcrumbs, Empty, ErrorState, Figure, Panel, Pill, SkeletonBlock, btnPrimary, btnSecondary, fmtDate, fmtRelative, inputCls, useAsync,
} from '@/components/admin/insights/ui';

/** Mentor Management list (administrators only; the API refuses everyone else). */
export function MentorManagement() {
    const [q, setQ] = useState('');
    const [dq, setDq] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
    const list = useAsync(() => mentorAdminService.list({ q: dq || undefined, status: status || undefined, page, limit: 20 }), `mentors:${dq}:${status}:${page}`);
    const d = list.data;
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Mentors' }]} />
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mentor Management</h1>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Mentor accounts, the batches they look after and exactly what each one may do.</p>
                </div>
                <Link href="/admin/mentors/new" className={btnPrimary}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add mentor</Link>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: 'Total mentors', value: d?.stats.total },
                    { label: 'Active', value: d?.stats.active },
                    { label: 'Inactive', value: d?.stats.inactive },
                    { label: 'Batches with mentors', value: d?.stats.assignedBatches },
                ].map(c => <div key={c.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"><Figure label={c.label} value={c.value ?? '—'} /></div>)}
            </div>
            <Panel>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                    <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email or mentor ID" aria-label="Search mentors" className={`${inputCls} w-full sm:max-w-sm`} />
                    <select aria-label="Status" className={inputCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                        <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                </div>
                {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !d ? <SkeletonBlock rows={5} /> : d.rows.length === 0 ? (
                    <Empty icon={<UserCog className="h-10 w-10" />} title={dq || status ? 'No mentors match' : 'No mentors yet'}>{!dq && !status ? 'Add a mentor and choose the batches and permissions they get.' : null}</Empty>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-3 py-3">Mentor</th><th className="px-3 py-3">Access</th><th className="px-3 py-3">Batches</th>
                                    <th className="px-3 py-3">Status</th><th className="px-3 py-3">Last active</th><th className="px-3 py-3">Added</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                {d.rows.map(m => (
                                    <tr key={m.id} className="align-top hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={m.name} url={m.avatarUrl} size={32} />
                                                <div className="min-w-0">
                                                    <Link href={`/admin/mentors/${m.id}`} className="block truncate font-medium text-gray-900 dark:text-white hover:underline">{m.name}</Link>
                                                    <span className="block truncate text-xs text-gray-500">{m.email} · <span className="font-mono">{m.mentorCode}</span></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            {m.fullAdmin ? <Pill tone="danger">Full administrative</Pill> : <span className="text-gray-700 dark:text-gray-300">{m.permissionCount} permission{m.permissionCount === 1 ? '' : 's'}</span>}
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {!m.fullAdmin && m.batchScope === 'all' && <Pill tone="info">All batches</Pill>}
                                                {!m.fullAdmin && m.studentScope === 'all' && <Pill tone="info">All students</Pill>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 max-w-[220px] text-gray-700 dark:text-gray-300">{m.batches.length ? m.batches.map(b => b.name).join(', ') : <span className="text-gray-400">None</span>}</td>
                                        <td className="px-3 py-3"><Pill tone={m.status === 'active' ? 'active' : 'inactive'}>{m.status === 'active' ? 'Active' : 'Inactive'}</Pill></td>
                                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{fmtRelative(m.lastActiveAt)}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{fmtDate(m.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {d && d.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Page {d.page} of {d.totalPages}</span>
                        <div className="flex gap-2">
                            <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                            <button type="button" className={btnSecondary} disabled={page >= d.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                        </div>
                    </div>
                )}
            </Panel>
        </div>
    );
}

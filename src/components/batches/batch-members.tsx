"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, History, Pause, Play, UserMinus, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api/axios';
import { batchAdminService } from '@/services/api/batch-admin.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { useStaffAccess } from '@/hooks/use-staff-access';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AddStudentsModal } from '@/components/admin/students/student-directory';
import {
    Avatar, Empty, ErrorState, Panel, Pill, ProgressBar, SkeletonBlock, StudentCode, btnPrimary, btnSecondary, fmtDate, fmtDateTime, fmtRelative, inputCls, useAsync,
} from '@/components/admin/insights/ui';
import { MEMBERSHIP_LABEL, SOURCE_LABEL, type MemberRow, type MembershipStatus } from '@/types/batch-admin';

const STATUS_TONE: Record<MembershipStatus, string> = { active: 'active', disabled: 'inactive', removed: 'neutral' };
const EVENT_TEXT: Record<string, string> = {
    joined: 'Joined', added: 'Added', disabled: 'Disabled', enabled: 'Enabled again', removed: 'Removed',
    transferred_in: 'Transferred in', transferred_out: 'Transferred out', rejoined: 'Joined again',
};

/**
 * Members tab: membership state (active / disabled / removed), how each
 * student joined, batch-course progress, and the membership actions.
 * Disabling keeps the membership but ends the access this batch gives;
 * removing ends it (history is kept). Other access sources are never touched.
 */
export function BatchMembers({ batchId, batchName, onChanged }: { batchId: string; batchName: string; onChanged: () => void }) {
    const access = useStaffAccess();
    const canManage = access.can('batches.manage_students');
    const [status, setStatus] = useState<'current' | MembershipStatus | 'all'>('current');
    const [q, setQ] = useState('');
    const [dq, setDq] = useState('');
    const [page, setPage] = useState(1);
    const [adding, setAdding] = useState(false);
    const [action, setAction] = useState<{ kind: 'disable' | 'remove'; row: MemberRow } | null>(null);
    const [reason, setReason] = useState('');
    const [transfer, setTransfer] = useState<MemberRow | null>(null);
    const [history, setHistory] = useState<MemberRow | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
    const list = useAsync(() => batchAdminService.members(batchId, { status, q: dq || undefined, page, limit: 25 }), `members:${batchId}:${status}:${dq}:${page}`);
    const d = list.data;
    const refresh = () => { list.reload(); onChanged(); };

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try { await fn(); toast.success(ok); refresh(); return true; } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); return false; } finally { setBusy(false); }
    };

    const confirmAction = async () => {
        if (!action) return;
        const done = action.kind === 'disable'
            ? await run(() => batchAdminService.disable(batchId, action.row.userId, reason.trim() || undefined), `${action.row.name} is disabled in this batch`)
            : await run(() => batchAdminService.remove(batchId, action.row.userId, reason.trim() || undefined), `${action.row.name} was removed from ${batchName}`);
        if (done) { setAction(null); setReason(''); }
    };

    const filters: Array<{ id: typeof status; label: string; count?: number }> = [
        { id: 'current', label: 'Current', count: d ? d.counts.active + d.counts.disabled : undefined },
        { id: 'active', label: 'Active', count: d?.counts.active },
        { id: 'disabled', label: 'Disabled', count: d?.counts.disabled },
        { id: 'removed', label: 'Removed', count: d?.counts.removed },
    ];

    return (
        <Panel title="Members" subtitle="Who belongs to this batch, how they joined, and their progress in this batch’s courses."
            actions={canManage ? <button type="button" className={btnPrimary} onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add students</button> : undefined}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search members by name, email or Student ID" aria-label="Search members" className={`${inputCls} w-full md:max-w-sm`} />
                <div role="tablist" aria-label="Membership status" className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                    {filters.map(f => (
                        <button key={f.id} type="button" role="tab" aria-selected={status === f.id} onClick={() => { setStatus(f.id); setPage(1); }}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === f.id ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}`}>
                            {f.label}{typeof f.count === 'number' ? ` · ${f.count}` : ''}
                        </button>
                    ))}
                </div>
            </div>

            {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !d ? <SkeletonBlock rows={5} /> : d.rows.length === 0 ? (
                <Empty icon={<Users className="h-10 w-10" />} title={dq ? 'No members match' : status === 'current' ? 'No members yet' : `No ${status} members`}>
                    {status === 'current' && !dq ? 'Add students, or share the invitation link from the Joining tab.' : null}
                </Empty>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="px-3 py-3">Student</th>
                                <th className="px-3 py-3">Membership</th>
                                <th className="px-3 py-3">Joined</th>
                                <th className="px-3 py-3">Course access</th>
                                <th className="px-3 py-3">Batch progress</th>
                                <th className="px-3 py-3">Last active</th>
                                <th className="px-3 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                            {d.rows.map(r => (
                                <tr key={r.userId} className="align-top">
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={r.name} url={r.avatarUrl} size={32} />
                                            <div className="min-w-0">
                                                {access.can('students.view_profile')
                                                    ? <Link href={`/admin/students/${encodeURIComponent(r.userId)}?batch=${encodeURIComponent(batchId)}`} className="block truncate font-medium text-gray-900 dark:text-white hover:underline">{r.name}</Link>
                                                    : <span className="block truncate font-medium text-gray-900 dark:text-white">{r.name}</span>}
                                                <span className="block truncate text-xs text-gray-500">{r.email}</span>
                                                <StudentCode code={r.studentCode} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <Pill tone={STATUS_TONE[r.status]}>{MEMBERSHIP_LABEL[r.status]}</Pill>
                                        <div className="mt-1 text-xs text-gray-500">{SOURCE_LABEL[r.source]}</div>
                                        {r.reason && <div className="mt-1 max-w-[180px] text-xs text-gray-500" title={r.reason}>“{r.reason.slice(0, 60)}”</div>}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{fmtDate(r.joinedAt)}</td>
                                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{r.batchCourses.accessible} of {r.batchCourses.total}</td>
                                    <td className="px-3 py-3 w-40">
                                        {r.batchCourses.averageProgress === null ? <span className="text-gray-400">—</span> : (
                                            <>
                                                <ProgressBar value={r.batchCourses.averageProgress} label={`Progress ${r.batchCourses.averageProgress}%`} />
                                                <span className="mt-1 block text-xs text-gray-500">{r.batchCourses.averageProgress}% · {r.batchCourses.completed} completed</span>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{fmtRelative(r.lastActiveAt)}</td>
                                    <td className="px-3 py-3">
                                        <div className="flex justify-end gap-1">
                                            <IconBtn label="Membership history" onClick={() => setHistory(r)}><History className="h-4 w-4" /></IconBtn>
                                            {canManage && r.status === 'active' && <IconBtn label="Disable membership" onClick={() => { setReason(''); setAction({ kind: 'disable', row: r }); }}><Pause className="h-4 w-4" /></IconBtn>}
                                            {canManage && r.status === 'disabled' && <IconBtn label="Enable membership" disabled={busy} onClick={() => run(() => batchAdminService.enable(batchId, r.userId), `${r.name} is active again`)}><Play className="h-4 w-4" /></IconBtn>}
                                            {canManage && r.status === 'removed' && <IconBtn label="Add back" disabled={busy} onClick={() => run(() => batchAdminService.addMembers(batchId, [r.userId]), `${r.name} was added back`)}><UserPlus className="h-4 w-4" /></IconBtn>}
                                            {canManage && r.status !== 'removed' && <IconBtn label="Transfer to another batch" onClick={() => setTransfer(r)}><ArrowRightLeft className="h-4 w-4" /></IconBtn>}
                                            {canManage && r.status !== 'removed' && <IconBtn label="Remove from batch" danger onClick={() => { setReason(''); setAction({ kind: 'remove', row: r }); }}><UserMinus className="h-4 w-4" /></IconBtn>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {d && d.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Page {d.page} of {d.totalPages} · {d.total} students</span>
                    <div className="flex gap-2">
                        <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                        <button type="button" className={btnSecondary} disabled={page >= d.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                    </div>
                </div>
            )}

            <AddStudentsModal open={adding} batchId={batchId} batchName={batchName} onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />

            <ConfirmDialog open={!!action} busy={busy}
                title={action?.kind === 'disable' ? `Disable ${action?.row.name}?` : `Remove ${action?.row.name} from ${batchName}?`}
                message={<>
                    <p>{action?.kind === 'disable'
                        ? 'They stay listed as a disabled member and lose the course access this batch gives until you enable them again.'
                        : 'They leave the batch and lose the course access it gives. Their progress, history and other batches are kept.'}
                    </p>
                    <p className="mt-2">Courses they bought or hold through a bundle, subscription, admin grant or another batch stay open.</p>
                    <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">Reason (optional)
                        <input className={`${inputCls} mt-1 w-full`} value={reason} maxLength={300} onChange={e => setReason(e.target.value)} />
                    </label>
                </>}
                confirmLabel={action?.kind === 'disable' ? 'Disable' : 'Remove'} onConfirm={confirmAction} onCancel={() => setAction(null)} />

            {transfer && <TransferModal batchId={batchId} row={transfer} onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); refresh(); }} />}
            {history && <HistoryModal batchId={batchId} row={history} onClose={() => setHistory(null)} />}
        </Panel>
    );
}

function IconBtn({ label, onClick, children, danger, disabled }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
    return (
        <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}
            className={`rounded-lg p-2 disabled:opacity-50 ${danger ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white'}`}>
            {children}
        </button>
    );
}

function TransferModal({ batchId, row, onClose, onDone }: { batchId: string; row: MemberRow; onClose: () => void; onDone: () => void }) {
    const [target, setTarget] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    // Batches in the caller's scope (the API limits this list for mentors).
    const batches = useAsync(() => api.get('/admin/batches', { params: { limit: 100, sort: 'name', dir: 'asc' } }).then(r => r.data.data as { id: string; name: string; lifecycle?: string }[]), 'transfer-targets');
    const options = (batches.data ?? []).filter(b => b.id !== batchId && b.lifecycle !== 'archived');
    const submit = async () => {
        setBusy(true);
        try {
            const r = await batchAdminService.transfer(batchId, row.userId, target, reason.trim() || undefined);
            toast.success(`${row.name} moved to ${r.to.name}`);
            onDone();
        } catch (err) { toast.error(apiErrorMessage(err, 'The transfer did not go through')); } finally { setBusy(false); }
    };
    return (
        <Modal open onClose={onClose} title={`Transfer ${row.name}`} size="sm"
            footer={<div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} disabled={!target || busy} onClick={submit}>{busy ? 'Moving…' : 'Transfer'}</button></div>}>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Move to
                <select className={`${inputCls} mt-1 w-full`} value={target} onChange={e => setTarget(e.target.value)}>
                    <option value="">Choose a batch…</option>
                    {options.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </label>
            <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">Reason (optional)
                <input className={`${inputCls} mt-1 w-full`} value={reason} maxLength={300} onChange={e => setReason(e.target.value)} />
            </label>
            <p className="mt-3 text-xs text-gray-500">Course access is recalculated: courses the new batch also has stay open, the rest of this batch’s courses close unless the student holds them another way. Progress is kept.</p>
        </Modal>
    );
}

function HistoryModal({ batchId, row, onClose }: { batchId: string; row: MemberRow; onClose: () => void }) {
    const h = useAsync(() => batchAdminService.history(batchId, row.userId), `hist:${batchId}:${row.userId}`);
    return (
        <Modal open onClose={onClose} title={`Membership history · ${row.name}`} size="sm">
            {h.error ? <ErrorState error={h.error} onRetry={h.reload} /> : !h.data ? <SkeletonBlock rows={3} /> : h.data.history.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">This student joined before membership history was recorded. No changes since.</p>
            ) : (
                <ol className="space-y-3">
                    {h.data.history.map((e, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                                <span className="font-medium text-gray-900 dark:text-white">{EVENT_TEXT[e.action] ?? e.action}</span>
                                {e.note && <span className="text-gray-600 dark:text-gray-400"> — {e.note}</span>}
                                <span className="block text-xs text-gray-500">{fmtDateTime(e.at)}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </Modal>
    );
}

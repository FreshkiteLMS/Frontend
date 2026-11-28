"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCog, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { batchAdminService } from '@/services/api/batch-admin.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { useStaffAccess } from '@/hooks/use-staff-access';
import { useAuth } from '@/hooks/use-auth';
import { DataNote, Empty, ErrorState, Panel, Pill, SkeletonBlock, btnPrimary, btnSecondary, inputCls, useAsync } from '@/components/admin/insights/ui';

/**
 * Mentors explicitly assigned to the batch. Assigning gives the mentor this
 * batch within their own permissions (what they may do is set per mentor in
 * Mentor Management). A mentor managing this tab cannot change their own
 * assignment — the API refuses it.
 */
export function BatchMentors({ batchId }: { batchId: string }) {
    const access = useStaffAccess();
    const { user } = useAuth();
    const canEdit = access.can('batches.assign_mentors');
    const current = useAsync(() => batchAdminService.mentors(batchId), `bm:${batchId}`);
    const [q, setQ] = useState('');
    const [dq, setDq] = useState('');
    const options = useAsync(() => batchAdminService.mentorOptions(batchId, dq), `bmo:${batchId}:${dq}`, canEdit);
    const [selected, setSelected] = useState<{ id: string; name: string; mentorCode: string }[]>([]);
    const [busy, setBusy] = useState(false);
    useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(t); }, [q]);
    useEffect(() => { if (current.data) setSelected(current.data.mentors.map(m => ({ id: m.id, name: m.name, mentorCode: m.mentorCode }))); }, [current.data]);

    const before = new Set((current.data?.mentors ?? []).map(m => m.id));
    const dirty = selected.length !== before.size || selected.some(m => !before.has(m.id));
    const mine = (current.data?.mentors ?? []).find(m => m.userId === user?.id);

    const save = async () => {
        setBusy(true);
        try {
            await batchAdminService.setMentors(batchId, selected.map(m => m.id));
            toast.success('Mentors saved');
            current.reload();
        } catch (err) { toast.error(apiErrorMessage(err, 'Mentors were not saved')); } finally { setBusy(false); }
    };

    if (current.error) return <ErrorState error={current.error} onRetry={current.reload} />;
    if (!current.data) return <SkeletonBlock rows={3} />;
    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={`Assigned mentors (${selected.length})`} subtitle="They can open this batch and its students, within the permissions set for each mentor.">
                {selected.length === 0 ? <Empty icon={<UserCog className="h-10 w-10" />} title="No mentors assigned" /> : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {selected.map(m => {
                            const info = current.data!.mentors.find(x => x.id === m.id);
                            const self = mine?.id === m.id;
                            return (
                                <li key={m.id} className="flex items-center gap-3 py-2.5">
                                    <span className="min-w-0 flex-1">
                                        {access.isSuperAdmin ? <Link href={`/admin/mentors/${m.id}`} className="block truncate text-sm font-medium text-gray-900 dark:text-white hover:underline">{m.name}</Link>
                                            : <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{m.name}{self ? ' (you)' : ''}</span>}
                                        <span className="block font-mono text-xs text-gray-500">{m.mentorCode}</span>
                                    </span>
                                    {!before.has(m.id) && <Pill tone="info">New</Pill>}
                                    {info?.status === 'inactive' && <Pill tone="inactive">Inactive</Pill>}
                                    {info?.fullAdmin && <Pill tone="danger">Full admin</Pill>}
                                    {canEdit && !self && (
                                        <button type="button" aria-label={`Unassign ${m.name}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800" onClick={() => setSelected(s => s.filter(x => x.id !== m.id))}>
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {current.data.allBatchMentors > 0 && <div className="mt-3"><DataNote>{current.data.allBatchMentors} more mentor{current.data.allBatchMentors === 1 ? ' has' : 's have'} access to every batch (All-Batch or Full Administrative Access).</DataNote></div>}
                {canEdit && (
                    <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <button type="button" className={btnSecondary} disabled={!dirty || busy} onClick={() => setSelected(current.data!.mentors.map(m => ({ id: m.id, name: m.name, mentorCode: m.mentorCode })))}>Undo</button>
                        <button type="button" className={btnPrimary} disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save mentors'}</button>
                    </div>
                )}
            </Panel>
            {canEdit && (
                <Panel title="Assign mentors" subtitle={access.isSuperAdmin ? <>Create mentors and set their permissions in <Link href="/admin/mentors" className="text-blue-600 hover:underline">Mentor Management</Link>.</> : undefined}>
                    <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search mentors by name, email or ID" aria-label="Search mentors" className={`${inputCls} w-full`} />
                    {options.error ? <div className="mt-3"><ErrorState error={options.error} onRetry={options.reload} /></div> : !options.data ? <div className="mt-3"><SkeletonBlock rows={3} /></div> : (
                        <ul className="mt-3 max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                            {options.data.filter(o => !selected.some(s => s.id === o.id)).length === 0 ? <li className="p-4 text-sm text-gray-500">No other active mentors{dq ? ' match' : ''}.</li>
                                : options.data.filter(o => !selected.some(s => s.id === o.id)).map(o => (
                                    <li key={o.id}>
                                        <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40" onClick={() => setSelected(s => [...s, o])}>
                                            <span className="min-w-0 flex-1"><span className="block truncate text-gray-900 dark:text-white">{o.name}</span><span className="block truncate text-xs text-gray-500">{o.email} · {o.mentorCode}</span></span>
                                            <span className="shrink-0 text-xs font-semibold text-blue-600">Assign</span>
                                        </button>
                                    </li>
                                ))}
                        </ul>
                    )}
                </Panel>
            )}
        </div>
    );
}

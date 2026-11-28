"use client";

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { batchAdminService } from '@/services/api/batch-admin.api';
import { courseService } from '@/services/api/course.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { useStaffAccess } from '@/hooks/use-staff-access';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataNote, Empty, ErrorState, Panel, Pill, SkeletonBlock, btnPrimary, btnSecondary, inputCls, useAsync } from '@/components/admin/insights/ui';

/**
 * Courses the batch gives its members. Adding a course opens it to every
 * active member at once; removing one ends only the access this batch gave
 * (a purchase, bundle, subscription, grant or another batch keeps it open).
 * Only active (published) courses can be added.
 */
export function BatchCourses({ batchId, coursesCapability, onChanged }: { batchId: string; coursesCapability: boolean; onChanged: () => void }) {
    const access = useStaffAccess();
    const canEdit = access.can('batches.assign_courses');
    const assigned = useAsync(() => batchAdminService.courses(batchId), `bcourses:${batchId}`);
    const catalog = useAsync(() => courseService.getAllCourses({}), 'bcourses-catalog', canEdit);
    const [selected, setSelected] = useState<string[]>([]);
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(false);
    useEffect(() => { if (assigned.data) setSelected(assigned.data.map(c => c.id)); }, [assigned.data]);

    const titleOf = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of catalog.data ?? []) if (c.id) m.set(c.id, c.title);
        for (const c of assigned.data ?? []) m.set(c.id, c.title);
        return m;
    }, [catalog.data, assigned.data]);
    const before = useMemo(() => new Set((assigned.data ?? []).map(c => c.id)), [assigned.data]);
    const added = selected.filter(id => !before.has(id));
    const removed = Array.from(before).filter(id => !selected.includes(id));
    const dirty = added.length + removed.length > 0;
    const term = q.trim().toLowerCase();
    const options = (catalog.data ?? [])
        .filter(c => c.id && c.status === 'active' && !selected.includes(c.id))
        .filter(c => !term || c.title.toLowerCase().includes(term) || (c.category ?? '').toLowerCase().includes(term))
        .slice(0, 50);

    const save = async () => {
        setBusy(true);
        try {
            const r = await batchAdminService.setCourses(batchId, selected);
            toast.success(`Courses saved${r.added.length ? ` · ${r.added.length} added` : ''}${r.removed.length ? ` · ${r.removed.length} removed` : ''}`);
            setConfirm(false);
            assigned.reload();
            onChanged();
        } catch (err) { toast.error(apiErrorMessage(err, 'Courses were not saved')); } finally { setBusy(false); }
    };

    if (assigned.error) return <ErrorState error={assigned.error} onRetry={assigned.reload} />;
    if (!assigned.data) return <SkeletonBlock rows={4} />;
    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={`Assigned courses (${selected.length})`} subtitle="Every active member can open these from My Courses.">
                {!coursesCapability && <div className="mb-3"><DataNote>Course access is switched off in this batch’s capabilities (Settings). Members get no courses from this batch until it is on.</DataNote></div>}
                {selected.length === 0 ? <Empty icon={<BookOpen className="h-10 w-10" />} title="No courses yet">{canEdit ? 'Search on the right to add courses.' : null}</Empty> : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {selected.map(id => {
                            const meta = assigned.data!.find(c => c.id === id);
                            return (
                                <li key={id} className="flex items-center gap-3 py-2.5">
                                    <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">{titleOf.get(id) ?? 'Course'}</span>
                                    {!before.has(id) && <Pill tone="info">New</Pill>}
                                    {meta && meta.status !== 'active' && <Pill tone="inactive" title="Not published; members cannot open it until it is">{meta.status}</Pill>}
                                    {canEdit && (
                                        <button type="button" aria-label={`Remove ${titleOf.get(id) ?? 'course'}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800" onClick={() => setSelected(s => s.filter(x => x !== id))}>
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {canEdit && (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <span className="text-xs text-gray-500">{dirty ? `${added.length} to add · ${removed.length} to remove` : 'No unsaved changes'}</span>
                        <div className="flex gap-2">
                            <button type="button" className={btnSecondary} disabled={!dirty || busy} onClick={() => setSelected(assigned.data!.map(c => c.id))}>Undo</button>
                            <button type="button" className={btnPrimary} disabled={!dirty || busy} onClick={() => (removed.length ? setConfirm(true) : save())}>{busy ? 'Saving…' : 'Save courses'}</button>
                        </div>
                    </div>
                )}
            </Panel>
            {canEdit && (
                <Panel title="Add courses" subtitle="Only active (published) courses can be added.">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search courses" aria-label="Search courses" className={`${inputCls} w-full pl-9`} />
                    </div>
                    {catalog.error ? <div className="mt-3"><ErrorState error={catalog.error} onRetry={catalog.reload} /></div> : !catalog.data ? <div className="mt-3"><SkeletonBlock rows={3} /></div> : (
                        <ul className="mt-3 max-h-96 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                            {options.length === 0 ? <li className="p-4 text-sm text-gray-500">{term ? 'No matching courses.' : 'Every active course is already assigned.'}</li> : options.map(c => (
                                <li key={c.id}>
                                    <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40" onClick={() => setSelected(s => [...s, c.id!])}>
                                        <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">{c.title}</span>
                                        {c.category && <span className="shrink-0 text-xs text-gray-500">{c.category.replace(/_/g, ' ')}</span>}
                                        <span className="shrink-0 text-xs font-semibold text-blue-600">Add</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}
            <ConfirmDialog open={confirm} busy={busy} title={`Remove ${removed.length} course${removed.length === 1 ? '' : 's'}?`}
                message={<>
                    <p>{removed.map(id => titleOf.get(id) ?? 'Course').join(', ')}</p>
                    <p className="mt-2">Members lose access only if this batch was how they got it. A purchase, bundle, subscription, admin grant or another batch keeps the course open. Progress is never deleted.</p>
                </>}
                confirmLabel="Save and remove" onConfirm={save} onCancel={() => setConfirm(false)} />
        </div>
    );
}

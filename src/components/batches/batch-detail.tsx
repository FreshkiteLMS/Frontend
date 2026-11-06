"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ClipboardCheck, MessageSquare, Plus, Trash2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminInsightsService, httpStatus } from '@/services/api/admin-insights.api';
import { batchService } from '@/services/api/batch.api';
import { courseService } from '@/services/api/course.api';
import { meetingService } from '@/services/api/meeting.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { BatchGroup, BatchOverview, Capabilities } from '@/types/admin-insights';
import { Meeting, MeetingFeed } from '@/types/meeting';
import { MeetingCard } from '@/components/meetings/meeting-card';
import { MeetingForm } from '@/components/meetings/meeting-form';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StudentDirectory } from '@/components/admin/students/student-directory';
import {
    Breadcrumbs, DataNote, EVENT_LABEL, Empty, ErrorState, Figure, Panel, Pill, ProgressBar, SkeletonBlock, TabBar,
    btnPrimary, btnSecondary, fmtDate, fmtDateTime, fmtRelative, inputCls, useAsync, type TabDef,
} from '@/components/admin/insights/ui';
import { BatchAnalyticsView } from './batch-analytics';
import { AttendanceModal } from './attendance-modal';
import { CAPABILITY_INFO, CapabilityEditor, GroupsEditor } from './batch-config';

type Tab = 'overview' | 'students' | 'analytics' | 'meetings' | 'groups' | 'settings';
const TABS: Tab[] = ['overview', 'students', 'analytics', 'meetings', 'groups', 'settings'];

export function BatchDetail({ batchId }: { batchId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const requested = sp.get('tab') as Tab;
    const overview = useAsync(() => adminInsightsService.batchOverview(batchId), `bo:${batchId}`);
    const o = overview.data;
    const meetingsOn = o?.capabilities.meetings ?? true;
    const tab: Tab = TABS.includes(requested) && !(requested === 'meetings' && o && !meetingsOn) ? requested : 'overview';

    const setTab = (t: Tab) => {
        // Directory filters belong to the Students tab; drop them when leaving it.
        const next = new URLSearchParams();
        if (t !== 'overview') next.set('tab', t);
        router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
    };

    const tabs: TabDef<Tab>[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'students', label: 'Students', count: o?.counts.students ?? null },
        { id: 'analytics', label: 'Analytics' },
        { id: 'meetings', label: 'Meetings', hidden: !meetingsOn, count: o?.meetings?.scheduled ?? null },
        { id: 'groups', label: 'Communication groups', count: o?.counts.groups ?? null },
        { id: 'settings', label: 'Settings' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: 'Batches', href: '/admin/batches' }, { label: o?.batch.name ?? 'Batch' }]} />
            {overview.error ? <ErrorState error={overview.error} onRetry={overview.reload} /> : !o ? <SkeletonBlock rows={4} /> : (
                <>
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{o.batch.name}</h1>
                                <Pill tone={o.batch.status === 'active' ? 'active' : 'neutral'}>{o.batch.status}</Pill>
                                {o.batch.batchType && <Pill tone="info">{o.batch.batchType}</Pill>}
                                {!meetingsOn && <Pill tone="neutral">Meetings off</Pill>}
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-mono text-xs">{o.batch.batchNumber}</span>
                                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(o.batch.startDate)}{o.batch.endDate ? ` – ${fmtDate(o.batch.endDate)}` : ''}</span>
                            </p>
                        </div>
                    </div>
                    <TabBar tabs={tabs} active={tab} onChange={setTab} label="Batch sections" />
                    {tab === 'overview' && <OverviewTab o={o} onTab={setTab} />}
                    {tab === 'students' && <StudentDirectory scope={{ batchId, batchName: o.batch.name }} onMembershipChanged={overview.reload} />}
                    {tab === 'analytics' && <BatchAnalyticsView batchId={batchId} />}
                    {tab === 'meetings' && meetingsOn && <MeetingsTab batchId={batchId} onChanged={overview.reload} />}
                    {tab === 'groups' && <GroupsTab o={o} onSaved={overview.reload} />}
                    {tab === 'settings' && <SettingsTab o={o} onSaved={overview.reload} />}
                </>
            )}
        </div>
    );
}

/* ───────────── Overview ───────────── */

function OverviewTab({ o, onTab }: { o: BatchOverview; onTab: (t: Tab) => void }) {
    const caps = o.capabilities;
    return (
        <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
                <Panel title="Condition of the batch">
                    {o.actions.length === 0 ? <p className="text-sm text-gray-600 dark:text-gray-400">Nothing needs action by the current rules.</p> : (
                        <ul className="space-y-1.5 text-sm text-gray-800 dark:text-gray-200">
                            {o.actions.map(a => <li key={a} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />{a}</li>)}
                        </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => onTab('analytics')} className={btnSecondary}>Students needing attention</button>
                        <button type="button" onClick={() => onTab('students')} className={btnSecondary}>Open student list</button>
                    </div>
                </Panel>
                <Panel title="Learning">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Figure label="Students" value={o.counts.students} sub={`${o.counts.active} active · ${o.counts.inactive} inactive (${o.rules.inactiveDays}d)`} />
                        <Figure label="Average progress" value={o.progress.average !== null ? `${Math.round(o.progress.average)}%` : '—'} sub="student-app formula" />
                        <Figure label="Course completion" value={o.progress.averageCourseCompletion !== null ? `${Math.round(o.progress.averageCourseCompletion)}%` : '—'} sub={`${o.progress.studentsCompletedAll} finished every course`} />
                        <Figure label="Courses" value={o.counts.courses} />
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                        {caps.assignments && <div><p className="mb-1 text-xs text-gray-500">Assignments finished · {o.assignments.finished}/{o.assignments.total}</p><ProgressBar value={o.assignments.rate} label="Assignments finished" /></div>}
                        {caps.audio_practice && <div><p className="mb-1 text-xs text-gray-500">Audio questions practised · {o.audio.practised}/{o.audio.questions}</p><ProgressBar value={o.audio.rate} label="Audio practised" /></div>}
                        {caps.problem_solving && <div><p className="mb-1 text-xs text-gray-500">Problems solved</p><p className="text-sm text-gray-800 dark:text-gray-200">{o.problems.solved} solved by {o.problems.studentsSolving} students</p></div>}
                    </div>
                    {o.courses.length > 0 && (
                        <ul className="mt-5 flex flex-wrap gap-2">
                            {o.courses.map(c => <li key={c.id} className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">{c.title}{c.status !== 'active' ? ` (${c.status})` : ''}</li>)}
                        </ul>
                    )}
                </Panel>
                <Panel title="Recent activity in this batch">
                    {o.recentActivity.length === 0 ? <p className="text-sm text-gray-500">No recorded learning activity yet.</p> : (
                        <ul className="space-y-2 text-sm">
                            {o.recentActivity.map((e, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="min-w-0 flex-1">
                                        <Link href={`/admin/students/${e.userId}?batch=${o.batch.id}`} className="font-medium text-gray-900 dark:text-white hover:underline">{e.student}</Link>
                                        <span className="text-gray-600 dark:text-gray-400"> · {EVENT_LABEL[e.type] ?? e.type}{e.title ? ` “${e.title}”` : ''}{e.courseTitle ? ` — ${e.courseTitle}` : ''}{typeof e.score === 'number' ? ` · ${e.score}${e.type === 'assessment_submitted' ? '%' : '/10'}` : ''}</span>
                                    </span>
                                    <time className="shrink-0 text-xs text-gray-500">{fmtRelative(e.at)}</time>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
            <div className="space-y-5">
                {o.batch.description && <Panel title="About"><p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{o.batch.description}</p></Panel>}
                <Panel title="Configuration" actions={<button type="button" onClick={() => onTab('settings')} className="text-sm text-blue-600 hover:underline">Edit</button>}>
                    <ul className="space-y-1.5 text-sm">
                        {CAPABILITY_INFO.map(c => <li key={c.key} className="flex justify-between gap-2"><span className="text-gray-600 dark:text-gray-400">{c.label}</span><span className={caps[c.key] ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>{caps[c.key] ? 'On' : 'Off'}</span></li>)}
                    </ul>
                    {o.batch.legacyConfig.capabilities && <div className="mt-3"><DataNote>Created before batch capabilities existed — everything stays on, exactly as before, until changed in Settings.</DataNote></div>}
                </Panel>
                {o.meetings && (
                    <Panel title="Meetings" actions={<button type="button" onClick={() => onTab('meetings')} className="text-sm text-blue-600 hover:underline">Manage</button>}>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{o.meetings.scheduled} scheduled ({o.meetings.recurring} recurring) · {o.meetings.cancelled} cancelled</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{o.meetings.next ? <>Next: <strong>{o.meetings.next.title}</strong> · {fmtDateTime(o.meetings.next.start)}</> : 'Nothing upcoming in the next 60 days.'}</p>
                    </Panel>
                )}
                <Panel title="Communication groups" actions={<button type="button" onClick={() => onTab('groups')} className="text-sm text-blue-600 hover:underline">Manage</button>}>
                    {o.groups.filter(g => !g.archived).length === 0 ? <p className="text-sm text-gray-500">No groups.</p> : (
                        <ul className="space-y-1.5 text-sm">
                            {o.groups.filter(g => !g.archived).map(g => (
                                <li key={g.key} className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-gray-800 dark:text-gray-200">{g.name}</span>
                                    {g.conversation_id ? <Link href={`/chat/${g.conversation_id}`} className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"><MessageSquare className="h-3 w-3" aria-hidden="true" />{g.member_count ?? 0}</Link> : <span className="text-xs text-gray-400">not created yet</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
        </div>
    );
}

/* ───────────── Meetings (existing workflows + attendance) ───────────── */

function MeetingsTab({ batchId, onChanged }: { batchId: string; onChanged: () => void }) {
    const [feed, setFeed] = useState<MeetingFeed>({ upcoming: [], past: [] });
    const [rawMeetings, setRawMeetings] = useState<Meeting[]>([]);
    const [counts, setCounts] = useState<Map<string, { recorded: number; attended: number }>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Meeting | null>(null);
    const [attendance, setAttendance] = useState<{ meetingId: string; start: string } | null>(null);
    const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'delete'; id: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [f, raw, c] = await Promise.all([
                meetingService.getBatchMeetingFeed(batchId),
                meetingService.getBatchMeetings(batchId),
                adminInsightsService.attendanceCounts(batchId).catch(() => []),
            ]);
            setFeed(f);
            setRawMeetings(raw);
            setCounts(new Map(c.map(x => [`${x.meetingId}:${x.start}`, x])));
            setError(null);
        } catch (err) { setError(err); } finally { setLoading(false); }
    }, [batchId]);
    useEffect(() => { void load(); }, [load]);

    const act = async () => {
        if (!confirm) return;
        try {
            if (confirm.kind === 'cancel') { await meetingService.cancel(confirm.id); toast.success('Meeting cancelled'); }
            else { await meetingService.remove(confirm.id); toast.success('Meeting deleted'); }
            setConfirm(null);
            void load();
            onChanged();
        } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); }
    };

    if (error) return <ErrorState error={error} onRetry={load} />;
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button type="button" onClick={() => { setEditing(null); setShowForm(true); }} className={btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> Schedule meeting</button>
            </div>
            {loading ? <SkeletonBlock rows={3} /> : (
                <>
                    <section>
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Upcoming</h3>
                        {feed.upcoming.length === 0 ? <Empty icon={<Video className="h-10 w-10" />} title="No upcoming meetings">Schedule a one-time or recurring meeting for this batch.</Empty> : (
                            <div className="space-y-3">
                                {feed.upcoming.map((m, i) => (
                                    <MeetingCard key={`${m.id}-${i}`} occ={m} variant="upcoming" showBatch={false}
                                        onEdit={id => { setEditing(rawMeetings.find(r => r.id === id) ?? null); setShowForm(true); }}
                                        onCancel={id => setConfirm({ kind: 'cancel', id })} onDelete={id => setConfirm({ kind: 'delete', id })} />
                                ))}
                            </div>
                        )}
                    </section>
                    {feed.past.length > 0 && (
                        <section>
                            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Past (last 60 days)</h3>
                            <div className="space-y-3">
                                {feed.past.slice(0, 20).map((m, i) => {
                                    const c = counts.get(`${m.id}:${new Date(m.start).toISOString()}`);
                                    return (
                                        <div key={`${m.id}-${i}`}>
                                            <MeetingCard occ={m} variant="past" showBatch={false} onDelete={id => setConfirm({ kind: 'delete', id })} />
                                            <div className="mt-1 flex items-center justify-end gap-2 text-xs">
                                                <span className="text-gray-500">{c ? `Attendance: ${c.attended}/${c.recorded} recorded present` : 'Attendance not recorded'}</span>
                                                <button type="button" onClick={() => setAttendance({ meetingId: m.id, start: new Date(m.start).toISOString() })} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
                                                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" /> {c ? 'Edit attendance' : 'Record attendance'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </>
            )}
            {showForm && <MeetingForm batchId={batchId} existing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { void load(); onChanged(); }} />}
            {attendance && <AttendanceModal meetingId={attendance.meetingId} occurrence={attendance.start} onClose={() => setAttendance(null)} onSaved={load} />}
            <ConfirmDialog
                open={!!confirm}
                title={confirm?.kind === 'cancel' ? 'Cancel this meeting?' : 'Delete this meeting?'}
                message={confirm?.kind === 'cancel' ? 'Students will be notified. The meeting stays in history as cancelled.' : 'This removes the meeting permanently and notifies students. Recorded attendance is kept.'}
                confirmLabel={confirm?.kind === 'cancel' ? 'Cancel meeting' : 'Delete'}
                onConfirm={act}
                onCancel={() => setConfirm(null)}
            />
        </div>
    );
}

/* ───────────── Groups ───────────── */

function GroupsTab({ o, onSaved }: { o: BatchOverview; onSaved: () => void }) {
    const [groups, setGroups] = useState<BatchGroup[]>(o.groups);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setGroups(o.groups); }, [o.groups]);
    const save = async () => {
        if (groups.some(g => !g.name.trim())) { toast.error('Every group needs a name'); return; }
        setSaving(true);
        try {
            await adminInsightsService.saveGroups(o.batch.id, groups.map(({ key, template, name, description, audience, who_can_post, archived }) => ({ key, template, name, description, audience, who_can_post, archived })));
            toast.success('Communication groups saved');
            onSaved();
        } catch (err) { toast.error(apiErrorMessage(err, 'Groups were not saved')); } finally { setSaving(false); }
    };
    return (
        <div className="space-y-5">
            <Panel title="Communication groups" subtitle="Each group is a chat channel for this batch, using the LMS chat. Membership follows the batch automatically.">
                {o.batch.legacyConfig.groups && <div className="mb-3"><DataNote>This batch has the original single General channel. Its messages are kept; saving here keeps that channel and adds any new groups.</DataNote></div>}
                <GroupsEditor value={groups} onChange={setGroups} meetingsEnabled={o.capabilities.meetings} existingKeys={o.groups.map(g => g.key)} />
                <div className="mt-4 flex justify-end"><button type="button" className={btnPrimary} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save groups'}</button></div>
            </Panel>
            {o.groups.some(g => g.conversation_id) && (
                <Panel title="Open a group">
                    <ul className="flex flex-wrap gap-2">
                        {o.groups.filter(g => g.conversation_id).map(g => (
                            <li key={g.key}><Link href={`/chat/${g.conversation_id}`} className={btnSecondary}><MessageSquare className="h-4 w-4" aria-hidden="true" />{g.name}{g.archived ? ' (archived)' : ''} · {g.member_count ?? 0}</Link></li>
                        ))}
                    </ul>
                </Panel>
            )}
        </div>
    );
}

/* ───────────── Settings ───────────── */

function SettingsTab({ o, onSaved }: { o: BatchOverview; onSaved: () => void }) {
    const router = useRouter();
    const [name, setName] = useState(o.batch.name);
    const [description, setDescription] = useState(o.batch.description);
    const [batchType, setBatchType] = useState(o.batch.batchType ?? '');
    const [status, setStatus] = useState(o.batch.status);
    const [startDate, setStartDate] = useState(o.batch.startDate ? o.batch.startDate.slice(0, 10) : '');
    const [endDate, setEndDate] = useState(o.batch.endDate ? o.batch.endDate.slice(0, 10) : '');
    const [caps, setCaps] = useState<Capabilities>(o.capabilities);
    const [courseIds, setCourseIds] = useState<string[]>(o.courses.map(c => c.id));
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const courses = useAsync(() => courseService.getAllCourses({}), 'settings-courses');
    const scheduled = o.meetings?.scheduled ?? 0;

    const save = async () => {
        if (!name.trim()) { toast.error('Enter a name'); return; }
        if (endDate && startDate && endDate < startDate) { toast.error('The end date is before the start date'); return; }
        setSaving(true);
        try {
            await batchService.update(o.batch.id, {
                name: name.trim(), description, batch_type: batchType.trim() || null, status,
                start_date: startDate, end_date: endDate || null, capabilities: caps, course_ids: caps.courses ? courseIds : [],
            });
            toast.success('Batch settings saved');
            onSaved();
        } catch (err) {
            toast.error(httpStatus(err) === 409 ? apiErrorMessage(err, 'Cancel the scheduled meetings first') : apiErrorMessage(err, 'Settings were not saved'));
        } finally { setSaving(false); }
    };
    const remove = async () => {
        setDeleting(true);
        try {
            await batchService.delete(o.batch.id);
            toast.success('Batch deleted');
            router.push('/admin/batches');
        } catch (err) { toast.error(apiErrorMessage(err, 'The batch was not deleted')); setDeleting(false); }
    };

    return (
        <div className="space-y-5">
            <Panel title="Basic information">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Name<input className={`${inputCls} mt-1 w-full`} value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Category / type<input className={`${inputCls} mt-1 w-full`} value={batchType} maxLength={60} onChange={e => setBatchType(e.target.value)} /></label>
                    <label className="text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">Description<textarea rows={3} className={`${inputCls} mt-1 w-full`} value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} /></label>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Start date<input type="date" className={`${inputCls} mt-1 w-full`} value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
                    <label className="text-sm text-gray-700 dark:text-gray-300">End date<input type="date" className={`${inputCls} mt-1 w-full`} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} /></label>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Status
                        <select className={`${inputCls} mt-1 w-full`} value={status} onChange={e => setStatus(e.target.value)}><option value="active">Active</option><option value="archived">Archived</option></select>
                    </label>
                </div>
            </Panel>
            <Panel title="Capabilities">
                <CapabilityEditor value={caps} onChange={setCaps} lockMeetingsOff={scheduled > 0 ? `${scheduled} scheduled meeting${scheduled === 1 ? '' : 's'} — cancel or delete ${scheduled === 1 ? 'it' : 'them'} in the Meetings tab before switching meetings off.` : null} />
            </Panel>
            {caps.courses && (
                <Panel title="Courses" subtitle="Members get access to these courses. Removing a course removes batch-based access only; progress is kept.">
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-100 dark:border-gray-800">
                        {(courses.data ?? []).filter(c => c.id).map(c => (
                            <label key={c.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={courseIds.includes(c.id!)} onChange={() => setCourseIds(ids => ids.includes(c.id!) ? ids.filter(x => x !== c.id) : [...ids, c.id!])} />
                                <span className="flex-1 text-gray-800 dark:text-gray-200">{c.title}</span>
                            </label>
                        ))}
                    </div>
                </Panel>
            )}
            <Panel title="Membership"><p className="text-sm text-gray-600 dark:text-gray-400">Add or remove students from the <Link href={`/admin/batches/${o.batch.id}?tab=students`} className="text-blue-600 hover:underline">Students tab</Link>. A student can belong to several batches; removing them from this one never affects the others or their learning history.</p></Panel>
            <div className="flex flex-wrap justify-between gap-2">
                <button type="button" onClick={() => setConfirmDelete(true)} className={`${btnSecondary} text-red-600 dark:text-red-400`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete batch</button>
                <button type="button" onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save settings'}</button>
            </div>
            <ConfirmDialog open={confirmDelete} title="Delete this batch?" busy={deleting}
                message={<>Delete <strong>{o.batch.name}</strong>? Students lose batch-based course access. Their learning history, messages and other batches are not deleted.</>}
                confirmLabel="Delete batch" onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
        </div>
    );
}

"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ClipboardCheck, MessageSquare, Plus, Trash2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminInsightsService, httpStatus } from '@/services/api/admin-insights.api';
import { batchService } from '@/services/api/batch.api';
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
import { BatchAptitudeView } from './batch-aptitude';
import { AttendanceModal } from './attendance-modal';
import { CAPABILITY_INFO, CapabilityEditor, GroupsEditor } from './batch-config';
import { BatchMembers } from './batch-members';
import { BatchJoining } from './batch-joining';
import { BatchCourses } from './batch-courses';
import { BatchMentors } from './batch-mentors';
import { BatchAnnouncements, BatchHistory } from './batch-communication';
import { useStaffAccess } from '@/hooks/use-staff-access';
import { batchAdminService } from '@/services/api/batch-admin.api';
import { LIFECYCLE_LABEL, LIFECYCLE_TONE, type BatchLifecycle } from '@/types/batch-admin';

type Tab = 'overview' | 'members' | 'students' | 'courses' | 'mentors' | 'joining' | 'analytics' | 'aptitude' | 'meetings' | 'groups' | 'announcements' | 'history' | 'settings';
const TABS: Tab[] = ['overview', 'members', 'students', 'courses', 'mentors', 'joining', 'analytics', 'aptitude', 'meetings', 'groups', 'announcements', 'history', 'settings'];

type Section = 'overview' | 'people' | 'courses' | 'joining' | 'insights' | 'meetings' | 'communication' | 'settings';
/** Top-level sections; a section with several views shows a small switch under the tab bar. */
const SECTIONS: { id: Section; label: string; views: Tab[] }[] = [
    { id: 'overview', label: 'Overview', views: ['overview'] },
    { id: 'people', label: 'Students', views: ['members', 'students'] },
    { id: 'courses', label: 'Courses & mentors', views: ['courses', 'mentors'] },
    { id: 'joining', label: 'Joining', views: ['joining'] },
    { id: 'insights', label: 'Insights', views: ['analytics', 'aptitude'] },
    { id: 'meetings', label: 'Meetings', views: ['meetings'] },
    { id: 'communication', label: 'Communication', views: ['announcements', 'groups'] },
    { id: 'settings', label: 'Settings', views: ['settings', 'history'] },
];

export function BatchDetail({ batchId }: { batchId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const requested = sp.get('tab') as Tab;
    const access = useStaffAccess();
    const overview = useAsync(() => adminInsightsService.batchOverview(batchId), `bo:${batchId}`);
    const o = overview.data;
    const meetingsOn = o?.capabilities.meetings ?? true;
    // Meetings are managed through the existing admin-only meeting tools.
    const staffAdmin = access.isSuperAdmin || access.fullAdmin;

    const setTab = (t: Tab) => {
        // Directory filters belong to the Students tab; drop them when leaving it.
        const next = new URLSearchParams();
        if (t !== 'overview') next.set('tab', t);
        router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
    };

    // Views follow the viewer's permissions (the API enforces them regardless).
    // The URL keeps one id per view (old links like ?tab=students still work);
    // views are grouped into a few sections so the tab bar never overflows.
    const tabs: TabDef<Tab>[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'members', label: 'Members', count: o?.counts.students ?? null, hidden: !access.can('students.view') },
        { id: 'students', label: 'Progress', hidden: !access.can('students.view') },
        { id: 'courses', label: 'Courses', count: o?.counts.courses ?? null },
        { id: 'mentors', label: 'Mentors' },
        { id: 'joining', label: 'Joining', hidden: !(access.can('batches.invitations') || access.can('batches.edit') || access.can('batches.approve_requests')) },
        { id: 'analytics', label: 'Analytics', hidden: !access.can('analytics.batch') },
        { id: 'aptitude', label: 'Aptitude', hidden: !access.can('analytics.batch') },
        { id: 'meetings', label: 'Meetings', hidden: !meetingsOn || !staffAdmin, count: o?.meetings?.scheduled ?? null },
        { id: 'groups', label: 'Chat groups', count: o?.counts.groups ?? null },
        { id: 'announcements', label: 'Announcements', hidden: !(access.can('communication.announcements') || access.can('communication.view_history')) },
        { id: 'history', label: 'History', hidden: !access.can('batches.edit') },
        { id: 'settings', label: 'Settings', hidden: !(access.can('batches.edit') || access.can('batches.archive')) },
    ];
    const visible = tabs.filter(t => !t.hidden).map(t => t.id);
    const tab: Tab = TABS.includes(requested) && (!access.ready || visible.includes(requested)) ? requested : 'overview';
    const sectionList = SECTIONS.map(s => {
        const leaves = s.views.filter(v => visible.includes(v));
        return { ...s, leaves, count: s.id === 'people' ? o?.counts.students ?? null : s.id === 'courses' ? o?.counts.courses ?? null : null };
    });
    const section = sectionList.find(s => s.views.includes(tab)) ?? sectionList[0];
    const sectionTabs: TabDef<Section>[] = sectionList.map(s => ({ id: s.id, label: s.label, count: s.count, hidden: s.leaves.length === 0 }));
    const viewLabel = (v: Tab) => tabs.find(t => t.id === v)?.label ?? v;
    const lifecycle = (o?.batch.lifecycle ?? (o?.batch.status === 'archived' ? 'archived' : 'active')) as BatchLifecycle;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[...(access.isMentor ? [{ label: 'Mentor dashboard', href: '/mentor' }] : []), { label: 'Batches', href: '/admin/batches' }, { label: o?.batch.name ?? 'Batch' }]} />
            {overview.error ? <ErrorState error={overview.error} onRetry={overview.reload} /> : !o ? <SkeletonBlock rows={4} /> : (
                <>
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{o.batch.name}</h1>
                                <Pill tone={LIFECYCLE_TONE[lifecycle]}>{LIFECYCLE_LABEL[lifecycle]}</Pill>
                                {o.batch.joinMode === 'approval' && <Pill tone="neutral">Approval to join</Pill>}
                                {o.batch.maxStudents ? <Pill tone="neutral">{o.counts.students}/{o.batch.maxStudents} seats</Pill> : null}
                                {o.batch.batchType && <Pill tone="info">{o.batch.batchType}</Pill>}
                                {!meetingsOn && <Pill tone="neutral">Meetings off</Pill>}
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-mono text-xs">{o.batch.batchNumber}</span>
                                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(o.batch.startDate)}{o.batch.endDate ? ` – ${fmtDate(o.batch.endDate)}` : ''}</span>
                            </p>
                        </div>
                    </div>
                    <TabBar tabs={sectionTabs} active={section.id} onChange={s => setTab(sectionList.find(x => x.id === s)!.leaves[0] ?? 'overview')} label="Batch sections" />
                    {section.leaves.length > 1 && (
                        <div role="tablist" aria-label={`${section.label} views`} className="mb-5 inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                            {section.leaves.map(v => (
                                <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === v ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                                    {viewLabel(v)}
                                </button>
                            ))}
                        </div>
                    )}
                    {tab === 'overview' && <OverviewTab o={o} onTab={setTab} />}
                    {tab === 'members' && <BatchMembers batchId={batchId} batchName={o.batch.name} onChanged={overview.reload} />}
                    {tab === 'students' && <StudentDirectory scope={{ batchId, batchName: o.batch.name }} onMembershipChanged={overview.reload} canManageMembership={access.can('batches.manage_students')} />}
                    {tab === 'courses' && <BatchCourses batchId={batchId} coursesCapability={o.capabilities.courses} onChanged={overview.reload} />}
                    {tab === 'mentors' && <BatchMentors batchId={batchId} />}
                    {tab === 'joining' && <BatchJoining batchId={batchId} batchName={o.batch.name} joinMode={o.batch.joinMode ?? 'direct'} maxStudents={o.batch.maxStudents ?? null} archived={lifecycle === 'archived'} onChanged={overview.reload} />}
                    {tab === 'announcements' && <BatchAnnouncements batchId={batchId} memberCount={o.counts.students} />}
                    {tab === 'history' && <BatchHistory batchId={batchId} />}
                    {tab === 'analytics' && <BatchAnalyticsView batchId={batchId} />}
                    {tab === 'aptitude' && <BatchAptitudeView batchId={batchId} />}
                    {tab === 'meetings' && meetingsOn && <MeetingsTab batchId={batchId} onChanged={overview.reload} />}
                    {tab === 'groups' && <GroupsTab o={o} onSaved={overview.reload} canEdit={access.can('communication.manage_discussions')} />}
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
                        <button type="button" onClick={() => onTab('members')} className={btnSecondary}>Open member list</button>
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

function GroupsTab({ o, onSaved, canEdit }: { o: BatchOverview; onSaved: () => void; canEdit: boolean }) {
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
            {canEdit && (
                <Panel title="Communication groups" subtitle="Each group is a chat channel for this batch, using the LMS chat. Membership follows the batch automatically; assigned mentors join according to their communication permissions.">
                    {o.batch.legacyConfig.groups && <div className="mb-3"><DataNote>This batch has the original single General channel. Its messages are kept; saving here keeps that channel and adds any new groups.</DataNote></div>}
                    <GroupsEditor value={groups} onChange={setGroups} meetingsEnabled={o.capabilities.meetings} existingKeys={o.groups.map(g => g.key)} />
                    <div className="mt-4 flex justify-end"><button type="button" className={btnPrimary} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save groups'}</button></div>
                </Panel>
            )}
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
    const access = useStaffAccess();
    const canEdit = access.can('batches.edit');
    const canArchive = access.can('batches.archive');
    const archived = o.batch.status === 'archived';
    const [name, setName] = useState(o.batch.name);
    const [description, setDescription] = useState(o.batch.description);
    const [batchType, setBatchType] = useState(o.batch.batchType ?? '');
    const [startDate, setStartDate] = useState(o.batch.startDate ? o.batch.startDate.slice(0, 10) : '');
    const [endDate, setEndDate] = useState(o.batch.endDate ? o.batch.endDate.slice(0, 10) : '');
    const [caps, setCaps] = useState<Capabilities>(o.capabilities);
    const [archivedAccess, setArchivedAccess] = useState<'keep' | 'revoke'>(o.batch.archivedAccess ?? 'keep');
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState<'delete' | 'archive' | 'restore' | null>(null);
    const [busy, setBusy] = useState(false);
    const scheduled = o.meetings?.scheduled ?? 0;

    const save = async () => {
        if (!name.trim()) { toast.error('Enter a name'); return; }
        if (endDate && startDate && endDate < startDate) { toast.error('The end date is before the start date'); return; }
        setSaving(true);
        try {
            const body: Record<string, unknown> = {};
            if (canEdit) {
                Object.assign(body, {
                    name: name.trim(), description, batch_type: batchType.trim() || null,
                    start_date: startDate, end_date: endDate || null, capabilities: caps,
                });
                // Switching course access off empties the course list (as before); the list itself is edited in the Courses tab.
                if (!caps.courses && o.capabilities.courses && o.courses.length) body.course_ids = [];
            }
            if (canArchive && archivedAccess !== (o.batch.archivedAccess ?? 'keep')) body.archived_access = archivedAccess;
            if (!Object.keys(body).length) { toast('Nothing to save'); return; }
            await batchService.update(o.batch.id, body);
            toast.success('Batch settings saved');
            onSaved();
        } catch (err) {
            toast.error(httpStatus(err) === 409 ? apiErrorMessage(err, 'Cancel the scheduled meetings first') : apiErrorMessage(err, 'Settings were not saved'));
        } finally { setSaving(false); }
    };
    const act = async () => {
        setBusy(true);
        try {
            if (confirm === 'delete') {
                await batchService.delete(o.batch.id);
                toast.success('Batch deleted');
                router.push('/admin/batches');
                return;
            }
            if (confirm === 'archive') await batchAdminService.archive(o.batch.id);
            if (confirm === 'restore') await batchAdminService.restore(o.batch.id);
            toast.success(confirm === 'archive' ? 'Batch archived' : 'Batch restored');
            setConfirm(null);
            onSaved();
        } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); } finally { setBusy(false); }
    };

    return (
        <div className="space-y-5">
            {canEdit && (
                <Panel title="Basic information" subtitle="The status (upcoming, active, completed) follows the start and end dates.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm text-gray-700 dark:text-gray-300">Name<input className={`${inputCls} mt-1 w-full`} value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">Category / type<input className={`${inputCls} mt-1 w-full`} value={batchType} maxLength={60} onChange={e => setBatchType(e.target.value)} /></label>
                        <label className="text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">Description<textarea rows={3} className={`${inputCls} mt-1 w-full`} value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} /></label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">Start date<input type="date" className={`${inputCls} mt-1 w-full`} value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">End date<input type="date" className={`${inputCls} mt-1 w-full`} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} /></label>
                    </div>
                </Panel>
            )}
            {canEdit && (
                <Panel title="Capabilities">
                    <CapabilityEditor value={caps} onChange={setCaps} lockMeetingsOff={scheduled > 0 ? `${scheduled} scheduled meeting${scheduled === 1 ? '' : 's'} — cancel or delete ${scheduled === 1 ? 'it' : 'them'} in the Meetings tab before switching meetings off.` : null} />
                    {!caps.courses && o.capabilities.courses && o.courses.length > 0 && (
                        <div className="mt-3"><DataNote>Saving removes this batch&apos;s {o.courses.length} course{o.courses.length === 1 ? '' : 's'}: members lose the access this batch gave (other access sources stay).</DataNote></div>
                    )}
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Courses, members, the invitation link and mentors have their own tabs.</p>
                </Panel>
            )}
            {canArchive && (
                <Panel title="Archiving" subtitle="An archived batch keeps its members, history and progress, but nobody can join.">
                    <label className="block max-w-md text-sm text-gray-700 dark:text-gray-300">Course access while archived
                        <select className={`${inputCls} mt-1 w-full`} value={archivedAccess} onChange={e => setArchivedAccess(e.target.value as 'keep' | 'revoke')}>
                            <option value="keep">Members keep the batch courses</option>
                            <option value="revoke">Batch courses close while archived</option>
                        </select>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">Either way, courses students hold another way (purchase, bundle, subscription, grant, another batch) stay open.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {archived
                            ? <button type="button" className={btnSecondary} onClick={() => setConfirm('restore')}>Restore batch</button>
                            : <button type="button" className={btnSecondary} onClick={() => setConfirm('archive')}>Archive batch</button>}
                        <button type="button" onClick={() => setConfirm('delete')} className={`${btnSecondary} text-red-600 dark:text-red-400`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete batch</button>
                    </div>
                </Panel>
            )}
            {(canEdit || canArchive) && (
                <div className="flex justify-end">
                    <button type="button" onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save settings'}</button>
                </div>
            )}
            <ConfirmDialog open={!!confirm} busy={busy}
                title={confirm === 'delete' ? 'Delete this batch?' : confirm === 'archive' ? 'Archive this batch?' : 'Restore this batch?'}
                message={confirm === 'delete'
                    ? <>Delete <strong>{o.batch.name}</strong>? Members lose the course access this batch gave. Their learning history, messages, membership history and other batches are kept. Archiving is usually the better choice.</>
                    : confirm === 'archive'
                        ? <>The invitation link stops working and nobody can join. {archivedAccess === 'revoke' ? 'Batch courses close for members while archived.' : 'Members keep the batch courses.'} Save first if you changed the setting above.</>
                        : <>The batch accepts members again. Create a new invitation link in the Joining tab if needed.</>}
                confirmLabel={confirm === 'delete' ? 'Delete batch' : confirm === 'archive' ? 'Archive' : 'Restore'}
                tone={confirm === 'restore' ? 'primary' : 'danger'}
                onConfirm={act} onCancel={() => setConfirm(null)} />
        </div>
    );
}

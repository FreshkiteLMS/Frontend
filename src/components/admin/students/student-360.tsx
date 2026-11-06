"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, ClipboardCheck, Flame, Layers, Mail, Phone, Trophy } from 'lucide-react';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import type { StudentOverview } from '@/types/admin-insights';
import {
    Async, Avatar, Breadcrumbs, DataNote, EVENT_LABEL, Empty, Figure, Panel, Pill, ProgressBar, SkeletonBlock, StudentCode, TabBar,
    fmtDate, fmtDateTime, fmtRelative, useAsync, type TabDef,
} from '../insights/ui';
import { COURSE_PARTS, HBars, SplitBar } from '../insights/charts';
import { ActivityTab, AssignmentsTab, AudioTab, CoursesTab, MeetingsTab, ProblemsTab } from './student-360-tabs';

type Tab = 'overview' | 'courses' | 'assignments' | 'audio' | 'problems' | 'meetings' | 'activity';
const TABS: Tab[] = ['overview', 'courses', 'assignments', 'audio', 'problems', 'meetings', 'activity'];

/**
 * Student 360 — one admin page for a student's whole journey. Opened from the
 * global directory and from a batch's Students tab (`?batch=` keeps the batch
 * context for breadcrumbs and the way back). The student-facing profile is a
 * separate page and is not affected by anything here.
 */
export function Student360({ studentId }: { studentId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const tab = (TABS.includes(sp.get('tab') as Tab) ? sp.get('tab') : 'overview') as Tab;
    const batchCtx = sp.get('batch');
    const overview = useAsync(() => adminInsightsService.overview(studentId), `ov:${studentId}`);
    const o = overview.data;
    const ctxBatch = batchCtx ? o?.batches.find(b => b.id === batchCtx) : null;

    const setTab = (t: Tab) => {
        const next = new URLSearchParams(sp.toString());
        if (t === 'overview') next.delete('tab'); else next.set('tab', t);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };

    const crumbs = batchCtx
        ? [{ label: 'Batches', href: '/admin/batches' }, { label: ctxBatch?.name ?? 'Batch', href: `/admin/batches/${batchCtx}?tab=students` }, { label: o?.identity.name ?? 'Student' }]
        : [{ label: 'Students', href: '/admin/students' }, { label: o?.identity.name ?? 'Student' }];
    const backHref = batchCtx ? `/admin/batches/${batchCtx}?tab=students` : '/admin/students';

    const anyMeetings = o?.batches.some(b => b.capabilities.meetings) ?? true;
    const s = o?.summary;
    const tabs: TabDef<Tab>[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'courses', label: 'Courses', count: s?.enrolled_courses ?? null },
        { id: 'assignments', label: 'Assignments', count: s ? s.assignments.total + s.tests.taken : null },
        { id: 'audio', label: 'Audio practice', count: s ? s.audio.attempts + s.logic.attempts : null },
        { id: 'problems', label: 'Problem solving', count: s ? s.problems_solved : null },
        { id: 'meetings', label: 'Meetings' },
        { id: 'activity', label: 'Activity' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={crumbs} />
            <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {batchCtx ? `Back to ${ctxBatch?.name ?? 'batch'}` : 'Back to students'}
            </Link>

            <Async state={overview} skeleton={<SkeletonBlock rows={5} />}>
                {data => (
                    <>
                        <Header o={data} onTab={setTab} />
                        <TabBar tabs={tabs} active={tab} onChange={setTab} label="Student sections" />
                        {tab === 'overview' && <OverviewTab o={data} onTab={setTab} />}
                        {tab === 'courses' && <CoursesTab studentId={data.identity.userId} />}
                        {tab === 'assignments' && <AssignmentsTab studentId={data.identity.userId} />}
                        {tab === 'audio' && <AudioTab studentId={data.identity.userId} />}
                        {tab === 'problems' && <ProblemsTab studentId={data.identity.userId} />}
                        {tab === 'meetings' && <MeetingsTab studentId={data.identity.userId} anyMeetings={anyMeetings} />}
                        {tab === 'activity' && <ActivityTab studentId={data.identity.userId} />}
                    </>
                )}
            </Async>
        </div>
    );
}

function Header({ o, onTab }: { o: StudentOverview; onTab: (t: Tab) => void }) {
    const { identity: id, summary: s } = o;
    const [now] = useState(() => Date.now());
    const status = !s.last_activity_at ? 'never' : now - +new Date(s.last_activity_at) <= 14 * 86_400_000 ? 'active' : 'inactive';
    const pendingCount = o.pending.attemptRequests.length + o.pending.enrollmentRequests.length;
    return (
        <section className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <Avatar name={id.name} url={id.avatarUrl} size={72} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{id.name}</h1>
                        <StudentCode code={id.studentCode} />
                        <Pill tone="active" title="Account status">Account active</Pill>
                        <Pill tone={status}>{status === 'active' ? 'Learning in the last 14 days' : status === 'inactive' ? 'No learning in 14+ days' : 'No learning activity yet'}</Pill>
                    </div>
                    {id.headline && <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{id.headline}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <a href={`mailto:${id.email}`} className="inline-flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-gray-200"><Mail className="h-4 w-4" aria-hidden="true" />{id.email}</a>
                        {id.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" aria-hidden="true" />{id.phone}</span>}
                        <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />Joined {fmtDate(id.joinedAt)}{id.enrolledAt && id.enrolledAt !== id.joinedAt ? ` · enrolled ${fmtDate(id.enrolledAt)}` : ''}</span>
                        <span>Last learning activity: <strong className="font-medium text-gray-700 dark:text-gray-200">{fmtRelative(s.last_activity_at)}</strong></span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Layers className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        {o.batches.length === 0 ? <span className="text-sm text-gray-500">Not in any batch</span> : o.batches.map(b => (
                            <Link key={b.id} href={`/admin/batches/${b.id}`} className="rounded bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:underline">{b.name}</Link>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 lg:w-80 lg:shrink-0">
                    <Figure label="Courses" value={s.enrolled_courses} sub={`${s.completed_courses} completed`} />
                    <Figure label="Overall" value={`${s.overall_progress}%`} sub="mean course progress" />
                    <Figure label="Rank" value={o.leaderboard ? `#${o.leaderboard.rank}` : '—'} sub={o.leaderboard ? `${o.leaderboard.points} pts` : 'not ranked yet'} />
                </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 text-sm">
                <button type="button" onClick={() => onTab('courses')} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">View courses &amp; enrolment</button>
                <button type="button" onClick={() => onTab('assignments')} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">Assess assignments</button>
                <Link href="/admin/batches" className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">Manage batch membership</Link>
                <Link href="/admin/assessment-attempts" className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">Attempt limits</Link>
                {pendingCount > 0 && (
                    <a href="#pending" className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 font-medium text-amber-800 dark:text-amber-300">
                        <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> {pendingCount} pending request{pendingCount === 1 ? '' : 's'}
                    </a>
                )}
            </div>
        </section>
    );
}

function OverviewTab({ o, onTab }: { o: StudentOverview; onTab: (t: Tab) => void }) {
    const s = o.summary;
    const notStarted = s.enrolled_courses - s.completed_courses - s.in_progress_courses;
    const a = s.assignments;
    const breakdown = o.leaderboard?.breakdown ?? null;
    return (
        <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
                <Panel title="Is this student progressing?" subtitle="Course progress uses the same calculation as the student app.">
                    {s.enrolled_courses === 0 ? <Empty title="Not enrolled in any course">Courses come from purchases, batches, bundles or full access.</Empty> : (
                        <div className="space-y-5">
                            <ProgressBar value={s.overall_progress} label="Overall progress" />
                            <SplitBar label="Courses" parts={[
                                { label: 'Completed', value: s.completed_courses, className: COURSE_PARTS.completed },
                                { label: 'In progress', value: s.in_progress_courses, className: COURSE_PARTS.inProgress },
                                { label: 'Not started', value: Math.max(0, notStarted), className: COURSE_PARTS.notStarted },
                            ]} />
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <Figure label="Modules completed" value={s.modules.total ? `${s.modules.completed}/${s.modules.total}` : '—'} />
                                <Figure label="Lessons completed" value={s.lessons.total ? `${s.lessons.completed}/${s.lessons.total}` : '—'} />
                                <Figure label="Problems solved" value={s.problems.total ? `${s.problems.solved}/${s.problems.total}` : '—'} sub={s.problems.attempted ? `${s.problems.attempted} attempted` : undefined} />
                                <Figure label="Active days (30d)" value={s.active_days_30} sub={`${s.events_30} learning actions`} />
                            </div>
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {o.courses.slice(0, 6).map(c => (
                                    <li key={c.courseId} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                                        <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200">{c.title}</span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{c.completedUnits}/{c.totalUnits} {c.unitLabel}</span>
                                        <ProgressBar value={c.progress} label={`${c.title} progress`} tone={c.status === 'completed' ? 'green' : 'blue'} className="sm:w-44" />
                                    </li>
                                ))}
                            </ul>
                            {o.courses.length > 6 && <button type="button" onClick={() => onTab('courses')} className="text-sm text-blue-600 hover:underline">All {o.courses.length} courses →</button>}
                        </div>
                    )}
                </Panel>

                <Panel title="Work and scores">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Assignments</p>
                            {a.total === 0 ? <p className="text-sm text-gray-500">No assignments in this student&apos;s courses.</p> : (
                                <SplitBar label="Assignments" parts={[
                                    { label: 'Passed', value: a.passed, className: 'bg-[#0ca30c]' },
                                    { label: 'Failed', value: a.failed, className: 'bg-[#d03b3b]' },
                                    { label: 'Done, not graded', value: a.finished - a.passed - a.failed, className: COURSE_PARTS.inProgress },
                                    { label: 'Pending', value: a.pending, className: COURSE_PARTS.notStarted },
                                ]} />
                            )}
                        </div>
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Audio practice</p>
                            {s.audio.questions_total === 0 && s.audio.attempts === 0 ? <p className="text-sm text-gray-500">No audio questions.</p> : (
                                <div className="grid grid-cols-3 gap-3">
                                    <Figure label="Practised" value={`${s.audio.practised}/${s.audio.questions_total}`} />
                                    <Figure label="Attempts" value={s.audio.attempts} />
                                    <Figure label="Avg best" value={s.audio.avg_best !== null ? `${s.audio.avg_best}/10` : '—'} />
                                </div>
                            )}
                        </div>
                        <Figure label="Tests" value={s.tests.taken} sub={s.tests.avg_percent !== null ? `average best score ${s.tests.avg_percent}%` : 'none taken'} />
                        <Figure label="Approach explanations (problems)" value={s.logic.attempts} sub={s.logic.avg_score !== null ? `average ${s.logic.avg_score}/10` : 'none recorded'} />
                    </div>
                </Panel>

                <Panel title="Recent learning activity" actions={<button type="button" onClick={() => onTab('activity')} className="text-sm text-blue-600 hover:underline">Heatmap &amp; timeline →</button>}>
                    {o.recentActivity.length === 0 ? <p className="text-sm text-gray-500">No timestamped activity recorded yet.</p> : (
                        <ul className="space-y-2.5">
                            {o.recentActivity.map((e, i) => (
                                <li key={i} className="flex gap-3 text-sm">
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{EVENT_LABEL[e.type] ?? e.type}</span>
                                        <span className="text-gray-600 dark:text-gray-400"> · {e.title}{e.courseTitle && e.courseTitle !== e.title ? ` — ${e.courseTitle}` : ''}</span>
                                    </span>
                                    <time className="shrink-0 text-xs text-gray-500" dateTime={e.at}>{fmtDateTime(e.at)}</time>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>

            <div className="space-y-5">
                <Panel title="Needs attention?" subtitle="Plain threshold rules on recorded data — every flag shows its reason.">
                    {o.attention.reasons.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><CheckCircle2 className="h-4 w-4 text-[#0ca30c]" aria-hidden="true" /> Nothing flagged by the current rules.</p>
                    ) : (
                        <ul className="space-y-2">
                            {o.attention.reasons.map(r => (
                                <li key={r.code} className="flex gap-2 text-sm text-gray-800 dark:text-gray-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d03b3b]" aria-hidden="true" />{r.message}</li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-3"><DataNote>Rules: inactive after {o.attention.rules.inactiveDays} days · progress below {o.attention.rules.lowProgress}% · {o.attention.rules.pendingAssignments}+ unfinished assignments · scores below {o.attention.rules.lowScore}/10 · {o.attention.rules.repeatedAttempts}+ low attempts on one question · attendance below {o.attention.rules.minAttendance}%.</DataNote></div>
                </Panel>

                <Panel title="Leaderboard">
                    {!o.leaderboard ? <p className="text-sm text-gray-500">Not on the leaderboard yet.</p> : (
                        <>
                            <div className="mb-4 flex items-center gap-3">
                                <Trophy className="h-8 w-8 text-amber-500" aria-hidden="true" />
                                <Figure label="Overall rank" value={`#${o.leaderboard.rank}`} sub={`${o.leaderboard.points} points`} />
                                <Figure label="Streak" value={<span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />{o.streak.currentStreak}d</span>} sub={`longest ${o.streak.longestStreak}d`} />
                            </div>
                            {breakdown && (
                                <HBars items={[
                                    { label: 'Course progress', value: breakdown.course_points ?? 0 },
                                    { label: 'Problem solving', value: breakdown.problem_points ?? 0 },
                                    { label: 'Completion bonus', value: breakdown.completion_bonus ?? 0 },
                                    { label: 'Assessments', value: breakdown.assessment_points ?? 0 },
                                ]} unit=" pts" />
                            )}
                        </>
                    )}
                </Panel>

                <Panel title="Batches" subtitle="Compared with each batch's members">
                    {o.batches.length === 0 ? <p className="text-sm text-gray-500">Not a member of any batch.</p> : (
                        <ul className="space-y-4">
                            {o.batches.map(b => (
                                <li key={b.id}>
                                    <div className="flex items-baseline justify-between gap-2">
                                        <Link href={`/admin/batches/${b.id}`} className="truncate text-sm font-medium text-gray-900 dark:text-white hover:underline">{b.name}</Link>
                                        <span className="shrink-0 text-xs text-gray-500">{b.rank ? `#${b.rank} of ${b.memberCount}` : `${b.memberCount} students`}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Joined {fmtDate(b.joinedAt)}{b.batchType ? ` · ${b.batchType}` : ''}{!b.capabilities.meetings ? ' · no meetings' : ''}</p>
                                    <div className="mt-1.5 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2"><span className="w-20">This student</span><ProgressBar value={s.overall_progress} className="flex-1" label="Student progress" /></div>
                                        <div className="flex items-center gap-2"><span className="w-20">Batch avg</span><ProgressBar value={b.averageProgress} className="flex-1" label="Batch average progress" /></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <div id="pending">
                    <Panel title="Pending requests">
                        {o.pending.attemptRequests.length + o.pending.enrollmentRequests.length === 0 ? <p className="text-sm text-gray-500">Nothing waiting.</p> : (
                            <ul className="space-y-2 text-sm">
                                {o.pending.attemptRequests.map(r => (
                                    <li key={r.id} className="flex justify-between gap-2"><span className="min-w-0 truncate">+{r.requested_count} attempts · {r.item_title}</span><Link href="/admin/assessment-attempts" className="shrink-0 text-blue-600 hover:underline">Review</Link></li>
                                ))}
                                {o.pending.enrollmentRequests.map(r => (
                                    <li key={r.id} className="flex justify-between gap-2"><span className="min-w-0 truncate">Enrolment · {r.name}</span><Link href="/admin/enrollment-requests" className="shrink-0 text-blue-600 hover:underline">Review</Link></li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
                {o.trackingSince && <DataNote>Activity records for this student start on {fmtDate(o.trackingSince)}.</DataNote>}
            </div>
        </div>
    );
}

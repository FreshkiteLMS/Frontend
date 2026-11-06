"use client";

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import type { BatchAnalytics, PersonRef } from '@/types/admin-insights';
import { Async, DataNote, Empty, Figure, Panel, ProgressBar, SkeletonBlock, btnSecondary, fmtRelative, inputCls, useAsync } from '@/components/admin/insights/ui';
import { BarSeries, COURSE_PARTS, HBars, SplitBar } from '@/components/admin/insights/charts';

const DEFAULT_RULES = { inactiveDays: 7, lowProgress: 25, pendingAssignments: 3, lowScore: 5, repeatedAttempts: 3, minAttendance: 60 };
const RULE_LABELS: Record<keyof typeof DEFAULT_RULES, string> = {
    inactiveDays: 'Inactive after (days)',
    lowProgress: 'Low progress below (%)',
    pendingAssignments: 'Unfinished assignments ≥',
    lowScore: 'Low score below (/10)',
    repeatedAttempts: 'Attempts on one question ≥',
    minAttendance: 'Attendance below (%)',
};

const studentHref = (batchId: string, p: PersonRef) => `/admin/students/${encodeURIComponent(p.userId)}?batch=${encodeURIComponent(batchId)}`;

export function BatchAnalyticsView({ batchId }: { batchId: string }) {
    const [days, setDays] = useState(30);
    const [rules, setRules] = useState(DEFAULT_RULES);
    const [draft, setDraft] = useState(DEFAULT_RULES);
    const [showRules, setShowRules] = useState(false);
    const state = useAsync(() => adminInsightsService.batchAnalytics(batchId, { days, ...rules }), `ba:${batchId}:${days}:${JSON.stringify(rules)}`);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Period{' '}
                    <select className={inputCls} value={days} onChange={e => setDays(Number(e.target.value))}>
                        {[7, 30, 90, 180].map(d => <option key={d} value={d}>Last {d} days</option>)}
                    </select>
                </label>
                <button type="button" className={btnSecondary} onClick={() => setShowRules(s => !s)} aria-expanded={showRules}><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Attention rules</button>
            </div>
            {showRules && (
                <Panel title="“Needs attention” rules" subtitle="Plain thresholds over recorded data. Change them to fit this batch.">
                    <div className="grid gap-3 sm:grid-cols-3">
                        {(Object.keys(DEFAULT_RULES) as (keyof typeof DEFAULT_RULES)[]).map(k => (
                            <label key={k} className="text-xs text-gray-600 dark:text-gray-400">{RULE_LABELS[k]}
                                <input type="number" className={`${inputCls} mt-1 w-full`} value={draft[k]} min={0} onChange={e => setDraft(d => ({ ...d, [k]: Number(e.target.value) }))} />
                            </label>
                        ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button type="button" className={btnSecondary} onClick={() => { setRules(draft); }}>Apply</button>
                        <button type="button" className={btnSecondary} onClick={() => { setDraft(DEFAULT_RULES); setRules(DEFAULT_RULES); }}>Reset</button>
                    </div>
                </Panel>
            )}
            <Async state={state} skeleton={<SkeletonBlock rows={6} />}>
                {a => a.engagement.totalStudents === 0 ? <Empty title="No students in this batch yet">Analytics appear once students are added.</Empty> : <Body a={a} batchId={batchId} />}
            </Async>
        </div>
    );
}

function Body({ a, batchId }: { a: BatchAnalytics; batchId: string }) {
    const caps = a.capabilities;
    const series = a.engagement.series;
    return (
        <>
            <Panel title="Students needing attention" subtitle={`${a.attention.total} of ${a.engagement.totalStudents} students match at least one rule.`}>
                {a.attention.students.length === 0 ? <p className="text-sm text-gray-600 dark:text-gray-400">No student matches the current rules.</p> : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {a.attention.students.slice(0, 25).map(s => (
                            <li key={s.userId} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                                <div className="sm:w-56 shrink-0">
                                    <Link href={studentHref(batchId, s)} className="font-medium text-gray-900 dark:text-white hover:underline">{s.name ?? 'Student'}</Link>
                                    <p className="text-xs text-gray-500">{s.overallProgress ?? 0}% · last active {fmtRelative(s.lastActivityAt)}</p>
                                </div>
                                <ul className="flex flex-1 flex-wrap gap-1.5">
                                    {s.reasons.map(r => (
                                        <li key={r.code} className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs text-red-800 dark:text-red-300 ring-1 ring-inset ring-red-200 dark:ring-red-800">
                                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />{r.message}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
                {a.attention.students.length > 25 && <p className="mt-2 text-xs text-gray-500">Showing 25 of {a.attention.students.length}. Use the Students tab filters to work through the rest.</p>}
            </Panel>

            <Panel title="Engagement" subtitle={`Learning actions per day, last ${a.window.days} days (lessons, problems, tests, questions, audio).`}>
                <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Figure label="Students" value={a.engagement.totalStudents} />
                    <Figure label="Active in last 7 days" value={a.engagement.active7} />
                    <Figure label="Active in last 30 days" value={a.engagement.active30} />
                    <Figure label={`Inactive ${a.rules.inactiveDays}+ days`} value={a.engagement.inactive} />
                </div>
                <BarSeries valueLabel="actions" labelEvery={Math.ceil(series.length / 8)}
                    data={series.map(d => ({ label: d.date.slice(5), value: d.events, tooltip: <span><strong>{d.events}</strong> actions by {d.activeStudents} student{d.activeStudents === 1 ? '' : 's'} · {d.date}</span> }))} />
                {a.engagement.weekly.length > 1 && (
                    <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Active students per week</p>
                        <HBars items={a.engagement.weekly.map(w => ({ label: `Week of ${w.start}`, value: w.activeStudents, note: `${w.events} actions` }))} max={a.engagement.totalStudents} />
                    </div>
                )}
            </Panel>

            <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Progress distribution" subtitle="Students by overall progress">
                    <HBars items={a.distribution.progress.map(b => ({ label: b.label, value: b.count }))} max={a.engagement.totalStudents} />
                </Panel>
                <Panel title="Completed courses" subtitle="Students by number of courses completed">
                    <HBars items={a.distribution.completedCourses.map(b => ({ label: `${b.label} course${b.label === '1' ? '' : 's'}`, value: b.count }))} max={a.engagement.totalStudents} />
                </Panel>
            </div>

            {caps.courses && (
                <Panel title="Course performance" subtitle={a.courses.some(c => c.inBatch) ? 'Courses assigned to this batch' : 'Most common courses among members (the batch has no assigned courses)'}>
                    {a.courses.length === 0 ? <p className="text-sm text-gray-500">No courses.</p> : (
                        <div className="space-y-5">
                            {a.courses.map(c => (
                                <div key={c.courseId}>
                                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                                        <p className="font-medium text-gray-900 dark:text-white">{c.title}</p>
                                        <p className="text-xs text-gray-500">{c.enrolled} enrolled · avg {c.averageProgress ?? 0}% · {c.fallingBehind} below {a.rules.lowProgress}%</p>
                                    </div>
                                    <SplitBar label={c.title} parts={[
                                        { label: 'Completed', value: c.completed, className: COURSE_PARTS.completed },
                                        { label: 'In progress', value: c.inProgress, className: COURSE_PARTS.inProgress },
                                        { label: 'Not started', value: c.notStarted, className: COURSE_PARTS.notStarted },
                                    ]} />
                                    {c.modules && c.modules.length > 0 && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-xs text-blue-600">Module completion ({c.modules.length} modules)</summary>
                                            <div className="mt-2"><HBars unit="%" max={100} items={c.modules.map(m => ({ label: m.title, value: m.lessonCompletionRate ?? 0, note: `· ${m.studentsCompleted} finished` }))} /></div>
                                        </details>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {caps.assignments && (
                    <Panel title="Assignments">
                        {a.assignments.total === 0 ? <p className="text-sm text-gray-500">No assignments in the members’ courses.</p> : (
                            <>
                                <div className="mb-4 grid grid-cols-3 gap-4">
                                    <Figure label="Finished" value={`${a.assignments.finished}/${a.assignments.total}`} />
                                    <Figure label="Pass rate" value={a.assignments.passRate !== null ? `${a.assignments.passRate}%` : '—'} sub={`${a.assignments.passed} pass · ${a.assignments.failed} fail`} />
                                    <Figure label="Awaiting assessment" value={a.assignments.awaitingAssessment} sub={a.assignments.overdue ? `${a.assignments.overdue} overdue` : undefined} />
                                </div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Most unfinished work</p>
                                <PeopleList batchId={batchId} people={a.assignments.studentsWithPending.slice(0, 8)} note={p => `${p.pending} pending${p.overdue ? ` · ${p.overdue} overdue` : ''}`} />
                            </>
                        )}
                    </Panel>
                )}
                {caps.audio_practice && (
                    <Panel title="Audio practice">
                        {a.audio.questions === 0 && a.audio.recordings === 0 ? <p className="text-sm text-gray-500">No audio questions in the members’ courses.</p> : (
                            <>
                                <div className="mb-4 grid grid-cols-3 gap-4">
                                    <Figure label="Questions practised" value={a.audio.completionRate !== null ? `${a.audio.completionRate}%` : '—'} sub={`${a.audio.practised}/${a.audio.questions}`} />
                                    <Figure label="Recordings" value={a.audio.recordings} sub={`avg ${a.audio.averageAttempts ?? 0} per question`} />
                                    <Figure label="Avg best score" value={a.audio.averageBestScore !== null ? `${a.audio.averageBestScore}/10` : '—'} sub={`${a.audio.pendingEvaluations} evaluating`} />
                                </div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Need more practice</p>
                                <PeopleList batchId={batchId} people={a.audio.needsPractice.slice(0, 8)} note={p => `${p.practised}/${p.questions} practised${p.averageBest !== null ? ` · avg ${p.averageBest}` : ''}`} />
                            </>
                        )}
                    </Panel>
                )}
                {caps.problem_solving && (
                    <Panel title="Problem solving" subtitle={`${a.problems.participants} of ${a.problems.eligible} eligible students have attempted problems`}>
                        {a.problems.attempted === 0 ? <p className="text-sm text-gray-500">No problems attempted yet.</p> : (
                            <>
                                <div className="mb-4 grid grid-cols-3 gap-4">
                                    <Figure label="Attempted" value={a.problems.attempted} />
                                    <Figure label="Solved" value={a.problems.solved} />
                                    <Figure label="Solve rate" value={a.problems.completionRate !== null ? `${a.problems.completionRate}%` : '—'} />
                                </div>
                                <HBars unit="%" max={100} items={(['easy', 'medium', 'hard'] as const).map(k => {
                                    const d = a.problems.byDifficulty[k];
                                    return { label: `${k[0].toUpperCase()}${k.slice(1)}`, value: d.attempted ? Math.round((d.solved / d.attempted) * 100) : 0, note: `· ${d.solved}/${d.attempted}` };
                                })} />
                            </>
                        )}
                    </Panel>
                )}
                {a.meetings && (
                    <Panel title="Meetings" subtitle={`${a.meetings.sessionsWithAttendance} sessions have recorded attendance`}>
                        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <Figure label="Scheduled series" value={a.meetings.scheduled} sub={`${a.meetings.recurring} recurring`} />
                            <Figure label={`Held (last ${a.window.days}d)`} value={a.meetings.heldInWindow} />
                            <Figure label="Upcoming (30d)" value={a.meetings.upcoming} />
                            <Figure label="Attendance" value={a.meetings.attendanceRate !== null ? `${a.meetings.attendanceRate}%` : '—'} sub={`${a.meetings.cancelled} cancelled`} />
                        </div>
                        {a.meetings.sessionsWithAttendance === 0 ? <DataNote>No attendance recorded yet — mark it from the Meetings tab.</DataNote> : (
                            <>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Lowest attendance</p>
                                <PeopleList batchId={batchId} people={a.meetings.students.filter(s => s.recorded > 0).slice(0, 8)} note={p => `${p.rate ?? 0}% of ${p.recorded}`} />
                            </>
                        )}
                    </Panel>
                )}
            </div>

            <Panel title="Batch leaderboard" subtitle="Ranked by leaderboard points among this batch's members">
                {a.leaderboard.length === 0 ? <p className="text-sm text-gray-500">No ranked students yet.</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-gray-500"><tr><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Student</th><th className="py-2 pr-3">Points</th><th className="py-2 pr-3 min-w-[140px]">Progress</th><th className="py-2">Overall rank</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {a.leaderboard.map(r => (
                                    <tr key={r.userId}>
                                        <td className="py-2 pr-3 tabular-nums">{r.batchRank}</td>
                                        <td className="py-2 pr-3"><Link href={studentHref(batchId, r)} className="text-gray-900 dark:text-white hover:underline">{r.name}</Link></td>
                                        <td className="py-2 pr-3 tabular-nums">{r.points}</td>
                                        <td className="py-2 pr-3"><ProgressBar value={r.overallProgress} label={`${r.name} progress`} /></td>
                                        <td className="py-2 tabular-nums text-gray-500">#{r.globalRank}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </>
    );
}

function PeopleList<T extends PersonRef>({ batchId, people, note }: { batchId: string; people: T[]; note: (p: T) => string }) {
    if (!people.length) return <p className="text-sm text-gray-500">Nobody.</p>;
    return (
        <ul className="space-y-1.5 text-sm">
            {people.map(p => (
                <li key={p.userId} className="flex justify-between gap-2">
                    <Link href={studentHref(batchId, p)} className="min-w-0 truncate text-gray-800 dark:text-gray-200 hover:underline">{p.name ?? 'Student'}</Link>
                    <span className="shrink-0 text-xs text-gray-500">{note(p)}</span>
                </li>
            ))}
        </ul>
    );
}

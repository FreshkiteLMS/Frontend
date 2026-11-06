"use client";

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, FileText, Mic, MicOff } from 'lucide-react';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import type { AudioAttempt, AudioCourseCard, AudioItem, AudioOverview, RecentRecording } from '@/types/admin-insights';
import { ScorePill } from '@/components/courses/speaking/SpeakingAnalytics';
import { LogicAttemptDetail } from '@/components/admin/problem-solving/LogicAssessmentsTab';
import { Modal } from '@/components/ui/modal';
import { AttemptDetailView } from '@/components/courses/speaking/SpeakingAnalytics';
import { Async, DataNote, Empty, Figure, Panel, Pill, ProgressBar, SkeletonBlock, btnSecondary, fmtDate, fmtDateTime, fmtRelative, inputCls, useAsync } from '../insights/ui';
import { BarSeries, HBars, SplitBar } from '../insights/charts';

/*
 * Audio Practice — overview first, then one course at a time.
 *  - Default: analytics, evaluation status, weekly trend, recent recordings and
 *    one card per course. No per-question records are loaded.
 *  - ?audioCourse=<id>: that course only (topic → question → attempts), with
 *    filters and sorting. Records from other courses are never mixed in.
 */

const PROCESSING = ['UPLOADED', 'TRANSCRIBING', 'EVALUATING'];

type Opened = { courseId: string; attemptId: string; kind: string } | null;

export function AudioTab({ studentId }: { studentId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const selected = sp.get('audioCourse') ?? '';
    const overview = useAsync(() => adminInsightsService.audio(studentId), `audio:${studentId}`);
    const [opened, setOpened] = useState<Opened>(null);

    const select = (courseId: string) => {
        const next = new URLSearchParams(sp.toString());
        if (courseId) next.set('audioCourse', courseId); else next.delete('audioCourse');
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };

    return (
        <Async state={overview} skeleton={<SkeletonBlock rows={5} />}>
            {o => (
                <div className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <label htmlFor="audio-course" className="text-sm font-medium text-gray-700 dark:text-gray-300">Course</label>
                            <select id="audio-course" className={`${inputCls} min-w-[240px]`} value={selected} onChange={e => select(e.target.value)}>
                                <option value="">All courses (overview)</option>
                                {o.courses.map(c => <option key={c.courseId} value={c.courseId}>{c.title}{c.kind === 'PROBLEM_LOGIC' ? ' — approach explanations' : ''}</option>)}
                            </select>
                        </div>
                        <p className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" title={o.playback.reason}>
                            <MicOff className="h-3.5 w-3.5" aria-hidden="true" /> Recordings aren&apos;t kept after transcription — open an attempt for its transcript and AI report.
                        </p>
                    </div>

                    {selected
                        ? <CourseAudio studentId={studentId} courseId={selected} card={o.courses.find(c => c.courseId === selected) ?? null} onBack={() => select('')} onOpen={setOpened} />
                        : <OverviewView studentId={studentId} o={o} onSelect={select} onOpen={setOpened} />}

                    <AttemptViewer opened={opened} onClose={() => setOpened(null)} />
                </div>
            )}
        </Async>
    );
}

/* ───────────── Overview ───────────── */

function OverviewView({ studentId, o, onSelect, onOpen }: { studentId: string; o: AudioOverview; onSelect: (id: string) => void; onOpen: (x: Opened) => void }) {
    const m = o.metrics;
    const qCourses = o.courses.filter(c => c.kind === 'COURSE_QUESTION' && (c.activities ?? 0) > 0);
    if (o.courses.length === 0) return <Empty icon={<Mic className="h-10 w-10" />} title="No audio practice">This student has no courses with audio questions and no recorded explanations.</Empty>;
    return (
        <>
            <Panel title="Audio practice at a glance">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
                    <div className="col-span-2 md:col-span-1">
                        <Figure label="Activities completed" value={`${m.completed}/${m.activities}`} sub={`${m.pending} not practised yet`} />
                        <ProgressBar value={m.activities ? (m.completed / m.activities) * 100 : 0} className="mt-1.5" label="Audio activities completed" />
                    </div>
                    <Figure label="Recordings" value={m.recordings} sub={`${m.evaluated} evaluated · ${m.awaitingEvaluation} awaiting`} />
                    <Figure label="Average best score" value={m.averageBest !== null ? `${m.averageBest}/10` : '—'} sub={m.logicAttempts ? `approach explanations: ${m.logicAverage ?? '—'}/10` : 'per practised question'} />
                    <Figure label="Attempt limits" value={m.limitReached} sub={`questions at their limit · ${m.pendingRequests} request${m.pendingRequests === 1 ? '' : 's'} pending`} tone={m.pendingRequests ? 'text-amber-700 dark:text-amber-400' : undefined} />
                </div>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-3">
                <Panel title="Recordings per week" subtitle="Last 12 weeks" className="lg:col-span-2">
                    <BarSeries valueLabel="recordings" labelEvery={2}
                        data={o.weeks.map(w => ({ label: w.start.slice(5), value: w.recordings, tooltip: <span><strong>{w.recordings}</strong> recordings · week of {fmtDate(w.start)}{w.averageScore !== null ? ` · avg ${w.averageScore}/10` : ''}</span> }))} />
                </Panel>
                <Panel title="Evaluation status" subtitle={`${m.recordings} recordings`}>
                    {m.recordings === 0 ? <p className="text-sm text-gray-500">No recordings yet.</p> : (
                        <SplitBar label="Evaluation status" parts={[
                            { label: o.evaluation[0].label, value: o.evaluation[0].value, className: 'bg-[#2a78d6] dark:bg-[#3987e5]' },
                            { label: o.evaluation[1].label, value: o.evaluation[1].value, className: 'bg-[#0ca30c]' },
                            { label: o.evaluation[2].label, value: o.evaluation[2].value, className: 'bg-[#fab219]' },
                            { label: o.evaluation[3].label, value: o.evaluation[3].value, className: 'bg-[#d03b3b]' },
                        ]} />
                    )}
                </Panel>
            </div>

            {qCourses.length > 0 && (
                <Panel title="Completion by course" subtitle="Audio questions practised at least once (scored)">
                    <HBars unit="%" max={100} items={qCourses.map(c => ({ label: c.title, value: c.completion ?? 0, note: `· ${c.completed}/${c.activities}` }))} />
                </Panel>
            )}

            <RecentRecordings studentId={studentId} first={o.recent} onOpen={onOpen} />

            <section>
                <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Courses</h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {o.courses.map(c => <CourseCard key={c.courseId} c={c} onOpen={() => onSelect(c.courseId)} />)}
                </ul>
            </section>
        </>
    );
}

function CourseCard({ c, onOpen }: { c: AudioCourseCard; onOpen: () => void }) {
    const logic = c.kind === 'PROBLEM_LOGIC';
    return (
        <li className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-5 w-5 text-gray-400" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-white" title={c.title}>{c.title}</p>
                    <p className="text-xs text-gray-500">{logic ? 'Problem approach explanations' : `${c.activities} audio questions`} · last recording {fmtRelative(c.lastRecordingAt, 'never')}</p>
                </div>
            </div>
            {!logic && <ProgressBar value={c.completion} className="mt-3" label={`${c.title} audio completion`} />}
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-gray-500">{logic ? 'Problems' : 'Completed'}</dt><dd className="font-semibold tabular-nums text-gray-900 dark:text-white">{logic ? c.completed : `${c.completed}/${c.activities}`}</dd></div>
                <div><dt className="text-gray-500">Recordings</dt><dd className="font-semibold tabular-nums text-gray-900 dark:text-white">{c.recordings}</dd></div>
                <div><dt className="text-gray-500">Evaluated</dt><dd className="font-semibold tabular-nums text-gray-900 dark:text-white">{c.evaluated}{c.awaitingEvaluation ? <span className="font-normal text-gray-500"> · {c.awaitingEvaluation} awaiting</span> : null}</dd></div>
            </dl>
            {(c.pendingRequests > 0 || c.limitReached > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.pendingRequests > 0 && <Pill tone="info">{c.pendingRequests} attempt request{c.pendingRequests === 1 ? '' : 's'}</Pill>}
                    {c.limitReached > 0 && <Pill tone="inactive">{c.limitReached} at attempt limit</Pill>}
                </div>
            )}
            <button type="button" onClick={onOpen} className={`${btnSecondary} mt-4 justify-center`}>View course audio <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </li>
    );
}

function RecentRecordings({ studentId, first, onOpen }: { studentId: string; first: AudioOverview['recent']; onOpen: (x: Opened) => void }) {
    const [page, setPage] = useState(1);
    const [all, setAll] = useState(false);
    const paged = useAsync(() => adminInsightsService.audioRecent(studentId, page, 10), `recent:${studentId}:${page}`, all);
    const rows = all ? paged.data?.data ?? [] : first.data;
    const total = all ? paged.data?.total ?? first.total : first.total;
    return (
        <Panel title="Recent recordings" subtitle={`${first.total} in total`} actions={first.total > first.data.length && !all ? <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setAll(true)}>View all</button> : undefined}>
            {first.total === 0 ? <p className="text-sm text-gray-500">No recordings yet.</p> : all && paged.loading && !paged.data ? <SkeletonBlock rows={3} /> : (
                <>
                    <RecordingList rows={rows} onOpen={onOpen} />
                    {all && total > 10 && (
                        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-gray-500">
                            <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Newer</button>
                            <span>Page {page} of {Math.ceil(total / 10)}</span>
                            <button type="button" className={btnSecondary} disabled={page * 10 >= total} onClick={() => setPage(p => p + 1)}>Older</button>
                        </div>
                    )}
                </>
            )}
        </Panel>
    );
}

function RecordingList({ rows, onOpen }: { rows: RecentRecording[]; onOpen: (x: Opened) => void }) {
    return (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(r => (
                <li key={r.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{r.questionTitle}</p>
                        <p className="truncate text-xs text-gray-500">{r.courseTitle} · {r.group} · attempt {r.attemptNumber} of {r.allowed} · {fmtDateTime(r.submittedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AttemptStatus a={r} />
                        <button type="button" onClick={() => onOpen({ courseId: r.courseId, attemptId: r.id, kind: r.kind })} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Report
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function AttemptStatus({ a }: { a: AudioAttempt }) {
    if (a.status === 'COMPLETED') {
        return <span className="inline-flex items-center gap-1.5">{a.reviewDecision && <Pill tone="active" title={`Reviewed: ${a.reviewDecision.toLowerCase()}`}>Reviewed</Pill>}<ScorePill score={a.reviewedScore ?? a.score} /></span>;
    }
    if (PROCESSING.includes(a.status)) return <Pill tone="info">Being evaluated</Pill>;
    if (a.status === 'FAILED') return <Pill tone="danger">Failed{a.refunded ? ' · refunded' : ''}</Pill>;
    return <Pill>{a.status.toLowerCase()}</Pill>;
}

/* ───────────── One course ───────────── */

const FILTERS: { id: string; label: string; test: (i: AudioItem) => boolean }[] = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'completed', label: 'Completed', test: i => i.best !== null },
    { id: 'pending', label: 'Not practised', test: i => i.attempts.length === 0 },
    { id: 'evaluated', label: 'Evaluated', test: i => i.attempts.some(a => a.status === 'COMPLETED') },
    { id: 'awaiting', label: 'Awaiting evaluation', test: i => i.attempts.some(a => PROCESSING.includes(a.status)) },
    { id: 'multiple', label: 'Multiple attempts', test: i => i.attempts.length > 1 },
    { id: 'requested', label: 'Extra attempts requested', test: i => !!i.limit.latestRequest },
];
const lastAt = (i: AudioItem) => i.attempts.reduce((m, a) => Math.max(m, +new Date(a.submittedAt)), 0);
const SORTS: { id: string; label: string; cmp: (a: AudioItem, b: AudioItem) => number }[] = [
    { id: 'course', label: 'Course order', cmp: () => 0 },
    { id: 'recent', label: 'Most recent', cmp: (a, b) => lastAt(b) - lastAt(a) },
    { id: 'oldest', label: 'Oldest', cmp: (a, b) => (lastAt(a) || Infinity) - (lastAt(b) || Infinity) },
    { id: 'high', label: 'Highest score', cmp: (a, b) => (b.best ?? -1) - (a.best ?? -1) },
    { id: 'low', label: 'Lowest score', cmp: (a, b) => (a.best ?? 11) - (b.best ?? 11) },
    { id: 'attempts', label: 'Most attempts', cmp: (a, b) => b.attempts.length - a.attempts.length },
];

function CourseAudio({ studentId, courseId, card, onBack, onOpen }: { studentId: string; courseId: string; card: AudioCourseCard | null; onBack: () => void; onOpen: (x: Opened) => void }) {
    const state = useAsync(() => adminInsightsService.audioCourse(studentId, courseId), `audio-course:${studentId}:${courseId}`);
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('course');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const toggle = (id: string) => setExpanded(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    return (
        <div className="space-y-5">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All courses
            </button>
            <Async state={state} skeleton={<SkeletonBlock rows={4} />}>
                {c => {
                    const test = FILTERS.find(f => f.id === filter)!.test;
                    const cmp = SORTS.find(s => s.id === sort)!.cmp;
                    const groups = c.groups.map(g => ({ ...g, items: g.items.filter(test).sort(cmp) })).filter(g => g.items.length);
                    const counts = Object.fromEntries(FILTERS.map(f => [f.id, c.groups.reduce((n, g) => n + g.items.filter(f.test).length, 0)]));
                    return (
                        <>
                            <Panel title={c.title} subtitle={c.kind === 'PROBLEM_LOGIC' ? 'Problem approach explanations' : 'Audio questions'}>
                                {card && (
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                                        <Figure label={c.kind === 'PROBLEM_LOGIC' ? 'Problems explained' : 'Completed'} value={c.kind === 'PROBLEM_LOGIC' ? card.completed : `${card.completed}/${card.activities}`} sub={card.completion !== null ? `${card.completion}%` : undefined} />
                                        <Figure label="Recordings" value={card.recordings} />
                                        <Figure label="Evaluated" value={card.evaluated} sub={card.awaitingEvaluation ? `${card.awaitingEvaluation} awaiting` : undefined} />
                                        <Figure label="At attempt limit" value={card.limitReached} sub={card.pendingRequests ? `${card.pendingRequests} pending request${card.pendingRequests === 1 ? '' : 's'}` : undefined} />
                                        <Figure label="Last recording" value={fmtRelative(card.lastRecordingAt, '—')} />
                                    </div>
                                )}
                            </Panel>

                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter questions">
                                    {FILTERS.map(f => (
                                        <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.id ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                                            {f.label} <span className="tabular-nums opacity-70">{counts[f.id]}</span>
                                        </button>
                                    ))}
                                </div>
                                <select aria-label="Sort questions" className={inputCls} value={sort} onChange={e => setSort(e.target.value)}>
                                    {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>

                            {groups.length === 0 ? <Empty title="No questions match this filter" /> : (
                                <div className="space-y-3">
                                    {groups.map((g, gi) => (
                                        <details key={g.title} open={gi === 0 || filter !== 'all'} className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                                                <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" aria-hidden="true" />
                                                <span className="flex-1 font-medium text-gray-900 dark:text-white">{g.title}</span>
                                                <span className="text-xs text-gray-500">{g.items.filter(i => i.best !== null).length}/{g.items.length} completed</span>
                                            </summary>
                                            <ul className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                                                {g.items.map(q => {
                                                    const open = expanded.has(q.questionId);
                                                    return (
                                                        <li key={q.questionId}>
                                                            <button type="button" onClick={() => toggle(q.questionId)} aria-expanded={open} disabled={q.attempts.length === 0}
                                                                className="flex w-full flex-wrap items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 disabled:cursor-default disabled:hover:bg-transparent">
                                                                {q.attempts.length ? (open ? <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />) : <span className="w-4" />}
                                                                <span className="min-w-0 flex-1 text-sm text-gray-900 dark:text-white">
                                                                    {q.title}{q.difficulty && <span className="ml-1 text-xs text-gray-500">{q.difficulty}</span>}{!q.isActive && <span className="ml-1 text-xs text-gray-400">(inactive)</span>}
                                                                </span>
                                                                {q.attempts.length === 0 ? <span className="text-xs text-gray-400">Not practised</span> : (
                                                                    <>
                                                                        <span className="text-xs text-gray-500">Best</span><ScorePill score={q.best} />
                                                                        <span className="text-xs text-gray-500">Latest</span><ScorePill score={q.latest} />
                                                                    </>
                                                                )}
                                                                <Pill tone={q.limit.limitReached ? 'inactive' : 'neutral'} title="Attempts used of allowed">{q.limit.used}/{q.limit.allowed}{q.limit.additionalGranted ? ` (+${q.limit.additionalGranted})` : ''}</Pill>
                                                                {q.limit.latestRequest && (
                                                                    <Pill tone={q.limit.latestRequest.status === 'PENDING' ? 'info' : q.limit.latestRequest.status === 'APPROVED' ? 'active' : 'danger'}>
                                                                        Request {q.limit.latestRequest.status.toLowerCase()}
                                                                    </Pill>
                                                                )}
                                                            </button>
                                                            {open && (
                                                                <div className="px-4 pb-3 pl-10">
                                                                    {q.limit.latestRequest && (
                                                                        <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                                                                            Asked for +{q.limit.latestRequest.requested} on {fmtDate(q.limit.latestRequest.createdAt)}{q.limit.latestRequest.reason ? `: “${q.limit.latestRequest.reason}”` : ''}
                                                                            {q.limit.latestRequest.approved !== null ? ` · granted ${q.limit.latestRequest.approved}` : ''}
                                                                        </p>
                                                                    )}
                                                                    <ol className="space-y-1.5">
                                                                        {q.attempts.slice().sort((a, b) => b.attemptNumber - a.attemptNumber).map(a => (
                                                                            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm">
                                                                                <span className="font-medium text-gray-800 dark:text-gray-200">Attempt {a.attemptNumber}</span>
                                                                                <span className="text-xs text-gray-500">{fmtDateTime(a.submittedAt)}</span>
                                                                                <span className="flex-1" />
                                                                                <AttemptStatus a={a} />
                                                                                <button type="button" onClick={() => onOpen({ courseId, attemptId: a.id, kind: c.kind })} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                                                                                    <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Transcript &amp; report
                                                                                </button>
                                                                            </li>
                                                                        ))}
                                                                    </ol>
                                                                </div>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </details>
                                    ))}
                                </div>
                            )}
                            {c.limitations.map(l => <DataNote key={l}>{l}</DataNote>)}
                        </>
                    );
                }}
            </Async>
        </div>
    );
}

function AttemptViewer({ opened, onClose }: { opened: Opened; onClose: () => void }) {
    const content = opened;
    if (!content) return null;
    if (content.kind === 'PROBLEM_LOGIC') return <LogicAttemptDetail courseId={content.courseId} attemptId={content.attemptId} onClose={onClose} />;
    return (
        <Modal open onClose={onClose} size="2xl" title="Speaking attempt">
            <AttemptDetailView courseId={content.courseId} attemptId={content.attemptId} onBack={onClose} />
        </Modal>
    );
}

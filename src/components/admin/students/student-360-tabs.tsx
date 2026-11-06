"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Circle, ExternalLink, FileText, Grid3x3, Video } from 'lucide-react';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import type { CourseDetail, MeetingOcc } from '@/types/admin-insights';
import type { MeetingOccurrence } from '@/types/meeting';
import type { QuestionStatus } from '@/types/structured-questions';
import { QuestionStatusBadge } from '@/components/courses/structured-questions/QuestionStatusBadge';
import { StudentDrawer } from '@/components/courses/structured-questions/StudentDrawer';
import { AttemptDetailView, ScorePill } from '@/components/courses/speaking/SpeakingAnalytics';
import { LogicAttemptDetail } from '@/components/admin/problem-solving/LogicAssessmentsTab';
import { MeetingCard } from '@/components/meetings/meeting-card';
import { Modal } from '@/components/ui/modal';
import {
    Async, DataNote, EVENT_LABEL, Empty, Figure, Panel, Pill, ProgressBar, SkeletonBlock, VIA_LABEL, fmtDate, fmtDateTime, fmtRelative, inputCls, btnSecondary, useAsync,
} from '../insights/ui';
import { ActivityHeatmap, BarSeries, COURSE_PARTS, SplitBar } from '../insights/charts';

/* ═════════════════════════ Courses ═════════════════════════ */

export function CoursesTab({ studentId }: { studentId: string }) {
    const state = useAsync(() => adminInsightsService.courses(studentId), `courses:${studentId}`);
    const [open, setOpen] = useState<string | null>(null);
    return (
        <Async state={state} skeleton={<SkeletonBlock rows={4} />}>
            {({ courses }) => courses.length === 0 ? <Empty icon={<BookOpen className="h-10 w-10" />} title="No courses">This student has no purchased, assigned, batch, bundle or full-access courses.</Empty> : (
                <ul className="space-y-3">
                    {courses.map(c => (
                        <li key={c.courseId} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <button type="button" onClick={() => setOpen(open === c.courseId ? null : c.courseId)} aria-expanded={open === c.courseId} className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-5 w-5 text-gray-400" aria-hidden="true" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium text-gray-900 dark:text-white">{c.title}</span>
                                        <span className="block text-xs text-gray-500">
                                            {c.enrollment.via.map(v => VIA_LABEL[v] ?? v).join(' · ') || 'Access'}
                                            {c.enrollment.batches.length ? ` (${c.enrollment.batches.map(b => b.name).join(', ')})` : ''}
                                            {c.enrollment.enrolledAt ? ` · since ${fmtDate(c.enrollment.enrolledAt)}` : ''}
                                        </span>
                                    </span>
                                </div>
                                <CourseFigures c={c} />
                                <div className="flex items-center gap-3 sm:w-56">
                                    <ProgressBar value={c.progress} tone={c.status === 'completed' ? 'green' : 'blue'} className="flex-1" label={`${c.title} progress`} />
                                    {open === c.courseId ? <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />}
                                </div>
                            </button>
                            {open === c.courseId && <CourseTreeView studentId={studentId} courseId={c.courseId} />}
                        </li>
                    ))}
                </ul>
            )}
        </Async>
    );
}

function CourseFigures({ c }: { c: CourseDetail }) {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 sm:w-72">
            <span>{c.completedUnits}/{c.totalUnits} {c.unitLabel}</span>
            {c.modules && c.unitLabel === 'lessons' && c.modules.total > 1 && <span>{c.modules.completed}/{c.modules.total} modules</span>}
            {c.assignments && c.assignments.total > 0 && <span>{c.assignments.finished}/{c.assignments.total} assignments</span>}
            {c.audio && c.audio.total > 0 && <span>{c.audio.practised}/{c.audio.total} audio</span>}
            <span>{c.status === 'completed' ? `Completed ${fmtDate(c.completedAt)}` : `Last activity ${fmtRelative(c.lastActivityAt, 'none')}`}</span>
        </div>
    );
}

function CourseTreeView({ studentId, courseId }: { studentId: string; courseId: string }) {
    const state = useAsync(() => adminInsightsService.courseTree(studentId, courseId), `tree:${studentId}:${courseId}`);
    return (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
            <Async state={state} skeleton={<SkeletonBlock rows={2} />}>
                {t => (
                    <div className="space-y-4">
                        {t.current && (
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
                                <strong>Where they are:</strong>{' '}
                                {t.current.lastCompleted ? <>last finished “{t.current.lastCompleted.title}” ({t.current.lastCompleted.module}, {fmtDateTime(t.current.lastCompleted.at)})</> : 'no lesson finished yet'}
                                {t.current.next ? <> · next up “{t.current.next.title}” ({t.current.next.module})</> : ' · every lesson is done'}
                            </div>
                        )}
                        {t.modules && (
                            <div className="space-y-2">
                                {t.modules.map(m => (
                                    <details key={m.id} className="rounded-xl border border-gray-100 dark:border-gray-800" open={m.completed > 0 && m.completed < m.total}>
                                        <summary className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                                            <span className="min-w-0 flex-1 truncate font-medium text-gray-800 dark:text-gray-200">{m.title}</span>
                                            <span className="text-xs text-gray-500 tabular-nums">{m.completed}/{m.total}</span>
                                            {m.total > 0 && m.completed === m.total && <Pill tone="active">Module complete</Pill>}
                                        </summary>
                                        <ul className="divide-y divide-gray-50 dark:divide-gray-800/60 px-3 pb-2">
                                            {m.lessons.map(l => (
                                                <li key={l.id} className="flex items-center gap-2 py-1.5 text-sm">
                                                    {l.completed ? <CheckCircle2 className="h-4 w-4 text-[#0ca30c]" aria-label="Completed" /> : <Circle className="h-4 w-4 text-gray-300" aria-label="Not completed" />}
                                                    <span className={`flex-1 ${l.completed ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500'}`}>{l.title}</span>
                                                    {l.completedAt && <time className="text-xs text-gray-500">{fmtDate(l.completedAt)}</time>}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                ))}
                            </div>
                        )}
                        {t.activities && t.activities.length > 0 && (
                            <div>
                                <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Activities (questions &amp; assignments)</p>
                                <div className="space-y-3">
                                    {t.activities.map(g => (
                                        <div key={g.topic}>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{g.topic}</p>
                                            <ul className="mt-1 divide-y divide-gray-50 dark:divide-gray-800/60">
                                                {g.items.map(it => (
                                                    <li key={it.id} className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
                                                        <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{it.title}{!it.isActive && <span className="ml-1 text-xs text-gray-400">(inactive)</span>}</span>
                                                        <span className="text-xs text-gray-500">{it.type === 'assignment' ? 'Assignment' : `Audio · ${it.attempts} attempt${it.attempts === 1 ? '' : 's'}`}</span>
                                                        {it.type === 'audio_question' ? <ScorePill score={it.bestScore} /> : <QuestionStatusBadge status={it.status as QuestionStatus} />}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                                <DataNote>Questions are grouped by topic: the course data does not link questions to specific lessons.</DataNote>
                            </div>
                        )}
                        {t.problemSections && <ProblemSections sections={t.problemSections} courseId={t.courseId} />}
                    </div>
                )}
            </Async>
        </div>
    );
}

/* ═════════════════════════ Assignments ═════════════════════════ */

export function AssignmentsTab({ studentId }: { studentId: string }) {
    const state = useAsync(() => adminInsightsService.assignments(studentId), `asg:${studentId}`);
    const [course, setCourse] = useState('');
    const [status, setStatus] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [drawer, setDrawer] = useState<string | null>(null);
    const [attempt, setAttempt] = useState<{ courseId: string; attemptId: string } | null>(null);
    const [test, setTest] = useState<string | null>(null);
    return (
        <Async state={state} skeleton={<SkeletonBlock rows={4} />}>
            {d => {
                const rows = d.assignments.filter(a => (!course || a.courseId === course) && (!status || (status === 'overdue' ? a.overdue : a.status === status)));
                return (
                    <div className="space-y-5">
                        <Panel title="Assignments">
                            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                                <Figure label="Finished" value={`${d.summary.finished}/${d.summary.total}`} />
                                <Figure label="Passed" value={d.summary.passed} />
                                <Figure label="Failed" value={d.summary.failed} />
                                <Figure label="Awaiting assessment" value={d.summary.awaitingAssessment} />
                                <Figure label="Overdue" value={d.summary.overdue} tone={d.summary.overdue ? 'text-[#d03b3b]' : undefined} />
                            </div>
                            <div className="mb-3 flex flex-wrap gap-2">
                                <select aria-label="Course" className={inputCls} value={course} onChange={e => setCourse(e.target.value)}>
                                    <option value="">All courses</option>
                                    {d.courses.map(c => <option key={c.courseId} value={c.courseId}>{c.title}</option>)}
                                </select>
                                <select aria-label="Status" className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                                    <option value="">Any status</option>
                                    <option value="NOT_STARTED">Not started</option>
                                    <option value="IN_PROGRESS">In progress</option>
                                    <option value="COMPLETED">Completed (awaiting assessment)</option>
                                    <option value="PASS">Pass</option>
                                    <option value="FAIL">Fail</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                                {course && (
                                    <Link href={`/admin/courses/${course}/question-progress?student=${encodeURIComponent(studentId)}`} className={btnSecondary}>
                                        <Grid3x3 className="h-4 w-4" aria-hidden="true" /> Course score grid
                                    </Link>
                                )}
                            </div>
                            {rows.length === 0 ? <Empty title={d.assignments.length ? 'No assignments match' : 'No assignments in this student’s courses'} /> : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {rows.map(a => (
                                        <li key={a.questionId} className="py-3">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <button type="button" onClick={() => setExpanded(expanded === a.questionId ? null : a.questionId)} aria-expanded={expanded === a.questionId} className="min-w-0 flex-1 text-left">
                                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">{a.courseTitle}{a.topic ? ` · ${a.topic}` : ''}{!a.isActive ? ' · inactive' : ''}</p>
                                                    <p className="font-medium text-gray-900 dark:text-white">{a.title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {a.dueDate ? `Due ${fmtDate(a.dueDate)}` : 'No due date'}{a.overdue ? ' · overdue' : ''}
                                                        {a.updatedAt ? ` · updated ${fmtDateTime(a.updatedAt)}${a.updatedByRole ? ` by ${a.updatedByRole}` : ''}` : ''}
                                                        {a.assessedBy ? ` · assessed by ${a.assessedBy} ${fmtDate(a.assessedAt)}` : ''}
                                                    </p>
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    {a.overdue && <Pill tone="danger">Overdue</Pill>}
                                                    <QuestionStatusBadge status={a.status as QuestionStatus} />
                                                    <button type="button" onClick={() => setDrawer(a.courseId)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800">Assess</button>
                                                </div>
                                            </div>
                                            {a.assessmentNotes && <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">Feedback: {a.assessmentNotes}</p>}
                                            {expanded === a.questionId && (
                                                <div className="mt-3 space-y-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 p-3 text-sm">
                                                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{a.prompt}</p>
                                                    {a.evaluationCriteria && <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Evaluation criteria:</strong> {a.evaluationCriteria}</p>}
                                                    {a.resourceUrl && <a href={a.resourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">Resource <ExternalLink className="h-3 w-3" aria-hidden="true" /></a>}
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Submission history</p>
                                                    {a.history.length === 0 ? <p className="text-xs text-gray-500">No status changes recorded.</p> : (
                                                        <ul className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                                                            {a.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {h.from} → {h.to} ({h.actor}){h.notes ? ` — “${h.notes}”` : ''}</li>)}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {d.limitations.map(l => <DataNote key={l}>{l}</DataNote>)}
                        </Panel>

                        <Panel title="Tests" subtitle="Every submission with its score; open one to see the actual answers.">
                            {d.tests.length === 0 ? <p className="text-sm text-gray-500">No test submissions.</p> : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-left text-xs text-gray-500"><tr><th className="py-2 pr-3">Test</th><th className="py-2 pr-3">Course</th><th className="py-2 pr-3">Submitted</th><th className="py-2 pr-3">Score</th><th /></tr></thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {d.tests.map(t => (
                                                <tr key={t.submissionId}>
                                                    <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{t.title}</td>
                                                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{t.courseTitle ?? '—'}</td>
                                                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtDateTime(t.submittedAt)}</td>
                                                    <td className="py-2 pr-3 tabular-nums">{t.score}/{t.maxScore}{t.percent !== null ? ` (${t.percent}%)` : ''}</td>
                                                    <td className="py-2 text-right"><button type="button" onClick={() => setTest(t.submissionId)} className="text-blue-600 hover:underline">View answers</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>

                        {drawer && (
                            <StudentDrawer courseId={drawer} userId={studentId} onClose={() => setDrawer(null)}
                                onOpenAttempt={id => setAttempt({ courseId: drawer, attemptId: id })} onAssessed={state.reload} />
                        )}
                        {attempt && <AttemptModal courseId={attempt.courseId} attemptId={attempt.attemptId} onClose={() => setAttempt(null)} />}
                        {test && <TestModal studentId={studentId} submissionId={test} onClose={() => setTest(null)} />}
                    </div>
                );
            }}
        </Async>
    );
}

function TestModal({ studentId, submissionId, onClose }: { studentId: string; submissionId: string; onClose: () => void }) {
    const state = useAsync(() => adminInsightsService.testSubmission(studentId, submissionId), `test:${submissionId}`);
    return (
        <Modal open onClose={onClose} size="lg" title={state.data?.title ?? 'Test submission'} description={state.data ? `Submitted ${fmtDateTime(state.data.submittedAt)} · ${state.data.score}/${state.data.maxScore}` : undefined}>
            <Async state={state}>
                {d => (
                    <ol className="space-y-4">
                        {d.questions.map((q, i) => (
                            <li key={q.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-sm">
                                <p className="font-medium text-gray-900 dark:text-white">{i + 1}. {q.text} <span className="text-xs font-normal text-gray-500">({q.pointsEarned}/{q.points})</span></p>
                                {q.options && <p className="mt-1 text-xs text-gray-500">{Object.entries(q.options).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()}. ${v}`).join('   ')}</p>}
                                <p className="mt-2"><span className="text-gray-500">Answer: </span><span className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{q.answer ?? '— (no answer)'}</span></p>
                                {q.isCorrect !== null && <p className={`mt-1 text-xs font-semibold ${q.isCorrect ? 'text-[#0ca30c]' : 'text-[#d03b3b]'}`}>{q.isCorrect ? 'Correct' : `Incorrect${q.correctAnswer ? ` — correct: ${q.correctAnswer}` : ''}`}</p>}
                            </li>
                        ))}
                    </ol>
                )}
            </Async>
        </Modal>
    );
}

function AttemptModal({ courseId, attemptId, onClose }: { courseId: string; attemptId: string; onClose: () => void }) {
    return (
        <Modal open onClose={onClose} size="2xl" title="Speaking attempt">
            <AttemptDetailView courseId={courseId} attemptId={attemptId} onBack={onClose} />
        </Modal>
    );
}

/* ═════════════════════════ Audio practice ═════════════════════════ */

// Overview-first, course-specific audio view lives in its own module.
export { AudioTab } from './student-360-audio';

/* ═════════════════════════ Problem solving ═════════════════════════ */

export function ProblemsTab({ studentId }: { studentId: string }) {
    const state = useAsync(() => adminInsightsService.problems(studentId), `problems:${studentId}`);
    return (
        <Async state={state} skeleton={<SkeletonBlock rows={4} />}>
            {d => d.courses.length === 0 ? <Empty title="No problem-solving courses">This student has no problem-solving courses.</Empty> : (
                <div className="space-y-5">
                    {d.courses.map(c => (
                        <Panel key={c.courseId} title={c.title} subtitle={`${c.problems?.solved ?? 0}/${c.problems?.total ?? 0} solved · ${c.problems?.attempted ?? 0} attempted · last activity ${fmtRelative(c.lastActivityAt, 'none')}`}>
                            {c.problems && (
                                <div className="mb-4 grid gap-4 sm:grid-cols-3">
                                    {(['easy', 'medium', 'hard'] as const).map(k => {
                                        const v = c.problems!.byDifficulty[k] ?? { solved: 0, total: 0 };
                                        return <div key={k}><p className="mb-1 text-xs capitalize text-gray-500">{k} · {v.solved}/{v.total}</p><ProgressBar value={v.total ? (v.solved / v.total) * 100 : 0} label={`${k} solved`} /></div>;
                                    })}
                                </div>
                            )}
                            <ProblemSections sections={c.sections} courseId={c.courseId} />
                        </Panel>
                    ))}
                    {d.limitations.map(l => <DataNote key={l}>{l}</DataNote>)}
                </div>
            )}
        </Async>
    );
}

const PROBLEM_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
    not_started: { label: 'Not started', tone: 'never' },
    try: { label: 'Trying', tone: 'info' },
    completed: { label: 'Solved', tone: 'active' },
    pass: { label: 'Passed', tone: 'active' },
    fail: { label: 'Failed', tone: 'danger' },
};

function ProblemSections({ sections, courseId }: { sections: { id: string; title: string; problems: import('@/types/admin-insights').ProblemRow[] }[]; courseId: string }) {
    const [onlyTouched, setOnlyTouched] = useState(true);
    const [logic, setLogic] = useState<string | null>(null);
    const shown = sections.map(s => ({ ...s, problems: onlyTouched ? s.problems.filter(p => p.status !== 'not_started' || p.logic.attempts > 0) : s.problems })).filter(s => s.problems.length);
    return (
        <div>
            <label className="mb-2 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <input type="checkbox" checked={onlyTouched} onChange={e => setOnlyTouched(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Only problems the student has worked on
            </label>
            {shown.length === 0 ? <p className="text-sm text-gray-500">{onlyTouched ? 'No problems attempted yet.' : 'No problems in this course.'}</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-gray-500"><tr><th className="py-2 pr-3">Problem</th><th className="py-2 pr-3">Difficulty</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Updates</th><th className="py-2 pr-3">Approach (audio)</th><th className="py-2 pr-3">Last attempt</th><th className="py-2">Resources</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {shown.map(s => [
                                <tr key={`h-${s.id}`}><td colSpan={7} className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.title}</td></tr>,
                                ...s.problems.map(p => {
                                    const st = PROBLEM_STATUS_LABEL[p.status] ?? { label: p.status, tone: 'neutral' };
                                    return (
                                        <tr key={p.id}>
                                            <td className="py-2 pr-3 text-gray-900 dark:text-white">{p.problemUrl ? <a href={p.problemUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.title}</a> : p.title}</td>
                                            <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{p.difficulty ?? '—'}</td>
                                            <td className="py-2 pr-3"><Pill tone={st.tone}>{st.label}</Pill>{p.completedAt && <span className="ml-1 text-xs text-gray-500">{fmtDate(p.completedAt)}</span>}</td>
                                            <td className="py-2 pr-3 tabular-nums text-gray-600 dark:text-gray-400">{p.attempts}</td>
                                            <td className="py-2 pr-3">{p.logic.attempts ? (
                                                <button type="button" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline" onClick={() => setLogic(p.logic.latestAttemptId)}>{p.logic.attempts} · best <ScorePill score={p.logic.best} /></button>
                                            ) : <span className="text-xs text-gray-400">—</span>}</td>
                                            <td className="py-2 pr-3 whitespace-nowrap text-xs text-gray-500">{fmtDateTime(p.lastAttemptAt)}</td>
                                            <td className="py-2 text-xs">
                                                <span className="flex flex-wrap gap-2">
                                                    {p.videos.map((v, i) => <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"><Video className="h-3 w-3" aria-hidden="true" />{v.language ?? 'Video'}</a>)}
                                                    {p.solutionUrl && <a href={p.solutionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"><FileText className="h-3 w-3" aria-hidden="true" />Solution</a>}
                                                    {!p.videos.length && !p.solutionUrl && <span className="text-gray-400">—</span>}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }),
                            ])}
                        </tbody>
                    </table>
                </div>
            )}
            {logic && <LogicAttemptDetail courseId={courseId} attemptId={logic} onClose={() => setLogic(null)} />}
        </div>
    );
}

/* ═════════════════════════ Meetings ═════════════════════════ */

const ATT_TONE: Record<string, string> = { present: 'active', late: 'inactive', absent: 'danger', excused: 'neutral' };

export function MeetingsTab({ studentId }: { studentId: string; anyMeetings?: boolean }) {
    const state = useAsync(() => adminInsightsService.meetings(studentId), `meet:${studentId}`);
    const toOcc = (m: MeetingOcc) => ({ ...m, isRecurring: m.type === 'recurring' } as unknown as MeetingOccurrence);
    return (
        <Async state={state} skeleton={<SkeletonBlock rows={3} />}>
            {d => !d.applicable ? (
                <Empty icon={<Video className="h-10 w-10" />} title="Meetings don’t apply to this student">
                    {d.batches.length === 0 ? 'They are not in any batch.' : `None of their batches (${d.batches.map(b => b.name).join(', ')}) has meetings enabled.`}
                </Empty>
            ) : (
                <div className="space-y-5">
                    {d.attendance && (
                        <Panel title="Attendance" subtitle="Only sessions an admin marked are counted.">
                            {d.attendance.recorded === 0 ? <p className="text-sm text-gray-500">No attendance has been recorded for this student yet.</p> : (
                                <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
                                    <Figure label="Attendance rate" value={d.attendance.rate !== null ? `${d.attendance.rate}%` : '—'} sub={`${d.attendance.recorded} recorded sessions`} />
                                    <SplitBar label="Attendance" parts={[
                                        { label: 'Present', value: d.attendance.present, className: 'bg-[#0ca30c]' },
                                        { label: 'Late', value: d.attendance.late, className: 'bg-[#fab219]' },
                                        { label: 'Absent', value: d.attendance.absent, className: 'bg-[#d03b3b]' },
                                        { label: 'Excused', value: d.attendance.excused, className: COURSE_PARTS.notStarted },
                                    ]} />
                                </div>
                            )}
                        </Panel>
                    )}
                    <Panel title="Upcoming meetings">
                        {d.upcoming.length === 0 ? <p className="text-sm text-gray-500">None scheduled in the next 60 days.</p> : (
                            <div className="space-y-3">{d.upcoming.slice(0, 8).map((m, i) => <MeetingCard key={`${m.id}-${i}`} occ={toOcc(m)} variant="upcoming" />)}</div>
                        )}
                    </Panel>
                    <Panel title="Past meetings (last 60 days)">
                        {d.past.length === 0 ? <p className="text-sm text-gray-500">No past meetings.</p> : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {d.past.map((m, i) => (
                                    <li key={`${m.id}-${i}`} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                                        <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">{m.title}<span className="ml-2 text-xs text-gray-500">{m.batchName}</span></span>
                                        <time className="text-xs text-gray-500">{fmtDateTime(m.start)}</time>
                                        {m.attendance ? <Pill tone={ATT_TONE[m.attendance]}>{m.attendance}</Pill> : <Pill tone="never">Not recorded</Pill>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                    {d.cancelled.length > 0 && (
                        <Panel title="Cancelled meetings">
                            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                {d.cancelled.map(m => <li key={m.id}>{m.title} · {fmtDate(m.startDate)} {m.startTime} <span className="text-xs">(cancelled {fmtDate(m.cancelledAt)})</span></li>)}
                            </ul>
                        </Panel>
                    )}
                    {d.limitations?.map(l => <DataNote key={l}>{l}</DataNote>)}
                </div>
            )}
        </Async>
    );
}

/* ═════════════════════════ Activity ═════════════════════════ */

const RANGES = [
    { label: 'Last 3 months', days: 91 },
    { label: 'Last 6 months', days: 182 },
    { label: 'Last 12 months', days: 365 },
];

export function ActivityTab({ studentId }: { studentId: string }) {
    const [days, setDays] = useState(365);
    const [page, setPage] = useState(1);
    const [type, setType] = useState('');
    const range = useMemo(() => {
        const to = new Date();
        const from = new Date(to.getTime() - (days - 1) * 86_400_000);
        return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }, [days]);
    const state = useAsync(() => adminInsightsService.activity(studentId, { ...range, page, limit: 20, type: type || undefined }), `act:${studentId}:${days}:${page}:${type}`);
    return (
        <Async state={state} skeleton={<SkeletonBlock rows={4} />}>
            {d => (
                <div className="space-y-5">
                    <Panel
                        title="Learning activity"
                        subtitle={`Each square is a day (${d.timezone}). Counted: lessons, problems solved, tests, questions completed, audio answers and approach explanations — never logins.`}
                        actions={
                            <select aria-label="Date range" className={inputCls} value={days} onChange={e => { setDays(Number(e.target.value)); setPage(1); }}>
                                {RANGES.map(r => <option key={r.days} value={r.days}>{r.label}</option>)}
                            </select>
                        }
                    >
                        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <Figure label="Learning actions" value={d.totals.events} sub="in this range" />
                            <Figure label="Active days" value={d.totals.activeDays} sub="in this range" />
                            <Figure label="Current streak" value={`${d.totals.currentStreak} day${d.totals.currentStreak === 1 ? '' : 's'}`} />
                            <Figure label="Longest streak" value={`${d.totals.longestStreak} day${d.totals.longestStreak === 1 ? '' : 's'}`} sub="all recorded history" />
                        </div>
                        <ActivityHeatmap days={d.days} levels={d.levels} />
                        <div className="mt-3 space-y-1">
                            {d.trackingSince ? <DataNote>First recorded learning activity: {fmtDate(d.trackingSince)}. Nothing before that date is shown or estimated.</DataNote> : <DataNote>No learning activity has been recorded for this student.</DataNote>}
                            {d.limitations.map(l => <DataNote key={l}>{l}</DataNote>)}
                        </div>
                    </Panel>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Panel title="Weekly" subtitle="Learning actions per week, last 12 weeks">
                            <BarSeries valueLabel="actions" data={d.weeks.map(w => ({ label: w.start.slice(5), value: w.count, tooltip: <span><strong>{w.count}</strong> actions · {w.activeDays} active days · week of {fmtDate(w.start)}</span> }))} labelEvery={2} />
                        </Panel>
                        <Panel title="Monthly" subtitle="Learning actions per month, last 12 months">
                            <BarSeries valueLabel="actions" data={d.months.map(m => ({ label: new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), value: m.count, tooltip: <span><strong>{m.count}</strong> actions · {m.activeDays} active days · {m.month}</span> }))} />
                        </Panel>
                    </div>

                    <Panel title="Timeline" subtitle={`${d.timeline.total} recorded events`} actions={
                        <select aria-label="Event type" className={inputCls} value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
                            <option value="">All events</option>
                            {Object.entries(EVENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    }>
                        {d.timeline.data.length === 0 ? <p className="text-sm text-gray-500">No events.</p> : (
                            <ol className="relative space-y-3 border-l border-gray-200 dark:border-gray-700 pl-4">
                                {d.timeline.data.map((e, i) => (
                                    <li key={i} className="text-sm">
                                        <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 bg-[#2a78d6] dark:bg-[#3987e5]" aria-hidden="true" />
                                        <p className="text-gray-900 dark:text-white"><span className="font-medium">{EVENT_LABEL[e.type] ?? e.type}</span> · {e.title}</p>
                                        <p className="text-xs text-gray-500">
                                            {fmtDateTime(e.at)}{e.courseTitle && e.courseTitle !== e.title ? ` · ${e.courseTitle}` : ''}
                                            {e.detail?.status ? ` · ${String(e.detail.status).toLowerCase()}` : ''}
                                            {typeof e.detail?.score === 'number' ? ` · score ${e.detail.score}${e.type.endsWith('_submitted') && e.type !== 'assessment_submitted' ? '/10' : ''}` : ''}
                                            {typeof e.detail?.max_score === 'number' ? `/${e.detail.max_score}` : ''}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        )}
                        {d.timeline.total > d.timeline.limit && (
                            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-500">
                                <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Newer</button>
                                <span>Page {page} of {Math.ceil(d.timeline.total / d.timeline.limit)}</span>
                                <button type="button" className={btnSecondary} disabled={page * d.timeline.limit >= d.timeline.total} onClick={() => setPage(p => p + 1)}>Older</button>
                            </div>
                        )}
                    </Panel>
                </div>
            )}
        </Async>
    );
}

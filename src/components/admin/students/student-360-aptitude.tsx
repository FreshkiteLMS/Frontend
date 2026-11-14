"use client";

import { Fragment, useState } from 'react';
import { Calculator, ChevronRight } from 'lucide-react';
import { aptitudeService } from '@/services/api/aptitude.api';
import type { StudentAptitudeCourse } from '@/types/aptitude';
import { ResultBadge, WorkflowBadge, fmtPct } from '@/components/courses/aptitude/aptitude-ui';
import { Async, DataNote, Empty, Figure, Panel, ProgressBar, SkeletonBlock, fmtDateTime, fmtRelative, useAsync } from '../insights/ui';

/** Student 360 › Aptitude: every aptitude course → concept → question, from stored attempts. */
export function AptitudeTab({ studentId }: { studentId: string }) {
    const state = useAsync(() => aptitudeService.studentOverview(studentId), `apt360:${studentId}`);
    const [courseId, setCourseId] = useState<string | null>(null);
    return (
        <Async state={state} skeleton={<SkeletonBlock rows={4} />}>
            {d => d.courses.length === 0 ? <Empty icon={<Calculator className="h-10 w-10" />} title="No aptitude courses">This student is not enrolled in any aptitude course.</Empty> : (
                <div className="space-y-5">
                    <Panel title="Aptitude overview" subtitle={`${d.totals.courses} ${d.totals.courses === 1 ? 'course' : 'courses'} · last activity ${fmtRelative(d.totals.lastActivityAt, 'none')}`}>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                            <Figure label="Concepts" value={d.totals.concepts} />
                            <Figure label="Questions" value={d.totals.total} />
                            <Figure label="Attempted" value={d.totals.attempted} />
                            <Figure label="Completed" value={d.totals.completed} sub={`${d.totals.remaining} remaining`} />
                            <Figure label="Passed / failed" value={`${d.totals.passed} / ${d.totals.failed}`} />
                            <Figure label="Accuracy" value={fmtPct(d.totals.accuracy, 1)} sub={`first try ${fmtPct(d.totals.firstAttemptAccuracy, 1)}`} />
                        </div>
                        <div className="mt-4"><p className="mb-1 text-xs text-gray-500">Overall completion · {d.totals.progress}%</p><ProgressBar value={d.totals.progress} label="Aptitude completion" /></div>
                    </Panel>

                    <Panel title="Courses" subtitle="Select a course for concept and question detail">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="text-left text-xs text-gray-500"><tr>
                                    <th className="py-2 pr-3">Course</th><th className="py-2 pr-3">Concepts</th><th className="py-2 pr-3">Questions</th><th className="py-2 pr-3">Attempted</th>
                                    <th className="py-2 pr-3">Completed</th><th className="py-2 pr-3">Passed</th><th className="py-2 pr-3">Failed</th><th className="py-2 pr-3">Remaining</th>
                                    <th className="py-2 pr-3">Accuracy</th><th className="py-2 pr-3">Completion</th><th className="py-2">Last activity</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {d.courses.map(c => (
                                        <tr key={c.courseId} className={courseId === c.courseId ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}>
                                            <td className="py-2 pr-3">
                                                <button type="button" onClick={() => setCourseId(courseId === c.courseId ? null : c.courseId)} aria-expanded={courseId === c.courseId} className="inline-flex items-center gap-1 font-medium text-gray-900 hover:text-blue-700 dark:text-white">
                                                    <ChevronRight className={`h-4 w-4 transition-transform ${courseId === c.courseId ? 'rotate-90' : ''}`} aria-hidden="true" />{c.title}
                                                </button>
                                                {c.status !== 'active' && <span className="ml-1 text-xs text-gray-500">(unpublished)</span>}
                                            </td>
                                            <td className="py-2 pr-3 tabular-nums">{c.concepts}</td>
                                            <td className="py-2 pr-3 tabular-nums">{c.total}</td>
                                            <td className="py-2 pr-3 tabular-nums">{c.attempted}</td>
                                            <td className="py-2 pr-3 tabular-nums">{c.completed}</td>
                                            <td className="py-2 pr-3 tabular-nums text-green-700 dark:text-green-400">{c.passed}</td>
                                            <td className="py-2 pr-3 tabular-nums text-red-700 dark:text-red-400">{c.failed}</td>
                                            <td className="py-2 pr-3 tabular-nums">{c.remaining}</td>
                                            <td className="py-2 pr-3 tabular-nums">{fmtPct(c.accuracy, 1)}</td>
                                            <td className="py-2 pr-3 tabular-nums">{c.progress}%</td>
                                            <td className="py-2 whitespace-nowrap text-xs text-gray-500">{fmtRelative(c.lastActivityAt, '—')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    {courseId && <CourseDetail studentId={studentId} courseId={courseId} />}
                    <DataNote>{Object.values(d.definitions).join(' ')}</DataNote>
                </div>
            )}
        </Async>
    );
}

function CourseDetail({ studentId, courseId }: { studentId: string; courseId: string }) {
    const state = useAsync(() => aptitudeService.studentCourse(studentId, courseId), `apt360:${studentId}:${courseId}`);
    const [conceptId, setConceptId] = useState<string | null>(null);
    return (
        <Async state={state} skeleton={<SkeletonBlock rows={3} />}>
            {d => (
                <Panel title={d.course.title} subtitle="Concept-wise performance">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="text-left text-xs text-gray-500"><tr>
                                <th className="py-2 pr-3">Concept</th><th className="py-2 pr-3">Questions</th><th className="py-2 pr-3">Attempted</th><th className="py-2 pr-3">Passed</th>
                                <th className="py-2 pr-3">Failed</th><th className="py-2 pr-3">Remaining</th><th className="py-2 pr-3">Accuracy</th><th className="py-2">Completion</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {d.concepts.map(c => (
                                    <Fragment key={c.conceptId}>
                                        <tr className={conceptId === c.conceptId ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}>
                                            <td className="py-2 pr-3">
                                                <button type="button" onClick={() => setConceptId(conceptId === c.conceptId ? null : c.conceptId)} aria-expanded={conceptId === c.conceptId} className="inline-flex items-center gap-1 font-medium text-gray-900 hover:text-blue-700 dark:text-white">
                                                    <ChevronRight className={`h-4 w-4 transition-transform ${conceptId === c.conceptId ? 'rotate-90' : ''}`} aria-hidden="true" />{c.title}
                                                </button>
                                            </td>
                                            <td className="py-2 pr-3 tabular-nums">{c.total}</td>
                                            <td className="py-2 pr-3 tabular-nums">{c.attempted}</td>
                                            <td className="py-2 pr-3 tabular-nums text-green-700 dark:text-green-400">{c.passed}</td>
                                            <td className="py-2 pr-3 tabular-nums text-red-700 dark:text-red-400">{c.failed}</td>
                                            <td className="py-2 pr-3 tabular-nums">{c.remaining}</td>
                                            <td className="py-2 pr-3 tabular-nums">{fmtPct(c.accuracy, 1)}</td>
                                            <td className="py-2 tabular-nums">{c.progress}%</td>
                                        </tr>
                                        {conceptId === c.conceptId && (
                                            <tr><td colSpan={8} className="bg-gray-50 p-3 dark:bg-gray-900/40"><QuestionTable questions={c.questions} /></td></tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}
        </Async>
    );
}

function QuestionTable({ questions }: { questions: StudentAptitudeCourse['concepts'][number]['questions'] }) {
    const [open, setOpen] = useState<string | null>(null);
    if (!questions.length) return <p className="text-sm text-gray-500">No questions in this concept.</p>;
    return (
        <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500"><tr>
                <th className="py-1.5 pr-3">Question</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Latest result</th>
                <th className="py-1.5 pr-3">First attempt</th><th className="py-1.5 pr-3">Attempts</th><th className="py-1.5">Last attempted</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {questions.map(q => (
                    <Fragment key={q.id}>
                        <tr>
                            <td className="max-w-md py-2 pr-3">
                                <button type="button" disabled={!q.history.length} onClick={() => setOpen(open === q.id ? null : q.id)} aria-expanded={open === q.id} className="text-left text-gray-900 enabled:hover:text-blue-700 dark:text-gray-100">
                                    <span className="mr-1 text-xs tabular-nums text-gray-400">{q.number}.</span>
                                    <span className="line-clamp-2">{q.questionText}</span>
                                </button>
                            </td>
                            <td className="py-2 pr-3"><WorkflowBadge status={q.workflowStatus} /></td>
                            <td className="py-2 pr-3"><ResultBadge result={q.latestResult} /></td>
                            <td className="py-2 pr-3"><ResultBadge result={q.firstAttemptResult} /></td>
                            <td className="py-2 pr-3 tabular-nums">{q.attempts}</td>
                            <td className="whitespace-nowrap py-2 text-xs text-gray-500">{fmtDateTime(q.lastAttemptAt)}</td>
                        </tr>
                        {open === q.id && (
                            <tr><td colSpan={6} className="pb-3">
                                <ol className="ml-5 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                                    {q.history.map(a => (
                                        <li key={a.attemptNumber} className="flex flex-wrap items-center gap-2">
                                            <span className="w-10 text-gray-400">#{a.attemptNumber}</span>
                                            <span>Chose <b>{a.selectedOption}</b>{a.selectedOptionText ? ` (${a.selectedOptionText})` : ''}; correct was <b>{a.correctOption}</b></span>
                                            <ResultBadge result={a.isCorrect ? 'pass' : 'fail'} />
                                            <span className="text-gray-400">{fmtDateTime(a.submittedAt)}</span>
                                        </li>
                                    ))}
                                </ol>
                            </td></tr>
                        )}
                    </Fragment>
                ))}
            </tbody>
        </table>
    );
}

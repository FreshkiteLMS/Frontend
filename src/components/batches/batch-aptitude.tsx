"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Calculator } from 'lucide-react';
import { aptitudeService } from '@/services/api/aptitude.api';
import type { BatchAptitudeConcept } from '@/types/aptitude';
import { fmtPct } from '@/components/courses/aptitude/aptitude-ui';
import { Async, DataNote, Empty, Figure, Panel, SkeletonBlock, inputCls, useAsync } from '@/components/admin/insights/ui';

/**
 * Batch › Aptitude: how this batch's members are doing in the batch's aptitude
 * courses. Filter by course and concept; every student row opens Student 360.
 */
export function BatchAptitudeView({ batchId }: { batchId: string }) {
    const [courseId, setCourseId] = useState('');
    const [conceptId, setConceptId] = useState('');
    const state = useAsync(() => aptitudeService.batch(batchId, { courseId: courseId || undefined, conceptId: conceptId || undefined }), `batch-apt:${batchId}:${courseId}:${conceptId}`);
    const studentHref = (userId: string) => `/admin/students/${encodeURIComponent(userId)}?batch=${encodeURIComponent(batchId)}&tab=aptitude`;

    return (
        <Async state={state} skeleton={<SkeletonBlock rows={5} />}>
            {d => d.courses.length === 0 ? (
                <Empty icon={<Calculator className="h-10 w-10" />} title="No aptitude courses in this batch">Add an aptitude course (or a bundle containing one) to the batch to see aptitude analytics here.</Empty>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Course
                            <select className={`${inputCls} mt-1 block min-w-[220px]`} value={courseId} onChange={e => { setCourseId(e.target.value); setConceptId(''); }}>
                                <option value="">All aptitude courses ({d.courses.length})</option>
                                {d.courses.map(c => <option key={c.id} value={c.id}>{c.title}{c.status !== 'active' ? ' (unpublished)' : ''}</option>)}
                            </select>
                        </label>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Concept
                            <select className={`${inputCls} mt-1 block min-w-[220px]`} value={conceptId} onChange={e => setConceptId(e.target.value)} disabled={!courseId}>
                                <option value="">{courseId ? 'All concepts' : 'Choose a course first'}</option>
                                {d.concepts.filter(c => c.courseId === courseId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </label>
                        {state.loading && <span className="pb-2 text-xs text-gray-500" role="status">Updating…</span>}
                    </div>

                    <Panel title="Aptitude performance" subtitle={`${d.summary.eligibleStudents} of ${d.summary.members} batch members enrolled · ${d.summary.studentsStarted} started`}>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            <Figure label="Students enrolled" value={d.summary.eligibleStudents} />
                            <Figure label="Questions" value={d.summary.questions} />
                            <Figure label="Average completion" value={fmtPct(d.summary.averageCompletion, 1)} />
                            <Figure label="Avg first-try accuracy" value={fmtPct(d.summary.averageFirstAttemptAccuracy, 1)} />
                            <Figure label="Avg accuracy" value={fmtPct(d.summary.averageAccuracy, 1)} sub={`all answers ${fmtPct(d.summary.overallAccuracy, 1)}`} />
                            <Figure label="Not started" value={d.notStarted.length} />
                        </div>
                    </Panel>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <ConceptRank title="Highest-performing concepts" rows={d.highestConcepts} tone="text-green-700 dark:text-green-400" />
                        <ConceptRank title="Lowest-performing concepts" rows={d.lowestConcepts} tone="text-red-700 dark:text-red-400" />
                    </div>

                    <Panel title="Concept performance">
                        {d.conceptPerformance.length === 0 ? <p className="text-sm text-gray-500">No concepts yet.</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-sm">
                                    <thead className="text-left text-xs text-gray-500"><tr>
                                        <th className="py-2 pr-3">Concept</th><th className="py-2 pr-3">Questions</th><th className="py-2 pr-3">Students answering</th>
                                        <th className="py-2 pr-3">Answers</th><th className="py-2 pr-3">Accuracy</th><th className="py-2 pr-3">First-try accuracy</th><th className="py-2">Avg completion</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {d.conceptPerformance.map(c => (
                                            <tr key={c.conceptId}>
                                                <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{c.title}</td>
                                                <td className="py-2 pr-3 tabular-nums">{c.questions}</td>
                                                <td className="py-2 pr-3 tabular-nums">{c.studentsAnswered}</td>
                                                <td className="py-2 pr-3 tabular-nums">{c.attempts}</td>
                                                <td className="py-2 pr-3 tabular-nums">{fmtPct(c.accuracy, 1)}</td>
                                                <td className="py-2 pr-3 tabular-nums">{fmtPct(c.firstAttemptAccuracy, 1)}</td>
                                                <td className="py-2 tabular-nums">{fmtPct(c.averageCompletion, 1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Panel title="Needs improvement" subtitle={d.definitions.needsImprovement}>
                            {d.needsImprovement.length === 0 ? <p className="text-sm text-gray-500">No students match.</p> : (
                                <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                                    {d.needsImprovement.map(s => (
                                        <li key={s.userId} className="flex items-center gap-3 py-2">
                                            <Link href={studentHref(s.userId)} className="min-w-0 flex-1 truncate font-medium text-gray-900 hover:underline dark:text-white">{s.name}</Link>
                                            <span className="text-xs text-gray-500">{s.completed} answered</span>
                                            <span className="tabular-nums font-semibold text-red-700 dark:text-red-400">{fmtPct(s.accuracy, 1)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                        <Panel title="Not started" subtitle="Enrolled, no question opened or answered yet">
                            {d.notStarted.length === 0 ? <p className="text-sm text-gray-500">Everyone has started.</p> : (
                                <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                                    {d.notStarted.map(s => (
                                        <li key={s.userId} className="flex items-center gap-3 py-2">
                                            <Link href={studentHref(s.userId)} className="min-w-0 flex-1 truncate font-medium text-gray-900 hover:underline dark:text-white">{s.name}</Link>
                                            <span className="truncate text-xs text-gray-500">{s.email}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    <Panel title="Students" subtitle="Select a student for course, concept and question detail">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="text-left text-xs text-gray-500"><tr>
                                    <th className="py-2 pr-3">Student</th><th className="py-2 pr-3">Completed</th><th className="py-2 pr-3">Passed</th><th className="py-2 pr-3">Failed</th>
                                    <th className="py-2 pr-3">Completion</th><th className="py-2 pr-3">Accuracy</th><th className="py-2">First-try</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {d.students.map(s => (
                                        <tr key={s.userId}>
                                            <td className="py-2 pr-3"><Link href={studentHref(s.userId)} className="font-medium text-gray-900 hover:underline dark:text-white">{s.name}</Link>{s.studentCode && <span className="ml-1.5 text-xs text-gray-400">{s.studentCode}</span>}</td>
                                            <td className="py-2 pr-3 tabular-nums">{s.completed}/{s.total}</td>
                                            <td className="py-2 pr-3 tabular-nums text-green-700 dark:text-green-400">{s.passed}</td>
                                            <td className="py-2 pr-3 tabular-nums text-red-700 dark:text-red-400">{s.failed}</td>
                                            <td className="py-2 pr-3 tabular-nums">{s.progress}%</td>
                                            <td className="py-2 pr-3 tabular-nums">{fmtPct(s.accuracy, 1)}</td>
                                            <td className="py-2 tabular-nums">{fmtPct(s.firstAttemptAccuracy, 1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <DataNote>{[d.definitions.eligible, d.definitions.averageCompletion, d.definitions.accuracy, d.definitions.ranking].join(' ')}</DataNote>
                </div>
            )}
        </Async>
    );
}

function ConceptRank({ title, rows, tone }: { title: string; rows: BatchAptitudeConcept[]; tone: string }) {
    return (
        <Panel title={title}>
            {rows.length === 0 ? <p className="text-sm text-gray-500">Not enough answers yet to rank concepts.</p> : (
                <ol className="space-y-2 text-sm">
                    {rows.map((c, i) => (
                        <li key={c.conceptId} className="flex items-center gap-3">
                            <span className="w-5 text-xs text-gray-400">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-white">{c.title}</span>
                            <span className="text-xs text-gray-500">{c.attempts} answers</span>
                            <span className={`tabular-nums font-semibold ${tone}`}>{fmtPct(c.accuracy, 1)}</span>
                        </li>
                    ))}
                </ol>
            )}
        </Panel>
    );
}

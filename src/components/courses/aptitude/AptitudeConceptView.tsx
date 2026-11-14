"use client";

import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Play } from 'lucide-react';
import type { AptitudeConceptPage, AptitudeQuestionRow } from '@/types/aptitude';
import { DifficultyTag, OutcomeBar, ResultBadge, StatTile, WorkflowBadge, fmtPct, fmtWhen } from './aptitude-ui';

export type QuestionFilter = 'all' | 'not_started' | 'in_progress' | 'completed' | 'pass' | 'fail';

const FILTERS: { id: QuestionFilter; label: string; test: (q: AptitudeQuestionRow) => boolean }[] = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'not_started', label: 'Not started', test: q => q.workflowStatus === 'not_started' },
    { id: 'in_progress', label: 'In progress', test: q => q.workflowStatus === 'in_progress' },
    { id: 'completed', label: 'Completed', test: q => q.workflowStatus === 'completed' },
    { id: 'pass', label: 'Passed', test: q => q.latestResult === 'pass' },
    { id: 'fail', label: 'Failed', test: q => q.latestResult === 'fail' },
];

export function AptitudeConceptView({ data, onBack, onOpenQuestion }: { data: AptitudeConceptPage; onBack: () => void; onOpenQuestion: (questionId: string) => void }) {
    const [filter, setFilter] = useState<QuestionFilter>('all');
    const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, data.questions.filter(f.test).length])) as Record<QuestionFilter, number>, [data.questions]);
    const shown = data.questions.filter(FILTERS.find(f => f.id === filter)!.test);
    const s = data.stats;
    const next = data.questions.find(q => q.workflowStatus !== 'completed') ?? data.questions[0];

    return (
        <div className="space-y-5">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {data.course.title}
            </button>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.concept.title}</h1>
                        <p className="mt-0.5 text-sm text-gray-500">{s.total} {s.total === 1 ? 'question' : 'questions'}</p>
                        {data.concept.description && <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">{data.concept.description}</p>}
                    </div>
                    {next && (
                        <button type="button" onClick={() => onOpenQuestion(next.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                            <Play className="h-4 w-4" aria-hidden="true" /> {s.completed === 0 ? 'Start practice' : s.completed === s.total ? 'Practise again' : 'Continue'}
                        </button>
                    )}
                </div>
                <div className="mt-4"><OutcomeBar total={s.total} passed={s.passed} failed={s.failed} inProgress={s.inProgress} /></div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <StatTile label="Attempted" value={s.attempted} />
                    <StatTile label="Completed" value={s.completed} tone="blue" />
                    <StatTile label="Passed" value={s.passed} tone="green" />
                    <StatTile label="Failed" value={s.failed} tone="red" />
                    <StatTile label="Progress" value={`${s.progress}%`} />
                    <StatTile label="Accuracy" value={fmtPct(s.accuracy)} />
                </div>
            </section>

            <div role="radiogroup" aria-label="Filter questions" className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                    <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                        {f.label} <span className={`ml-1 tabular-nums ${filter === f.id ? 'text-blue-100' : 'text-gray-400'}`}>{counts[f.id]}</span>
                    </button>
                ))}
            </div>

            {shown.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">No questions match this filter.</p>
            ) : (
                <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:divide-gray-800">
                    {shown.map(q => (
                        <li key={q.id}>
                            <button type="button" onClick={() => onOpenQuestion(q.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50 dark:hover:bg-gray-800/50 dark:focus-visible:bg-blue-950/30">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold tabular-nums text-gray-700 dark:bg-gray-800 dark:text-gray-300">{q.number}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-gray-900 dark:text-gray-100">{q.preview}</span>
                                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <WorkflowBadge status={q.workflowStatus} />
                                        <ResultBadge result={q.latestResult} />
                                        <DifficultyTag value={q.difficulty} />
                                        <span className="text-xs text-gray-500">{q.attempts} {q.attempts === 1 ? 'attempt' : 'attempts'}{q.lastAttemptAt ? ` · last ${fmtWhen(q.lastAttemptAt)}` : ''}</span>
                                    </span>
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

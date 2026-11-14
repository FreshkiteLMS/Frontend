"use client";

import { useState } from 'react';
import { ArrowRight, Award, BarChart3, BookOpen, Layers, Target, TrendingDown, XCircle } from 'lucide-react';
import type { AptitudeOverview, AptitudeQuestionRef } from '@/types/aptitude';
import { OutcomeBar, ProgressRing, ResultBadge, StatTile, fmtPct, fmtWhen } from './aptitude-ui';

type View = 'concepts' | 'analytics';

export function AptitudeOverviewView({ data, onOpenConcept, onOpenQuestion }: {
    data: AptitudeOverview;
    onOpenConcept: (conceptId: string) => void;
    onOpenQuestion: (conceptId: string, questionId: string) => void;
}) {
    const [view, setView] = useState<View>('concepts');
    const t = data.totals;

    return (
        <div className="space-y-6">
            {/* Hero */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <ProgressRing value={t.progress} label="Course completion" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Aptitude practice</p>
                        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{data.course.title}</h1>
                        {data.course.description && <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{data.course.description}</p>}
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t.completed} of {t.total} questions completed · {t.remaining} remaining
                        </p>
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    <StatTile label="Concepts" value={t.concepts} />
                    <StatTile label="Questions" value={t.total} />
                    <StatTile label="Attempted" value={t.attempted} sub="opened or answered" />
                    <StatTile label="Completed" value={t.completed} tone="blue" />
                    <StatTile label="Passed" value={t.passed} tone="green" />
                    <StatTile label="Failed" value={t.failed} tone="red" />
                    <StatTile label="Remaining" value={t.remaining} />
                    <StatTile label="Accuracy" value={fmtPct(t.accuracy)} sub={t.attempts ? `${t.correctAttempts}/${t.attempts} answers` : 'no answers yet'} />
                </div>
            </section>

            <div role="tablist" aria-label="Course sections" className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
                {([['concepts', 'Concepts', Layers], ['analytics', 'My analytics', BarChart3]] as const).map(([id, label, Icon]) => (
                    <button key={id} role="tab" type="button" aria-selected={view === id} onClick={() => setView(id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${view === id ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-800 dark:text-blue-300' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                    </button>
                ))}
            </div>

            {view === 'concepts' ? (
                data.concepts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
                        <BookOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                        <p className="mt-2 font-medium text-gray-700 dark:text-gray-300">No questions yet</p>
                        <p className="text-sm text-gray-500">Your instructors haven’t added questions to this course yet.</p>
                    </div>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {data.concepts.map((c, i) => {
                            const action = c.completed === c.total && c.total > 0 ? 'Review' : c.attempted > 0 ? 'Continue' : 'Start';
                            return (
                                <li key={c.conceptId}>
                                    <button type="button" onClick={() => onOpenConcept(c.conceptId)}
                                        className="group flex h-full w-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700">
                                        <span className="flex items-start justify-between gap-3">
                                            <span className="min-w-0">
                                                <span className="text-xs font-semibold text-gray-400">{i + 1}</span>
                                                <span className="block text-base font-semibold text-gray-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{c.title}</span>
                                            </span>
                                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700 dark:bg-gray-800 dark:text-gray-300">{c.progress}%</span>
                                        </span>
                                        <span className="mt-3 block"><OutcomeBar total={c.total} passed={c.passed} failed={c.failed} inProgress={c.inProgress} /></span>
                                        <span className="mt-3 grid grid-cols-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                            <span><b className="tabular-nums text-gray-900 dark:text-white">{c.total}</b> questions</span>
                                            <span><b className="tabular-nums text-gray-900 dark:text-white">{c.attempted}</b> attempted</span>
                                            <span><b className="tabular-nums text-gray-900 dark:text-white">{c.completed}</b> completed</span>
                                            <span className="text-green-700 dark:text-green-400"><b className="tabular-nums">{c.passed}</b> passed</span>
                                            <span className="text-red-700 dark:text-red-400"><b className="tabular-nums">{c.failed}</b> failed</span>
                                            <span>accuracy <b className="tabular-nums text-gray-900 dark:text-white">{fmtPct(c.accuracy)}</b></span>
                                        </span>
                                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                                            {action} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )
            ) : (
                <AnalyticsPanel data={data} onOpenConcept={onOpenConcept} onOpenQuestion={onOpenQuestion} />
            )}
        </div>
    );
}

function AnalyticsPanel({ data, onOpenConcept, onOpenQuestion }: { data: AptitudeOverview; onOpenConcept: (id: string) => void; onOpenQuestion: (c: string, q: string) => void }) {
    const t = data.totals;
    const ins = data.insights;
    if (t.attempts === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
                <BarChart3 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                <p className="mt-2 font-medium text-gray-700 dark:text-gray-300">No answers yet</p>
                <p className="text-sm text-gray-500">Answer a few questions and your performance appears here.</p>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <section aria-labelledby="perf-h">
                <h2 id="perf-h" className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Overall performance</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    <StatTile label="Total questions" value={t.total} />
                    <StatTile label="Attempted" value={t.attempted} />
                    <StatTile label="Completed" value={t.completed} tone="blue" />
                    <StatTile label="Correct answers" value={t.correctAttempts} tone="green" />
                    <StatTile label="Incorrect answers" value={t.incorrectAttempts} tone="red" />
                    <StatTile label="Accuracy" value={fmtPct(t.accuracy, 1)} sub="all answers, retries included" />
                    <StatTile label="First-try accuracy" value={fmtPct(t.firstAttemptAccuracy, 1)} sub={`completion ${t.progress}%`} />
                </div>
            </section>

            <section aria-labelledby="ins-h">
                <h2 id="ins-h" className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Insights</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Insight icon={<Award className="h-5 w-5 text-green-600" />} label="Strongest concept" value={ins.strongestConcept?.title} sub={ins.strongestConcept ? `${fmtPct(ins.strongestConcept.accuracy, 1)} over ${ins.strongestConcept.attempts} answers` : undefined}
                        onClick={ins.strongestConcept ? () => onOpenConcept(ins.strongestConcept!.conceptId) : undefined} />
                    <Insight icon={<TrendingDown className="h-5 w-5 text-amber-600" />} label="Weakest concept" value={ins.weakestConcept?.title} sub={ins.weakestConcept ? `${fmtPct(ins.weakestConcept.accuracy, 1)} over ${ins.weakestConcept.attempts} answers` : undefined}
                        onClick={ins.weakestConcept ? () => onOpenConcept(ins.weakestConcept!.conceptId) : undefined} />
                    <Insight icon={<XCircle className="h-5 w-5 text-red-600" />} label="Most incorrect answers" value={ins.mostIncorrect?.title} sub={ins.mostIncorrect ? `${ins.mostIncorrect.incorrectAttempts} incorrect` : undefined}
                        onClick={ins.mostIncorrect ? () => onOpenConcept(ins.mostIncorrect!.conceptId) : undefined} />
                </div>
                {ins.note && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{ins.note}</p>}
            </section>

            <section aria-labelledby="concept-h" className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <h2 id="concept-h" className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">Concept-wise performance</h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead className="text-left text-xs text-gray-500"><tr>
                            <th className="px-4 py-2 font-medium">Concept</th><th className="px-2 py-2 font-medium">Questions</th><th className="px-2 py-2 font-medium">Attempted</th>
                            <th className="px-2 py-2 font-medium">Passed</th><th className="px-2 py-2 font-medium">Failed</th><th className="px-2 py-2 font-medium">Remaining</th>
                            <th className="px-2 py-2 font-medium">Accuracy</th><th className="px-4 py-2 font-medium">Completion</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.concepts.map(c => (
                                <tr key={c.conceptId}>
                                    <td className="px-4 py-2.5"><button type="button" onClick={() => onOpenConcept(c.conceptId)} className="font-medium text-gray-900 hover:text-blue-700 hover:underline dark:text-white">{c.title}</button></td>
                                    <td className="px-2 py-2.5 tabular-nums">{c.total}</td>
                                    <td className="px-2 py-2.5 tabular-nums">{c.attempted}</td>
                                    <td className="px-2 py-2.5 tabular-nums text-green-700 dark:text-green-400">{c.passed}</td>
                                    <td className="px-2 py-2.5 tabular-nums text-red-700 dark:text-red-400">{c.failed}</td>
                                    <td className="px-2 py-2.5 tabular-nums">{c.remaining}</td>
                                    <td className="px-2 py-2.5 tabular-nums">{fmtPct(c.accuracy, 1)}</td>
                                    <td className="px-4 py-2.5"><span className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><span className="block h-full bg-blue-600" style={{ width: `${c.progress}%` }} /></span><span className="tabular-nums text-xs">{c.progress}%</span></span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
                <QuestionList title="Recently completed" empty="Nothing completed yet." items={ins.recentlyCompleted} onOpen={onOpenQuestion} />
                <QuestionList title="Needs more practice" empty="No questions with a failed latest answer — nice work." items={ins.needsPractice} onOpen={onOpenQuestion} icon={<Target className="h-4 w-4 text-red-500" />} />
            </div>
        </div>
    );
}

function Insight({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value?: string; sub?: string; onClick?: () => void }) {
    const body = (
        <>
            <span className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">{icon}{label}</span>
            <span className="mt-1.5 block truncate text-base font-semibold text-gray-900 dark:text-white">{value ?? 'Not enough data yet'}</span>
            {sub && <span className="block text-xs text-gray-500">{sub}</span>}
        </>
    );
    const cls = 'block w-full rounded-xl border border-gray-200 bg-white p-4 text-left dark:border-gray-800 dark:bg-gray-900';
    return onClick ? <button type="button" onClick={onClick} className={`${cls} hover:border-blue-300 dark:hover:border-blue-700`}>{body}</button> : <div className={cls}>{body}</div>;
}

function QuestionList({ title, empty, items, onOpen, icon }: { title: string; empty: string; items: AptitudeQuestionRef[]; onOpen: (c: string, q: string) => void; icon?: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <h2 className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">{icon}{title}</h2>
            {items.length === 0 ? <p className="px-4 py-6 text-sm text-gray-500">{empty}</p> : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map(it => (
                        <li key={it.questionId}>
                            <button type="button" onClick={() => onOpen(it.conceptId, it.questionId)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-gray-900 dark:text-gray-100">{it.preview}</span>
                                    <span className="text-xs text-gray-500">{it.conceptTitle} · {it.attempts} {it.attempts === 1 ? 'attempt' : 'attempts'} · {fmtWhen(it.lastAttemptAt)}</span>
                                </span>
                                <ResultBadge result={it.result} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

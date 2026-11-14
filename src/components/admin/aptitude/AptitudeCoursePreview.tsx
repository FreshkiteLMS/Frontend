"use client";

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, EyeOff } from 'lucide-react';
import { aptitudeService } from '@/services/api/aptitude.api';
import { Async, useAsync } from '@/components/admin/insights/ui';
import { DifficultyTag, RichQuestionText } from '@/components/courses/aptitude/aptitude-ui';

/**
 * Final preview of an aptitude course: the saved, verified questions exactly
 * as stored (answers and explanations included for the admin). Read-only —
 * corrections happen in the wizard's verification step.
 */
export function AptitudeCoursePreview({ courseId }: { courseId: string }) {
    const state = useAsync(() => aptitudeService.content(courseId), `apt-preview:${courseId}`);
    const [open, setOpen] = useState<Set<string>>(new Set());
    const [showHidden, setShowHidden] = useState(false);
    const back = `/admin/courses/create?id=${encodeURIComponent(courseId)}&step=content`;

    return (
        <Async state={state} skeleton={<div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />}>
            {d => {
                const v = d.verification;
                const concepts = d.concepts.filter(c => c.isActive);
                const visibleCount = (qs: typeof concepts[number]['questions']) => qs.filter(q => q.isActive && q.status !== 'invalid').length;
                const numberOf = new Map(concepts.flatMap(c => c.questions.filter(q => q.isActive && q.status !== 'invalid')).map((q, i) => [q.id, i + 1]));
                return (
                    <div className="space-y-5">
                        <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${v.verified ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}`} role="status">
                            {v.verified ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />}
                            <div className="min-w-0 flex-1 text-sm">
                                {v.verified
                                    ? <p className="text-green-900 dark:text-green-200"><b>Questions verified</b>{v.verifiedAt ? ` on ${new Date(v.verifiedAt).toLocaleString()}` : ''}. This is what students will practise.</p>
                                    : <p className="text-amber-900 dark:text-amber-200"><b>Not verified.</b> {v.blockers.map(b => b.message).join(' ') || 'The questions changed since they were verified.'} The course can’t be published until the questions are verified.</p>}
                            </div>
                            <Link href={back} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to question verification
                            </Link>
                        </div>

                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[['Concepts', concepts.length], ['Questions for students', v.summary.visible], ['Hidden questions', d.totals.questions - v.summary.visible], ['Need review', v.summary.needsReview]].map(([l, val]) => (
                                <div key={l as string} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                                    <dt className="text-xs text-gray-500">{l}</dt><dd className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{val}</dd>
                                </div>
                            ))}
                        </dl>

                        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" aria-label="Course structure">
                            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
                                <h3 className="mr-auto font-semibold text-gray-900 dark:text-white">Concepts and questions</h3>
                                <button type="button" onClick={() => setOpen(open.size ? new Set() : new Set(concepts.map(c => c.id)))} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">{open.size ? 'Collapse all' : 'Expand all'}</button>
                                <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Show hidden questions</label>
                            </div>
                            {concepts.length === 0 ? <p className="p-6 text-sm text-gray-500">No concepts yet.</p> : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {concepts.map((c, ci) => {
                                        const qs = c.questions.filter(q => showHidden || (q.isActive && q.status !== 'invalid'));
                                        const isOpen = open.has(c.id);
                                        return (
                                            <li key={c.id}>
                                                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(s => { const x = new Set(s); if (x.has(c.id)) x.delete(c.id); else x.add(c.id); return x; })} className="flex w-full items-center gap-2 px-5 py-3 text-left">
                                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} aria-hidden="true" />
                                                    <span className="text-xs font-semibold text-gray-400">Concept {ci + 1}</span>
                                                    <span className="flex-1 font-medium text-gray-900 dark:text-white">{c.title}</span>
                                                    <span className="text-xs text-gray-500">{visibleCount(c.questions)} {visibleCount(c.questions) === 1 ? 'question' : 'questions'}</span>
                                                </button>
                                                {isOpen && (
                                                    <ol className="space-y-3 px-5 pb-5">
                                                        {c.description && <p className="text-sm text-gray-500">{c.description}</p>}
                                                        {qs.map(q => {
                                                            const hidden = !q.isActive || q.status === 'invalid';
                                                            return (
                                                                <li key={q.id} className={`rounded-xl border p-4 ${hidden ? 'border-dashed border-gray-300 opacity-70 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700'}`}>
                                                                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{hidden ? 'Hidden' : `Question ${numberOf.get(q.id)}`}</span>
                                                                        <DifficultyTag value={q.difficulty} />
                                                                        {hidden && <span className="inline-flex items-center gap-1"><EyeOff className="h-3 w-3" aria-hidden="true" />not shown to students</span>}
                                                                    </div>
                                                                    <RichQuestionText text={q.questionText} className="text-sm text-gray-900 dark:text-gray-100" />
                                                                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                                                        {q.options.map(o => (
                                                                            <li key={o.id} className={`rounded-lg border px-3 py-1.5 text-sm ${o.id === q.correctOption ? 'border-green-300 bg-green-50 font-semibold text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300' : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'}`}>
                                                                                {o.id}. {o.text}{o.id === q.correctOption && <span className="sr-only"> (correct answer)</span>}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300"><b>Correct answer:</b> {q.correctOption ?? <span className="text-red-600">none</span>}</p>
                                                                    {q.explanation && <div className="mt-1 text-sm text-gray-600 dark:text-gray-400"><b>Explanation:</b> <RichQuestionText text={q.explanation} className="inline" /></div>}
                                                                </li>
                                                            );
                                                        })}
                                                        {qs.length === 0 && <li className="text-sm text-gray-500">No questions shown.</li>}
                                                    </ol>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    </div>
                );
            }}
        </Async>
    );
}

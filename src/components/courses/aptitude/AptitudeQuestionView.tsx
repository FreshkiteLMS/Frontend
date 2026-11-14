"use client";

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, History, Loader2, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { aptitudeService, newRequestId } from '@/services/api/aptitude.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { AptitudeAttemptRow, AptitudeEvaluation, AptitudeProgressView, AptitudeQuestionPage, AptitudeSubmitResult } from '@/types/aptitude';
import { DifficultyTag, ResultBadge, RichQuestionText, WorkflowBadge, fmtWhen } from './aptitude-ui';

export function AptitudeQuestionView({ courseId, data, onBack, onNavigate, onAnswered }: {
    courseId: string;
    data: AptitudeQuestionPage;
    onBack: () => void;
    onNavigate: (questionId: string) => void;
    onAnswered: () => void;
}) {
    const q = data.question;
    const [selected, setSelected] = useState<string | null>(null);
    const [result, setResult] = useState<AptitudeSubmitResult | null>(null);
    const [progress, setProgress] = useState<AptitudeProgressView>(data.progress);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // A retried submission (same question + option) reuses its id, so the server counts it once.
    const pending = useRef<{ key: string; id: string } | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // Opening a question marks it "in progress" (the server never downgrades a completed one).
    useEffect(() => {
        if (data.progress.workflowStatus !== 'not_started') return;
        let alive = true;
        aptitudeService.start(courseId, q.id).then(p => { if (alive) setProgress(p); }).catch(() => { /* non-critical */ });
        return () => { alive = false; };
    }, [courseId, q.id, data.progress.workflowStatus]);

    const submit = async () => {
        if (!selected || submitting) return;
        const key = `${q.id}:${selected}`;
        if (pending.current?.key !== key) pending.current = { key, id: newRequestId() };
        setSubmitting(true);
        setError(null);
        try {
            const r = await aptitudeService.submit(courseId, q.id, selected, pending.current.id);
            pending.current = null;
            setResult(r);
            setProgress(r.progress);
            onAnswered();
            requestAnimationFrame(() => resultRef.current?.focus());
        } catch (err) {
            // Keep `pending` so pressing Submit again retries the same submission.
            setError(apiErrorMessage(err, 'Your answer could not be submitted. Check your connection and try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const tryAgain = () => { setResult(null); setSelected(null); setError(null); };
    const locked = !!result || submitting;
    const shown: AptitudeEvaluation | null = result ?? null;
    const optionText = (id: string | undefined) => q.options.find(o => o.id === id)?.text;

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {data.concept.title}
                </button>
                <WorkflowBadge status={progress.workflowStatus} />
            </div>

            <article className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <header className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <span className="truncate">{data.course.title}</span>
                    <span aria-hidden="true">›</span>
                    <span className="truncate">{data.concept.title}</span>
                    <span className="ml-auto font-semibold text-gray-700 dark:text-gray-300">Question {q.number} of {q.totalInConcept}</span>
                    <DifficultyTag value={q.difficulty} />
                </header>

                <div className="px-5 py-5 sm:px-6">
                    <h1 className="sr-only">Question {q.number}</h1>
                    <RichQuestionText text={q.questionText} className="text-[17px] leading-relaxed text-gray-900 dark:text-gray-100" />

                    <fieldset className="mt-5" disabled={locked || !q.answerable}>
                        <legend className="sr-only">Choose one answer</legend>
                        <div className="space-y-2.5">
                            {q.options.map(o => {
                                const isSel = (shown?.selectedOption ?? selected) === o.id;
                                const isCorrect = shown?.correctOption === o.id;
                                const tone = shown
                                    ? isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : isSel ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 opacity-70 dark:border-gray-700'
                                    : isSel ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:bg-blue-900/20' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50';
                                return (
                                    <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${tone} ${locked ? 'cursor-default' : ''}`}>
                                        <input type="radio" name={`q-${q.id}`} value={o.id} checked={isSel} onChange={() => setSelected(o.id)} className="sr-only" />
                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${isSel && !shown ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'}`}>{o.id}</span>
                                        <RichQuestionText text={o.text} className="flex-1 pt-0.5 text-[15px] text-gray-800 dark:text-gray-200" />
                                        {shown && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-label="Correct answer" />}
                                        {shown && isSel && !isCorrect && <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-label="Your answer" />}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    {!q.answerable && <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">This question can’t be answered yet.</p>}

                    {error && (
                        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
                        </div>
                    )}

                    {shown && (
                        <div ref={resultRef} tabIndex={-1} role="status" className={`mt-5 rounded-xl border p-4 outline-none ${shown.isCorrect ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'}`}>
                            <p className={`flex items-center gap-2 text-lg font-bold ${shown.isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                {shown.isCorrect ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <XCircle className="h-6 w-6" aria-hidden="true" />}
                                {shown.isCorrect ? 'Pass — correct answer' : 'Fail — not quite'}
                            </p>
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                Correct answer: <b>{shown.correctOption}. {optionText(shown.correctOption)}</b>
                            </p>
                            {shown.explanation && (
                                <div className="mt-3 border-t border-black/5 pt-3 dark:border-white/10">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Explanation</p>
                                    <RichQuestionText text={shown.explanation} className="mt-1 text-sm text-gray-800 dark:text-gray-200" />
                                </div>
                            )}
                        </div>
                    )}

                    {!shown && data.review && (
                        <PreviousAnswer review={data.review} optionText={optionText} />
                    )}
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
                    <div className="flex gap-2">
                        <button type="button" onClick={() => data.previousId && onNavigate(data.previousId)} disabled={!data.previousId || submitting}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                        </button>
                        <button type="button" onClick={() => data.nextId && onNavigate(data.nextId)} disabled={!data.nextId || submitting}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 ${shown ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        {shown ? (
                            <button type="button" onClick={tryAgain} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
                            </button>
                        ) : (
                            <>
                                <button type="button" onClick={() => { setSelected(null); setError(null); }} disabled={!selected || submitting}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800">
                                    Clear selection
                                </button>
                                <button type="button" onClick={submit} disabled={!selected || submitting || !q.answerable} aria-busy={submitting}
                                    className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Submitting…</> : error && pending.current ? 'Retry submit' : 'Submit answer'}
                                </button>
                            </>
                        )}
                    </div>
                </footer>
            </article>

            <AttemptHistory courseId={courseId} questionId={q.id} count={progress.attempts} refreshKey={result?.attemptId ?? ''} />
        </div>
    );
}

function PreviousAnswer({ review, optionText }: { review: AptitudeEvaluation; optionText: (id?: string) => string | undefined }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>Your last answer ({review.selectedOption}) on {fmtWhen(review.submittedAt)}:</span>
                <ResultBadge result={review.result} />
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="ml-auto text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                    {open ? 'Hide answer' : 'Show answer'}
                </button>
            </div>
            {open && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    <p>Correct answer: <b>{review.correctOption}. {optionText(review.correctOption) ?? ''}</b></p>
                    {review.questionChangedSince && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">This question was updated after you answered it; your result reflects the version you saw.</p>}
                    {review.explanation && <RichQuestionText text={review.explanation} className="mt-2" />}
                </div>
            )}
            <p className="mt-2 text-xs text-gray-500">Pick an option and submit to try again — every attempt is kept.</p>
        </div>
    );
}

function AttemptHistory({ courseId, questionId, count, refreshKey }: { courseId: string; questionId: string; count: number; refreshKey: string }) {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<AptitudeAttemptRow[] | null>(null);
    useEffect(() => {
        if (!open) return;
        let alive = true;
        aptitudeService.attempts(courseId, questionId).then(r => { if (alive) setRows(r); }).catch(err => toast.error(apiErrorMessage(err, 'Could not load your attempts.')));
        return () => { alive = false; };
    }, [open, courseId, questionId, refreshKey]);
    if (!count) return null;
    return (
        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold text-gray-800 dark:text-gray-200">
                <History className="h-4 w-4 text-gray-400" aria-hidden="true" /> Your attempts ({count})
                <ChevronRight className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>
            {open && (
                <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                    {!rows ? <p className="text-sm text-gray-500">Loading…</p> : (
                        <ol className="space-y-1.5 text-sm">
                            {rows.map(a => (
                                <li key={a.attemptNumber} className="flex flex-wrap items-center gap-2">
                                    <span className="w-16 text-gray-500">#{a.attemptNumber}</span>
                                    <span className="text-gray-800 dark:text-gray-200">Chose {a.selectedOption}</span>
                                    <ResultBadge result={a.isCorrect ? 'pass' : 'fail'} />
                                    <span className="ml-auto text-xs text-gray-500">{fmtWhen(a.submittedAt)}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}
        </section>
    );
}

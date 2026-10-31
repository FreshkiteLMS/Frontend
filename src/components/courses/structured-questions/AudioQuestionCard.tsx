"use client";

import { ArrowRight, Check, Clock, FileText, Loader2, Mic, RotateCcw, TriangleAlert } from 'lucide-react';
import type { StudentQuestion } from '@/types/structured-questions';
import type { QuestionPracticeStats } from '@/types/speaking';
import {
    PRACTICE_STATE_LABELS, PRACTICE_STATE_STYLES, formatRelative, formatScore, practiceState, scoreTone, type PracticeState,
} from '@/lib/speaking';
import { formatMarks } from '@/lib/question-progress';
import { QuestionStatusBadge } from './QuestionStatusBadge';

const ACCENT: Record<PracticeState, string> = {
    NOT_STARTED: 'border-l-gray-300 dark:border-l-gray-700',
    IN_PROGRESS: 'border-l-amber-400',
    PRACTICED: 'border-l-indigo-400',
    PROCESSING: 'border-l-sky-400',
    COMPLETED: 'border-l-emerald-500',
    FAILED: 'border-l-rose-400',
};

const BUBBLE: Record<PracticeState, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    PRACTICED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    PROCESSING: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

/**
 * A practice-first card for one audio question. Progress and score come from
 * the student's AI practice — nothing here is typed in or toggled by hand.
 * One obvious action: start (or continue) practising.
 */
export function AudioQuestionCard({ question, number, practice, readOnly, onOpen }: {
    question: StudentQuestion;
    number: number;
    practice: QuestionPracticeStats | undefined;
    readOnly: boolean;
    onOpen: (openLatestReport: boolean) => void;
}) {
    const state = practiceState(question.progress.status, practice);
    const attempts = practice?.totalAttempts ?? 0;
    const hasReport = (practice?.completedAttempts ?? 0) > 0;
    const best = practice?.bestScore ?? null;
    const instructorOutcome = question.progress.status === 'PASS' || question.progress.status === 'FAIL';
    const Icon = state === 'COMPLETED' ? Check : state === 'PROCESSING' ? Loader2 : state === 'FAILED' ? TriangleAlert : Mic;

    const cta = readOnly ? 'Preview' : state === 'PROCESSING' ? 'View progress' : attempts > 0 ? 'Practice again' : 'Start practicing';
    const CtaIcon = state === 'PROCESSING' ? ArrowRight : attempts > 0 && !readOnly ? RotateCcw : Mic;

    return (
        <li className={`rounded-2xl border border-l-4 border-gray-100 dark:border-gray-800 ${ACCENT[state]} bg-white dark:bg-gray-900 transition-shadow hover:shadow-md dark:hover:shadow-none`}>
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <button
                    type="button"
                    onClick={() => onOpen(false)}
                    className="flex min-w-0 flex-1 items-start gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                    aria-label={`${question.title} — ${PRACTICE_STATE_LABELS[state]}`}
                >
                    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${BUBBLE[state]}`} aria-hidden="true">
                        <Icon className={`h-5 w-5 ${state === 'PROCESSING' ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                    </span>
                    <span className="min-w-0 space-y-1.5">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Question {number}{question.topic ? ` · ${question.topic}` : ''}{question.difficulty ? ` · ${question.difficulty}` : ''}
                        </span>
                        <span className="block text-base font-semibold leading-snug text-gray-900 dark:text-white">{question.title}</span>
                        <span className="line-clamp-2 block text-sm text-gray-500 dark:text-gray-400">{question.prompt}</span>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {state !== 'NOT_STARTED' && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${PRACTICE_STATE_STYLES[state]}`}>
                                    {PRACTICE_STATE_LABELS[state]}
                                </span>
                            )}
                            {instructorOutcome && <QuestionStatusBadge status={question.progress.status} />}
                            {question.expectedDurationMinutes && (
                                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{question.expectedDurationMinutes} min</span>
                            )}
                            {attempts > 0 && <span>{attempts} attempt{attempts === 1 ? '' : 's'}</span>}
                            {practice && attempts > 0 && <span>· {formatRelative(practice.lastActivity)}</span>}
                        </span>
                        {question.progress.assessmentNotes && (
                            <span className="line-clamp-1 block text-xs italic text-gray-500 dark:text-gray-400">Instructor: {question.progress.assessmentNotes}</span>
                        )}
                    </span>
                </button>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                    {best !== null ? (
                        <div className="text-left sm:text-right" aria-label={`Best score ${formatScore(best)} out of 10${practice?.latestScore != null ? `, latest ${formatScore(practice.latestScore)}` : ''}`}>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Best score</p>
                            <p className="leading-none">
                                <span className={`text-3xl font-bold tabular-nums ${scoreTone(best)}`}>{formatScore(best)}</span>
                                <span className="ml-1 text-sm text-gray-400">/10</span>
                            </p>
                            {practice?.latestScore != null && attempts > 1 && <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Latest {formatScore(practice.latestScore)}</p>}
                        </div>
                    ) : question.progress.marksObtained !== null ? (
                        <div className="text-left sm:text-right">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Score</p>
                            <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{formatMarks(question.progress.marksObtained, question.progress.marksMax)}</p>
                        </div>
                    ) : null}
                    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                        <button
                            type="button"
                            onClick={() => onOpen(false)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                            aria-label={`${cta}: ${question.title}`}
                        >
                            <CtaIcon className="h-4 w-4" aria-hidden="true" />{cta}
                        </button>
                        {hasReport && (
                            <button
                                type="button"
                                onClick={() => onOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                                aria-label={`View latest report: ${question.title}`}
                            >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />View latest report
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}

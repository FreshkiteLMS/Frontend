"use client";

import { useCallback, useEffect, useState } from 'react';
import { Activity, ClipboardList, Mic, Target, TrendingDown, TrendingUp, Trophy, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorCode, apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import { speakingService } from '@/services/api/speaking.api';
import {
    QUESTION_STATUS_LABELS,
    QUESTION_STATUSES,
    type QuestionStatus,
    type StudentProgressDetail,
} from '@/types/structured-questions';
import type { StudentSpeakingDetail } from '@/types/speaking';
import { formatRelative, formatScore, scoreTone } from '@/lib/speaking';
import { formatDateTime } from '@/lib/question-progress';
import { QuestionStatusBadge } from './QuestionStatusBadge';
import { ScorePill } from '../speaking/SpeakingAnalytics';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm';

type Tab = 'speaking' | 'assignments';
type Filter = 'all' | 'practised' | 'not_practised' | 'needs_work';

function StatTile({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; tone?: string }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"><span aria-hidden="true">{icon}</span>{label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${tone ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
        </div>
    );
}

/**
 * A student's detail for instructors. Audio questions are shown through their
 * AI practice (attempts, scores, trend, missed concepts) — there is no manual
 * status or score for them. Assignments keep the instructor assessment flow
 * (PASS/FAIL with notes) in their own tab.
 */
export function StudentDrawer({ courseId, userId, onClose, onOpenAttempt, onAssessed }: {
    courseId: string;
    userId: string;
    onClose: () => void;
    onOpenAttempt: (attemptId: string) => void;
    onAssessed: () => void;
}) {
    const [tab, setTab] = useState<Tab>('speaking');
    const [speaking, setSpeaking] = useState<StudentSpeakingDetail | null>(null);
    const [progress, setProgress] = useState<StudentProgressDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [assessing, setAssessing] = useState<string | null>(null);
    const [draft, setDraft] = useState<{ status: QuestionStatus; notes: string }>({ status: 'PASS', notes: '' });
    const [saving, setSaving] = useState(false);

    const loadProgress = useCallback(async () => {
        try {
            setProgress(await structuredCourseService.studentDetail(courseId, userId));
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load this student.'));
        }
    }, [courseId, userId]);

    useEffect(() => {
        setError(null);
        speakingService.studentDetail(courseId, userId).then(setSpeaking, err => setError(apiErrorMessage(err, 'Failed to load this student.')));
        void loadProgress();
    }, [courseId, userId, loadProgress]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (questionId: string, version: number) => {
        setSaving(true);
        try {
            await structuredCourseService.assess(courseId, userId, questionId, { status: draft.status, notes: draft.notes.trim() || null, expectedVersion: version });
            toast.success(`Recorded ${QUESTION_STATUS_LABELS[draft.status].toLowerCase()}`);
            setAssessing(null);
            await loadProgress();
            onAssessed();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'The assessment was not saved.'));
            if (apiErrorCode(err) === 'VERSION_CONFLICT') void loadProgress();
        } finally {
            setSaving(false);
        }
    };

    // ── Speaking numbers, derived from the student's persisted attempts ──
    const audio = speaking?.questions.filter(q => q.isActive || q.attempts.length > 0) ?? [];
    const practised = audio.filter(q => q.bestScore !== null);
    const attemptsTotal = audio.reduce((s, q) => s + q.attempts.length, 0);
    const avgBest = practised.length ? Math.round((practised.reduce((s, q) => s + (q.bestScore ?? 0), 0) / practised.length) * 10) / 10 : null;
    const topBest = practised.length ? Math.max(...practised.map(q => q.bestScore ?? 0)) : null;
    const shown = audio.filter(q =>
        filter === 'all' ? true
            : filter === 'practised' ? q.bestScore !== null
            : filter === 'not_practised' ? q.bestScore === null
            : q.latestScore !== null && q.latestScore < 6
    );

    const assignments = (progress?.questions ?? []).filter(q => q.type === 'assignment');
    const assignmentIds = new Set(assignments.map(a => a.id));
    const history = (progress?.history ?? []).filter(h => assignmentIds.has(h.questionId));
    const done = assignments.filter(a => ['COMPLETED', 'PASS', 'FAIL'].includes(a.progress.status)).length;

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="sd-title">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
            <div className="relative h-full w-full max-w-3xl overflow-y-auto bg-white p-5 shadow-xl dark:bg-gray-900 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 id="sd-title" className="text-xl font-bold text-gray-900 dark:text-white">{speaking?.student.name ?? progress?.student.name ?? 'Student'}</h2>
                        {(speaking?.student.email ?? progress?.student.email) && <p className="text-sm text-gray-500">{speaking?.student.email ?? progress?.student.email}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {error && <div role="alert" className="mb-3 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
                {!speaking && !error && <p className="text-sm text-gray-500">Loading…</p>}

                {speaking && (
                    <>
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatTile icon={<Mic className="h-3.5 w-3.5" />} label="Questions practised" value={`${practised.length}/${audio.filter(q => q.isActive).length}`} sub={`${attemptsTotal} attempt${attemptsTotal === 1 ? '' : 's'}`} />
                            <StatTile icon={<Target className="h-3.5 w-3.5" />} label="Average (best per question)" value={formatScore(avgBest)} sub="out of 10" tone={scoreTone(avgBest)} />
                            <StatTile icon={<Trophy className="h-3.5 w-3.5" />} label="Highest score" value={formatScore(topBest)} tone={scoreTone(topBest)} />
                            <StatTile icon={<ClipboardList className="h-3.5 w-3.5" />} label="Assignments done" value={`${done}/${assignments.length}`} sub={`${assignments.filter(a => a.progress.status === 'PASS').length} passed`} />
                        </div>

                        <div role="tablist" aria-label="Student detail" className="mb-4 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                            {([['speaking', 'AI speaking'], ['assignments', `Assignments (${assignments.length})`]] as [Tab, string][]).map(([id, label]) => (
                                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'speaking' && (
                            <>
                                <div className="mb-3">
                                    <label htmlFor="sd-filter" className="sr-only">Filter questions</label>
                                    <select id="sd-filter" value={filter} onChange={e => setFilter(e.target.value as Filter)} className={`${inputCls} max-w-xs`}>
                                        <option value="all">All audio questions ({audio.length})</option>
                                        <option value="practised">Practised ({practised.length})</option>
                                        <option value="not_practised">Not practised ({audio.length - practised.length})</option>
                                        <option value="needs_work">Needs work (latest below 6)</option>
                                    </select>
                                </div>
                                {shown.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">No questions match.</p> : (
                                    <ul className="space-y-2.5">
                                        {shown.map(q => {
                                            const completed = q.attempts.filter(a => a.status === 'COMPLETED').sort((a, b) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0));
                                            const delta = completed.length > 1 ? Math.round(((completed[completed.length - 1].overallScore ?? 0) - (completed[0].overallScore ?? 0)) * 10) / 10 : null;
                                            if (q.attempts.length === 0) {
                                                return (
                                                    <li key={q.questionId} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 px-4 py-2.5 dark:border-gray-700">
                                                        <p className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-300">{q.title}{!q.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}</p>
                                                        <span className="flex-shrink-0 text-xs text-gray-400">Not practised</span>
                                                    </li>
                                                );
                                            }
                                            return (
                                                <li key={q.questionId} className="rounded-xl border border-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">{q.topic ?? 'Audio question'}{!q.isActive ? ' · inactive' : ''}</p>
                                                            <p className="font-semibold text-gray-900 dark:text-white">{q.title}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-right">
                                                            <div><p className="text-[10px] uppercase tracking-wide text-gray-400">Best</p><ScorePill score={q.bestScore} /></div>
                                                            <div><p className="text-[10px] uppercase tracking-wide text-gray-400">Latest</p><ScorePill score={q.latestScore} /></div>
                                                            {delta !== null && (
                                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                    {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}{delta > 0 ? '+' : ''}{delta}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Attempts on ${q.title}`}>
                                                        {q.attempts.slice().sort((a, b) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0)).map(a => (
                                                            <button key={a.id} type="button" onClick={() => onOpenAttempt(a.id)}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                                                aria-label={`Open attempt ${a.attemptNumber}${a.status === 'COMPLETED' ? `, score ${formatScore(a.overallScore)}` : `, ${a.status.toLowerCase()}`}`}>
                                                                <span className="text-gray-500">#{a.attemptNumber}</span>
                                                                {a.status === 'COMPLETED' ? <ScorePill score={a.overallScore} /> : <span className="text-gray-500">{a.status === 'FAILED' ? 'Failed' : 'Processing'}</span>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {q.latestMissedConcepts.length > 0 && (
                                                        <div className="mt-3">
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Missed in latest attempt</p>
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {q.latestMissedConcepts.map(c => <span key={c} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30">{c}</span>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {q.latestImprovements.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">To improve</p>
                                                            <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                                                                {q.latestImprovements.slice(0, 3).map(t => <li key={t} className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />{t}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-400"><Activity className="h-3 w-3" aria-hidden="true" />Last practised {formatRelative(q.attempts[0]?.submittedAt ?? null)}</p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </>
                        )}

                        {tab === 'assignments' && (
                            assignments.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">This course has no assignments.</p> : (
                                <>
                                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {assignments.map(q => (
                                            <li key={q.id} className="py-3">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Assignment{q.topic ? ` · ${q.topic}` : ''}{!q.isActive ? ' · inactive' : ''}</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{q.title}</p>
                                                        <p className="text-xs text-gray-400">Updated {formatDateTime(q.progress.updatedAt)}{q.progress.updatedByRole ? ` by ${q.progress.updatedByRole}` : ''}</p>
                                                        {q.progress.assessmentNotes && <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">Notes: {q.progress.assessmentNotes}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <QuestionStatusBadge status={q.progress.status} />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAssessing(assessing === q.id ? null : q.id);
                                                                setDraft({ status: q.progress.status === 'FAIL' ? 'FAIL' : 'PASS', notes: q.progress.assessmentNotes ?? '' });
                                                            }}
                                                            aria-expanded={assessing === q.id}
                                                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                                                        >
                                                            Assess
                                                        </button>
                                                    </div>
                                                </div>
                                                {assessing === q.id && (
                                                    <form className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); void submit(q.id, q.progress.version); }}>
                                                        <label className="text-xs text-gray-600 dark:text-gray-400">Status
                                                            <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as QuestionStatus })} className={inputCls}>
                                                                {QUESTION_STATUSES.map(s => <option key={s} value={s}>{QUESTION_STATUS_LABELS[s]}</option>)}
                                                            </select>
                                                        </label>
                                                        <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">Notes (visible to the student)
                                                            <input maxLength={2000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} className={inputCls} />
                                                        </label>
                                                        <div className="flex items-end gap-2">
                                                            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                                                            <button type="button" onClick={() => setAssessing(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancel</button>
                                                        </div>
                                                    </form>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    {history.length > 0 && (
                                        <details className="mt-5">
                                            <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">Activity history ({history.length})</summary>
                                            <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                {history.map(h => (
                                                    <li key={h.id}>
                                                        {formatDateTime(h.createdAt)} — {assignments.find(a => a.id === h.questionId)?.title ?? 'Assignment'}: {QUESTION_STATUS_LABELS[h.fromStatus]} → {QUESTION_STATUS_LABELS[h.toStatus]}
                                                        {' '}({h.kind === 'self_update' ? 'student' : `${h.kind} by ${h.actorRole}`}){h.notes ? ` — “${h.notes}”` : ''}
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

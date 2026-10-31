"use client";

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
    Activity, AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Flag, Loader2, Mic, Search, Target, TrendingDown, TrendingUp, Trophy, UserX, Users, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { speakingService } from '@/services/api/speaking.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type {
    AdminAttemptDetail,
    AdminAttemptRow,
    QuestionAnalytics,
    ReviewDecision,
    SpeakingOverview,
    StudentAnalyticsRow,
} from '@/types/speaking';
import { ATTEMPT_STATUS_LABELS, SCORE_BUCKET_COLORS, formatRelative, formatScore, scoreChip, scoreTone } from '@/lib/speaking';
import { Pagination } from '../structured-questions/Pagination';
import { useDebouncedValue } from '../structured-questions/useDebouncedValue';
import { AssessmentReport, PerformanceBadge } from './AssessmentReport';

const PAGE_SIZE = 25;
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm';
const td = 'py-3 pr-3 align-middle';

export const DECISION_LABELS: Record<ReviewDecision, string> = {
    CONFIRMED: 'Confirmed',
    FLAGGED_INCORRECT: 'Flagged as incorrect',
    SCORE_ADJUSTED: 'Score adjusted',
};

/** Score pill: tinted by level, always with the number (never colour alone). */
export function ScorePill({ score, className = '' }: { score: number | null | undefined; className?: string }) {
    return (
        <span className={`inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ring-1 ring-inset ${scoreChip(score)} ${className}`}>
            {formatScore(score)}
        </span>
    );
}

function Meter({ value, max, tone = 'bg-emerald-500', label }: { value: number; max: number; tone?: string; label: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function Tile({ icon, label, value, sub, accent, tone }: { icon: ReactNode; label: string; value: string | number; sub?: string; accent: string; tone?: string }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`} aria-hidden="true">{icon}</span>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            </div>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${tone ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
        </div>
    );
}

function Card({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${className}`}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">{icon && <span aria-hidden="true">{icon}</span>}{title}</h3>
            <div className="mt-3">{children}</div>
        </section>
    );
}

export function Distribution({ buckets, compact = false }: { buckets: { range: string; count: number }[]; compact?: boolean }) {
    const max = Math.max(1, ...buckets.map(b => b.count));
    if (!buckets.length) return <span className="text-gray-400">—</span>;
    if (compact) {
        return (
            <div className="flex h-8 items-end gap-0.5" role="img" aria-label={`Score distribution: ${buckets.map(b => `${b.range}: ${b.count}`).join(', ')}`}>
                {buckets.map((b, i) => (
                    <div key={b.range} className={`w-3 rounded-t ${SCORE_BUCKET_COLORS[i]}`} style={{ height: `${Math.max(b.count ? 14 : 4, (b.count / max) * 100)}%`, opacity: b.count ? 1 : 0.3 }} title={`${b.range}: ${b.count}`} aria-hidden="true" />
                ))}
            </div>
        );
    }
    const total = buckets.reduce((s, b) => s + b.count, 0);
    return (
        <ul className="space-y-2">
            {buckets.slice().reverse().map(b => {
                const i = buckets.indexOf(b);
                return (
                    <li key={b.range} className="flex items-center gap-3 text-xs">
                        <span className="w-9 tabular-nums text-gray-500 dark:text-gray-400">{b.range}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                            <div className={`h-full rounded ${SCORE_BUCKET_COLORS[i]}`} style={{ width: `${(b.count / max) * 100}%` }} />
                        </div>
                        <span className="w-16 text-right tabular-nums text-gray-700 dark:text-gray-200">{b.count} <span className="text-gray-400">({total ? Math.round((b.count / total) * 100) : 0}%)</span></span>
                    </li>
                );
            })}
        </ul>
    );
}

/** Assessments per day for the last 30 days. */
function ActivityChart({ activity, now }: { activity: SpeakingOverview['activity']; now: number }) {
    const byDate = new Map(activity.map(a => [a.date, a]));
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now - (29 - i) * 86400_000);
        const key = d.toISOString().slice(0, 10);
        return { key, ...(byDate.get(key) ?? { attempts: 0, averageScore: null }) };
    });
    const max = Math.max(1, ...days.map(d => d.attempts));
    if (activity.length === 0) return <p className="py-6 text-center text-sm text-gray-500">No assessments in the last 30 days.</p>;
    return (
        <div>
            <div className="flex h-28 items-end gap-[3px]" role="img" aria-label={`Assessments per day, last 30 days: ${activity.map(a => `${a.date}: ${a.attempts}`).join(', ')}`}>
                {days.map(d => (
                    <div key={d.key} className="flex flex-1 flex-col justify-end" title={d.attempts ? `${d.key}: ${d.attempts} assessment${d.attempts === 1 ? '' : 's'}, avg ${formatScore(d.averageScore)}` : `${d.key}: none`} aria-hidden="true">
                        <div className={`rounded-t ${d.attempts ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ height: d.attempts ? `${Math.max(8, (d.attempts / max) * 100)}%` : '3px' }} />
                    </div>
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400" aria-hidden="true"><span>{days[0].key.slice(5)}</span><span>today</span></div>
        </div>
    );
}

// ── Attempt detail with review ──────────────────────────────────────────────

export function AttemptDetailView({ courseId, attemptId, onBack }: { courseId: string; attemptId: string; onBack: () => void }) {
    const [d, setD] = useState<AdminAttemptDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [decision, setDecision] = useState<ReviewDecision>('CONFIRMED');
    const [adjusted, setAdjusted] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setD(await speakingService.attemptDetail(courseId, attemptId));
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load this attempt.'));
        }
    }, [courseId, attemptId]);
    useEffect(() => { void load(); }, [load]);

    const submitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await speakingService.review(courseId, attemptId, {
                decision,
                adjustedScore: decision === 'SCORE_ADJUSTED' ? Number(adjusted) : null,
                notes: notes.trim(),
            });
            toast.success('Review recorded');
            setNotes('');
            setAdjusted('');
            await load();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not record the review.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </button>
            {error && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">{error}</p>}
            {!d && !error && <p className="py-8 text-center text-sm text-gray-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Loading…</p>}
            {d && (
                <>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{d.student.name} <span className="font-normal text-gray-500">{d.student.email}</span></p>
                                <p className="text-gray-600 dark:text-gray-300">{d.question?.title} · attempt {d.attemptNumber}</p>
                            </div>
                            <span className="text-xs text-gray-500">{ATTEMPT_STATUS_LABELS[d.status]} · submitted {d.submittedAt ? new Date(d.submittedAt).toLocaleString() : '—'}</span>
                        </div>
                        {d.question?.expectedAnswer && (
                            <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-300">Reference answer used by the evaluator</summary>
                                <p className="mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{d.question.expectedAnswer}</p>
                            </details>
                        )}
                        {d.error && <p className="mt-2 text-red-700 dark:text-red-300">{d.error.code}: {d.error.message}</p>}
                        <p className="mt-3 text-[11px] text-gray-400">
                            Audio: {d.audio.received ? `received, deleted ${d.audio.deletedAt ? new Date(d.audio.deletedAt).toLocaleString() : '(pending)'} (${d.processingMeta.audioDeletionReason ?? '—'})` : 'not received'} — recordings are not retained and cannot be played.
                            {' '}Transcription tries {d.processingMeta.transcriptionAttempts}, evaluation tries {d.processingMeta.evaluationAttempts}. Consent {d.processingMeta.consentNoticeVersion}.
                        </p>
                    </div>

                    {d.report ? (
                        <AssessmentReport report={d.report} transcript={d.transcript} audioMetrics={d.audioMetrics} idPrefix={`adm-${d.id.slice(0, 8)}`} />
                    ) : d.transcript ? (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm">
                            <p className="font-semibold">Transcript</p>
                            <p className="mt-2 whitespace-pre-wrap">{d.transcript.text}</p>
                        </div>
                    ) : null}

                    <section aria-labelledby="rv-h" className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm">
                        <h3 id="rv-h" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><Flag className="h-4 w-4" aria-hidden="true" />Administrative review</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Reviews are recorded separately; the original AI assessment is never changed.</p>
                        {d.reviews.length > 0 && (
                            <ul className="mt-3 space-y-2">
                                {d.reviews.map(r => (
                                    <li key={r.id} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-2.5">
                                        <p className="font-medium">{DECISION_LABELS[r.decision]}{r.adjustedScore !== null ? ` — ${formatScore(r.originalScore)} → ${formatScore(r.adjustedScore)}` : ''}</p>
                                        {r.notes && <p className="text-gray-600 dark:text-gray-300">{r.notes}</p>}
                                        <p className="text-[11px] text-gray-400">{r.reviewerName ?? r.reviewerId} ({r.reviewerRole}) · {new Date(r.createdAt).toLocaleString()}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {d.status === 'COMPLETED' && (
                            <form onSubmit={submitReview} className="mt-3 grid gap-3 sm:grid-cols-3">
                                <label className="text-xs text-gray-600 dark:text-gray-400">Decision
                                    <select value={decision} onChange={e => setDecision(e.target.value as ReviewDecision)} className={inputCls}>
                                        {(Object.keys(DECISION_LABELS) as ReviewDecision[]).map(k => <option key={k} value={k}>{DECISION_LABELS[k]}</option>)}
                                    </select>
                                </label>
                                {decision === 'SCORE_ADJUSTED' && (
                                    <label className="text-xs text-gray-600 dark:text-gray-400">Corrected score (0–10)
                                        <input required type="number" min={0} max={10} step={0.1} value={adjusted} onChange={e => setAdjusted(e.target.value)} className={inputCls} />
                                    </label>
                                )}
                                <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-3">Notes {decision !== 'CONFIRMED' && <span className="text-red-600">(required)</span>}
                                    <textarea required={decision !== 'CONFIRMED'} maxLength={2000} rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
                                </label>
                                <div className="sm:col-span-3 flex justify-end">
                                    <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : 'Record review'}</button>
                                </div>
                            </form>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

// ── Main ────────────────────────────────────────────────────────────────────

type Tab = 'students' | 'questions' | 'attempts';
type SortKey = 'name' | 'average' | 'highest' | 'attempts' | 'questions' | 'activity' | 'improvement';
const SORT_DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = { name: 'asc', average: 'desc', highest: 'desc', attempts: 'desc', questions: 'desc', activity: 'desc', improvement: 'desc' };
const DAY = 86400_000;

function SortHeader({ label, k, sort, dir, onSort, align = 'left' }: { label: string; k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void; align?: 'left' | 'right' }) {
    const active = sort === k;
    const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <th scope="col" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`py-2 pr-3 text-${align} text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400`}>
            <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-900 dark:hover:text-white ${active ? 'text-gray-900 dark:text-white' : ''}`}>
                {label}<Icon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} aria-hidden="true" />
            </button>
        </th>
    );
}

/**
 * Instructor/admin AI speaking analytics: course overview with charts, a
 * sortable student table, per-question statistics and a filterable attempt
 * list. All aggregation is server-side. Opening a student or an attempt is
 * delegated to the parent (a drawer / a full report view).
 */
export function SpeakingAnalytics({ courseId, onOpenStudent, onOpenAttempt }: { courseId: string; onOpenStudent: (userId: string) => void; onOpenAttempt: (attemptId: string) => void }) {
    const [overview, setOverview] = useState<SpeakingOverview | null>(null);
    const [tab, setTab] = useState<Tab>('students');
    const [error, setError] = useState<string | null>(null);
    const [now] = useState(() => Date.now());

    const [questions, setQuestions] = useState<QuestionAnalytics[] | null>(null);

    const [students, setStudents] = useState<StudentAnalyticsRow[]>([]);
    const [sMeta, setSMeta] = useState({ total: 0, totalPages: 1 });
    const [sPage, setSPage] = useState(1);
    const [sSearch, setSSearch] = useState('');
    const [sAttempted, setSAttempted] = useState<'' | 'yes' | 'no'>('');
    const [sort, setSort] = useState<SortKey>('name');
    const [dir, setDir] = useState<'asc' | 'desc'>('asc');
    const sq = useDebouncedValue(sSearch.trim());

    const [attempts, setAttempts] = useState<AdminAttemptRow[]>([]);
    const [aMeta, setAMeta] = useState({ total: 0, totalPages: 1 });
    const [aPage, setAPage] = useState(1);
    const emptyFilters = { questionId: '', topic: '', minScore: '', maxScore: '', from: '', to: '', flagged: '' };
    const [f, setF] = useState(emptyFilters);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        speakingService.overview(courseId).then(setOverview, err => setError(apiErrorMessage(err, 'Could not load speaking analytics.')));
        speakingService.questionAnalytics(courseId).then(setQuestions, () => setQuestions([]));
    }, [courseId]);

    useEffect(() => {
        if (tab !== 'students') return;
        setLoading(true);
        speakingService.students(courseId, { q: sq, attempted: sAttempted, sort, dir, page: sPage, limit: PAGE_SIZE })
            .then(r => { setStudents(r.data); setSMeta({ total: r.meta.total, totalPages: r.meta.totalPages }); })
            .catch(err => toast.error(apiErrorMessage(err, 'Could not load students.')))
            .finally(() => setLoading(false));
    }, [courseId, tab, sq, sAttempted, sort, dir, sPage]);
    useEffect(() => { setSPage(1); }, [sq, sAttempted, sort, dir]);

    useEffect(() => {
        if (tab !== 'attempts') return;
        setLoading(true);
        speakingService.attempts(courseId, { ...f, page: aPage, limit: PAGE_SIZE })
            .then(r => { setAttempts(r.data); setAMeta({ total: r.meta.total, totalPages: r.meta.totalPages }); })
            .catch(err => toast.error(apiErrorMessage(err, 'Could not load attempts.')))
            .finally(() => setLoading(false));
    }, [courseId, tab, f, aPage]);
    useEffect(() => { setAPage(1); }, [f]);

    const changeSort = (k: SortKey) => {
        if (k === sort) setDir(dir === 'asc' ? 'desc' : 'asc');
        else { setSort(k); setDir(SORT_DEFAULT_DIR[k]); }
    };

    const topics = Array.from(new Set((questions ?? []).map(q => q.topic).filter(Boolean))) as string[];
    const hasAttempts = (overview?.totalAttempts ?? 0) > 0;

    return (
        <div className="space-y-5">
            {error && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">{error}</p>}
            {!overview && !error && <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-busy="true">{[0, 1, 2, 3, 4].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>}
            {overview && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <Tile icon={<Users className="h-4 w-4" />} accent="bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" label="Students practising" value={`${overview.studentsAttempted}/${overview.enrolledStudents}`} sub={`${overview.activeStudents7d} active in the last 7 days`} />
                        <Tile icon={<Mic className="h-4 w-4" />} accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" label="Assessments" value={overview.completedAttempts} sub={`${overview.totalAttempts} submitted · ${overview.failedAttempts} failed`} />
                        <Tile icon={<Target className="h-4 w-4" />} accent="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" label="Average AI score" value={formatScore(overview.averageScore)} sub="out of 10" tone={scoreTone(overview.averageScore)} />
                        <Tile icon={<Trophy className="h-4 w-4" />} accent="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" label="Highest score" value={formatScore(overview.highestScore)} tone={scoreTone(overview.highestScore)} />
                        <Tile icon={<Activity className="h-4 w-4" />} accent="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" label="Last activity" value={overview.lastActivity ? formatRelative(overview.lastActivity) : '—'} sub={`${overview.questionsWithReferenceAnswer}/${overview.audioQuestions} questions have a reference answer`} />
                    </div>

                    {hasAttempts ? (
                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card title="Assessments per day" icon={<Activity className="h-4 w-4 text-emerald-600" />} className="lg:col-span-2">
                                <ActivityChart activity={overview.activity} now={now} />
                            </Card>
                            <Card title="Score distribution" icon={<Target className="h-4 w-4 text-indigo-600" />}>
                                <Distribution buckets={overview.distribution} />
                            </Card>
                            <Card title="Needs attention: low-scoring questions" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
                                {overview.lowPerformingQuestions.length === 0 ? <p className="text-sm text-gray-500">No question averages below 6/10.</p> : (
                                    <ul className="space-y-2 text-sm">
                                        {overview.lowPerformingQuestions.map(q => (
                                            <li key={q.questionId} className="flex items-center justify-between gap-2">
                                                <button type="button" onClick={() => { setF({ ...emptyFilters, questionId: q.questionId }); setTab('attempts'); }} className="truncate text-left hover:underline">{q.title}</button>
                                                <span className="flex flex-shrink-0 items-center gap-2 text-xs text-gray-400">{q.attempts} tries<ScorePill score={q.averageScore} /></span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                            <Card title="Recent activity" icon={<Activity className="h-4 w-4 text-sky-600" />}>
                                <ul className="space-y-2 text-sm">
                                    {overview.recentActivity.slice(0, 6).map(r => (
                                        <li key={r.attemptId}>
                                            <button type="button" onClick={() => onOpenAttempt(r.attemptId)} className="flex w-full items-center justify-between gap-2 text-left hover:underline">
                                                <span className="min-w-0 truncate">{r.studentName} <span className="text-gray-400">· {r.questionTitle}</span></span>
                                                {r.status === 'COMPLETED' ? <ScorePill score={r.overallScore} /> : <span className="text-xs text-gray-500">{ATTEMPT_STATUS_LABELS[r.status]}</span>}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                            <Card title="Not practised yet" icon={<UserX className="h-4 w-4 text-gray-500" />}>
                                {overview.notAttemptedSample.length === 0 ? <p className="text-sm text-gray-500">Every enrolled student has practised.</p> : (
                                    <ul className="space-y-1.5 text-sm">
                                        {overview.notAttemptedSample.slice(0, 6).map(s => (
                                            <li key={s.userId}><button type="button" onClick={() => onOpenStudent(s.userId)} className="truncate text-left hover:underline">{s.name}</button></li>
                                        ))}
                                        {overview.studentsNotAttempted > 6 && <li className="text-xs text-gray-400">…and {overview.studentsNotAttempted - 6} more</li>}
                                    </ul>
                                )}
                            </Card>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                            <Mic className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                            <p className="mt-2 font-medium text-gray-700 dark:text-gray-200">No speaking practice yet</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Scores, trends and missed concepts appear here as soon as students submit their first recording.</p>
                        </div>
                    )}
                </>
            )}

            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div role="tablist" aria-label="Speaking analytics view" className="mb-4 inline-flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                    {([['students', 'Students'], ['questions', 'Questions'], ['attempts', 'All attempts']] as [Tab, string][]).map(([id, label]) => (
                        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'questions' && (
                    !questions ? <p className="py-6 text-center text-sm text-gray-500">Loading…</p> : questions.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">This course has no audio questions.</p> : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead><tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    <th scope="col" className="py-2 pr-3">Question</th><th scope="col" className="py-2 pr-3">Students</th><th scope="col" className="py-2 pr-3">Attempts</th><th scope="col" className="py-2 pr-3">Avg</th><th scope="col" className="py-2 pr-3">High / low</th><th scope="col" className="py-2 pr-3">Distribution</th><th scope="col" className="py-2">Commonly missed</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {questions.map(q => (
                                        <tr key={q.questionId}>
                                            <td className={`${td} min-w-[13rem]`}>
                                                <button type="button" onClick={() => { setF({ ...emptyFilters, questionId: q.questionId }); setTab('attempts'); }} className="text-left font-medium text-gray-900 dark:text-white hover:underline">{q.title}</button>
                                                <span className="block text-[11px] text-gray-400">{[q.topic, q.difficulty, q.hasReferenceAnswer ? 'reference answer' : 'no reference answer', q.isActive ? null : 'inactive'].filter(Boolean).join(' · ')}</span>
                                            </td>
                                            <td className={`${td} tabular-nums`}>{q.uniqueStudents}</td>
                                            <td className={`${td} tabular-nums`}>{q.attempts}</td>
                                            <td className={td}><ScorePill score={q.averageScore} /></td>
                                            <td className={`${td} whitespace-nowrap text-xs tabular-nums text-gray-500`}>{formatScore(q.highestScore)} / {formatScore(q.lowestScore)}</td>
                                            <td className={td}><Distribution buckets={q.distribution} compact /></td>
                                            <td className={`${td} min-w-[10rem]`}>
                                                {q.commonlyMissedConcepts.length === 0 ? <span className="text-gray-400">—</span> : (
                                                    <span className="flex flex-wrap gap-1">{q.commonlyMissedConcepts.map(c => <span key={c.concept} className="rounded-full bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-200 ring-1 ring-inset ring-amber-200 dark:ring-amber-500/30">{c.concept} ×{c.count}</span>)}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {tab === 'students' && (
                    <>
                        <div className="mb-4 grid gap-3 sm:grid-cols-2">
                            <div className="relative">
                                <label htmlFor="sa-search" className="sr-only">Search students</label>
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                                <input id="sa-search" value={sSearch} onChange={e => setSSearch(e.target.value)} placeholder="Search name or email" className={`${inputCls} pl-9`} />
                            </div>
                            <div>
                                <label htmlFor="sa-attempted" className="sr-only">Practice status</label>
                                <select id="sa-attempted" value={sAttempted} onChange={e => setSAttempted(e.target.value as typeof sAttempted)} className={inputCls}>
                                    <option value="">All students</option><option value="yes">Has practised</option><option value="no">Not practised yet</option>
                                </select>
                            </div>
                        </div>
                        {students.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">{loading ? 'Loading…' : 'No students match.'}</p> : (
                            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                                <table className="min-w-full text-sm">
                                    <caption className="sr-only">AI speaking practice per student. Select a column heading to sort.</caption>
                                    <thead><tr className="border-b border-gray-100 dark:border-gray-700">
                                        <SortHeader label="Student" k="name" sort={sort} dir={dir} onSort={changeSort} />
                                        <SortHeader label="Practised" k="questions" sort={sort} dir={dir} onSort={changeSort} />
                                        <SortHeader label="Attempts" k="attempts" sort={sort} dir={dir} onSort={changeSort} />
                                        <SortHeader label="Avg score" k="average" sort={sort} dir={dir} onSort={changeSort} />
                                        <SortHeader label="Best" k="highest" sort={sort} dir={dir} onSort={changeSort} />
                                        <th scope="col" className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Latest</th>
                                        <SortHeader label="Trend" k="improvement" sort={sort} dir={dir} onSort={changeSort} />
                                        <SortHeader label="Last active" k="activity" sort={sort} dir={dir} onSort={changeSort} />
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {students.map(s => {
                                            const idle = s.lastActivity ? now - new Date(s.lastActivity).getTime() > 7 * DAY : false;
                                            const struggling = s.averageScore !== null && s.averageScore < 6;
                                            return (
                                                <tr key={s.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                    <td className={`${td} min-w-[12rem]`}>
                                                        <button type="button" onClick={() => onOpenStudent(s.userId)} className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline">{s.name}</button>
                                                        <span className="block text-[11px] text-gray-400">{s.email}</span>
                                                        <span className="mt-0.5 flex flex-wrap gap-1">
                                                            {s.totalAttempts === 0 && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">Not started</span>}
                                                            {struggling && <span className="rounded-full bg-rose-50 dark:bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-200 dark:ring-rose-500/30">Needs help</span>}
                                                            {idle && <span className="rounded-full bg-amber-50 dark:bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-200 dark:ring-amber-500/30">Inactive 7d+</span>}
                                                        </span>
                                                    </td>
                                                    <td className={`${td} min-w-[7rem]`}>
                                                        <span className="text-xs tabular-nums text-gray-700 dark:text-gray-200">{s.questionsAttempted}/{s.totalQuestions}</span>
                                                        <Meter value={s.questionsAttempted} max={s.totalQuestions} label={`${s.name}: ${s.questionsAttempted} of ${s.totalQuestions} questions practised`} />
                                                    </td>
                                                    <td className={`${td} tabular-nums`}>{s.totalAttempts}</td>
                                                    <td className={td}><ScorePill score={s.averageScore} /></td>
                                                    <td className={td}><ScorePill score={s.highestScore} /></td>
                                                    <td className={td}><ScorePill score={s.latestScore} /></td>
                                                    <td className={`${td} whitespace-nowrap text-xs font-semibold tabular-nums`}>
                                                        {s.improvement === null ? <span className="font-normal text-gray-400">—</span> : s.improvement >= 0
                                                            ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />+{s.improvement}</span>
                                                            : <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"><TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />{s.improvement}</span>}
                                                    </td>
                                                    <td className={`${td} whitespace-nowrap text-xs text-gray-500`}>{formatRelative(s.lastActivity)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <Pagination page={sPage} totalPages={sMeta.totalPages} total={sMeta.total} onPage={setSPage} noun="students" />
                    </>
                )}

                {tab === 'attempts' && (
                    <>
                        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <select aria-label="Question" value={f.questionId} onChange={e => setF({ ...f, questionId: e.target.value })} className={inputCls}>
                                <option value="">All questions</option>
                                {(questions ?? []).map(q => <option key={q.questionId} value={q.questionId}>{q.title}</option>)}
                            </select>
                            <select aria-label="Topic" value={f.topic} onChange={e => setF({ ...f, topic: e.target.value })} className={inputCls}>
                                <option value="">All topics</option>
                                {topics.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <input aria-label="Minimum score" type="number" min={0} max={10} step={0.5} placeholder="Min score" value={f.minScore} onChange={e => setF({ ...f, minScore: e.target.value })} className={inputCls} />
                                <input aria-label="Maximum score" type="number" min={0} max={10} step={0.5} placeholder="Max score" value={f.maxScore} onChange={e => setF({ ...f, maxScore: e.target.value })} className={inputCls} />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input type="checkbox" checked={f.flagged === 'true'} onChange={e => setF({ ...f, flagged: e.target.checked ? 'true' : '' })} /> Reviewed as incorrect
                            </label>
                            <label className="text-xs text-gray-500">From<input type="date" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} className={inputCls} /></label>
                            <label className="text-xs text-gray-500">To<input type="date" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} className={inputCls} /></label>
                            {Object.values(f).some(Boolean) && (
                                <button type="button" onClick={() => setF(emptyFilters)} className="inline-flex items-center gap-1 self-end text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    <X className="h-4 w-4" aria-hidden="true" /> Clear filters
                                </button>
                            )}
                        </div>
                        {attempts.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">{loading ? 'Loading…' : 'No attempts match.'}</p> : (
                            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                                <table className="min-w-full text-sm">
                                    <thead><tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        <th scope="col" className="py-2 pr-3">Student</th><th scope="col" className="py-2 pr-3">Question</th><th scope="col" className="py-2 pr-3">#</th><th scope="col" className="py-2 pr-3">Score</th><th scope="col" className="py-2 pr-3">Result</th><th scope="col" className="py-2">Submitted</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {attempts.map(a => (
                                            <tr key={a.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={() => onOpenAttempt(a.id)}>
                                                <td className={td}><span className="font-medium text-gray-900 dark:text-white">{a.studentName}</span><span className="block text-[11px] text-gray-400">{a.studentEmail}</span></td>
                                                <td className={td}>
                                                    <button type="button" onClick={e => { e.stopPropagation(); onOpenAttempt(a.id); }} className="text-left hover:underline">{a.questionTitle}</button>
                                                </td>
                                                <td className={`${td} tabular-nums`}>{a.attemptNumber}</td>
                                                <td className={td}>
                                                    {a.status === 'COMPLETED' ? <ScorePill score={a.overallScore} /> : <span className="text-xs text-gray-500">{ATTEMPT_STATUS_LABELS[a.status]}</span>}
                                                    {a.latestReview && <span className="ml-1 text-[11px] text-amber-600">({DECISION_LABELS[a.latestReview.decision]}{a.latestReview.adjustedScore !== null ? ` ${a.latestReview.adjustedScore}` : ''})</span>}
                                                </td>
                                                <td className={td}>{a.status === 'COMPLETED' ? <PerformanceBadge level={a.performanceLevel} /> : null}</td>
                                                <td className={`${td} whitespace-nowrap text-xs text-gray-500`}>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <Pagination page={aPage} totalPages={aMeta.totalPages} total={aMeta.total} onPage={setAPage} noun="attempts" />
                    </>
                )}
            </div>
        </div>
    );
}

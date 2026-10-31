"use client";

import { useState } from 'react';
import { Activity, CalendarCheck, Mic, Sparkles, Target, Trophy } from 'lucide-react';
import type { SpeakingSummary } from '@/types/speaking';
import { ATTEMPT_STATUS_LABELS, formatRelative, formatScore, scoreTone } from '@/lib/speaking';

function Tile({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: string }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true">{icon}</span>{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
        </div>
    );
}

/** Daily average score for the last 14 days (gaps = no practice). */
function Trend({ trend }: { trend: SpeakingSummary['activity']['trend'] }) {
    const [now] = useState(() => Date.now());
    const days: { date: string; avg: number | null; n: number }[] = [];
    const byDate = new Map(trend.map(t => [t.date, t]));
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * 86400_000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const t = byDate.get(key);
        days.push({ date: key, avg: t ? t.averageScore : null, n: t?.attempts ?? 0 });
    }
    if (!trend.length) return null;
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Average score per day · last 14 days</p>
            <div className="mt-2 flex h-14 items-end gap-1" role="img" aria-label={`Practice trend: ${trend.map(t => `${t.date} average ${t.averageScore} over ${t.attempts} attempts`).join('; ')}`}>
                {days.map(d => (
                    <div key={d.date} className="flex flex-1 flex-col justify-end" title={d.avg !== null ? `${d.date}: ${d.avg} avg, ${d.n} attempt(s)` : `${d.date}: no practice`} aria-hidden="true">
                        <div className={`rounded-t ${d.avg === null ? 'h-0.5 bg-gray-200 dark:bg-gray-800' : 'bg-indigo-500/80 dark:bg-indigo-400/70'}`} style={d.avg !== null ? { height: `${Math.max(8, d.avg * 10)}%` } : undefined} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Course-level speaking practice overview for the student. Every number comes
 * from the server's aggregation of their persisted attempts.
 */
export function PracticeSummary({ summary, onOpenQuestion }: { summary: SpeakingSummary; onOpenQuestion: (questionId: string) => void }) {
    const t = summary.totals;
    if (t.audioQuestions === 0) return null;
    return (
        <section aria-labelledby="ps-heading" className="space-y-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-950/30 dark:to-gray-900 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h3 id="ps-heading" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><Mic className="h-4 w-4 text-indigo-600" aria-hidden="true" />Speaking practice</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t.totalAttempts === 0
                            ? 'Record your first answer to get AI feedback on what you covered and what to improve.'
                            : `${t.questionsAttempted} of ${t.audioQuestions} questions practised · last practised ${formatRelative(t.lastActivity)}`}
                    </p>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <CalendarCheck className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                    Today: <strong>{summary.activity.today}</strong> · practised on <strong>{summary.activity.daysPracticedLast7}</strong> of the last 7 days
                </p>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(t.completionPercent)} aria-label="Speaking questions practised">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${t.completionPercent}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile icon={<Target className="h-3.5 w-3.5" />} label="Practised" value={`${t.questionsAttempted}/${t.audioQuestions}`} sub={`${t.questionsNotAttempted} remaining`} />
                <Tile icon={<Activity className="h-3.5 w-3.5" />} label="Total attempts" value={String(t.totalAttempts)} sub={`${t.completedAttempts} assessed`} />
                <Tile icon={<Sparkles className="h-3.5 w-3.5" />} label="Average score" value={formatScore(t.averageScore)} sub="out of 10" tone={scoreTone(t.averageScore)} />
                <Tile icon={<Trophy className="h-3.5 w-3.5" />} label="Best score" value={formatScore(t.bestScore?.score)} sub={t.bestScore?.title ?? undefined} tone={scoreTone(t.bestScore?.score)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                    <Trend trend={summary.activity.trend} />
                    {summary.suggestions.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Suggested next</p>
                            <ul className="mt-1.5 space-y-1.5">
                                {summary.suggestions.map(s => (
                                    <li key={s.questionId}>
                                        <button type="button" onClick={() => onOpenQuestion(s.questionId)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/80 dark:bg-gray-900/60 px-3 py-2 text-left text-sm ring-1 ring-gray-200 dark:ring-gray-800 hover:ring-indigo-300">
                                            <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-100">{s.title}</span>
                                            <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                                {s.reason === 'LOW_SCORE' ? <>Improve on <span className={scoreTone(s.latestScore)}>{formatScore(s.latestScore)}</span></> : 'Not tried yet'}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {summary.recent.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Recent practice</p>
                        <ul className="mt-1.5 divide-y divide-gray-100 dark:divide-gray-800 rounded-lg bg-white/80 dark:bg-gray-900/60 ring-1 ring-gray-200 dark:ring-gray-800">
                            {summary.recent.slice(0, 5).map(r => (
                                <li key={r.attemptId}>
                                    <button type="button" onClick={() => onOpenQuestion(r.questionId)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                        <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-100">{r.questionTitle ?? 'Question'} <span className="text-gray-400">#{r.attemptNumber}</span></span>
                                        <span className="text-xs text-gray-400">{formatRelative(r.at)}</span>
                                        <span className={`w-14 text-right text-sm font-semibold tabular-nums ${scoreTone(r.overallScore)}`}>
                                            {r.status === 'COMPLETED' ? formatScore(r.overallScore) : ATTEMPT_STATUS_LABELS[r.status]}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}

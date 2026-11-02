"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Lightbulb, ListChecks, Target, TrendingUp, XCircle } from 'lucide-react';
import type { LogicReport, LogicVerdict } from '@/types/problem-course';

export const VERDICT_STYLES: Record<LogicVerdict, string> = {
    Excellent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Good: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    Average: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    'Needs Improvement': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    Poor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

/** Scores are out of 10. */
export function scoreColor(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 7.5) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 5.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
}
const barColor = (s: number) => (s >= 7.5 ? 'bg-emerald-500' : s >= 5.5 ? 'bg-amber-500' : 'bg-rose-500');
const strokeColor = (s: number) => (s >= 7.5 ? 'stroke-emerald-500' : s >= 5.5 ? 'stroke-amber-500' : 'stroke-rose-500');

export function VerdictBadge({ verdict }: { verdict: LogicVerdict | null | undefined }) {
    if (!verdict) return null;
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT_STYLES[verdict] ?? VERDICT_STYLES.Average}`}>{verdict}</span>;
}

const APPROACH_LABEL: Record<string, { text: string; tone: string; Icon: typeof CheckCircle2 }> = {
    CORRECT: { text: 'Correct approach', tone: 'text-emerald-700 dark:text-emerald-400', Icon: CheckCircle2 },
    PARTIALLY_CORRECT: { text: 'Partly correct approach', tone: 'text-amber-700 dark:text-amber-400', Icon: AlertTriangle },
    INCORRECT: { text: 'Approach has a logical error', tone: 'text-rose-700 dark:text-rose-400', Icon: XCircle },
    NOT_EXPLAINED: { text: 'Approach not explained', tone: 'text-gray-600 dark:text-gray-400', Icon: AlertTriangle },
};

function List({ title, items, icon, tone }: { title: string; items: string[]; icon: React.ReactNode; tone: string }) {
    if (!items.length) return null;
    return (
        <section>
            <h4 className={`flex items-center gap-1.5 text-sm font-semibold ${tone}`}>{icon}{title}</h4>
            <ul className="mt-1.5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {items.map((s, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" aria-hidden="true" />{s}</li>)}
            </ul>
        </section>
    );
}

/** Logic-assessment result: overall score/verdict, per-category scores and feedback. */
export function LogicAssessmentReport({
    report,
    transcript,
    header,
}: {
    report: LogicReport;
    transcript?: { text: string; lowConfidence: boolean } | null;
    header?: React.ReactNode;
}) {
    const approach = report.approachVerdict ? APPROACH_LABEL[report.approachVerdict] : null;
    return (
        <article className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 space-y-5" aria-label="AI logic assessment">
            {header}
            <div className="flex flex-wrap items-center gap-5">
                <div className="relative h-20 w-20 shrink-0" role="img" aria-label={`Overall score ${report.overallScore} out of 10`}>
                    <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden="true">
                        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round" className={strokeColor(report.overallScore)} strokeDasharray={`${report.overallScore * 10} 100`} />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums ${scoreColor(report.overallScore)}`}>{report.overallScore}<span className="ml-0.5 text-[10px] font-semibold text-gray-400">/10</span></span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <VerdictBadge verdict={report.verdict} />
                        {approach && <span className={`inline-flex items-center gap-1 text-xs font-semibold ${approach.tone}`}><approach.Icon className="h-3.5 w-3.5" aria-hidden="true" />{approach.text}</span>}
                    </div>
                    {report.identifiedApproach && <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Your approach:</span> {report.identifiedApproach}</p>}
                    {(report.statedTimeComplexity || report.statedSpaceComplexity) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">You said: time {report.statedTimeComplexity || '—'}, space {report.statedSpaceComplexity || '—'}</p>
                    )}
                    {report.capped && <p className="text-xs text-amber-700 dark:text-amber-400">The overall score is limited because the approach itself isn’t fully correct.</p>}
                </div>
            </div>

            <section aria-labelledby="logic-cats">
                <h4 id="logic-cats" className="text-sm font-semibold text-gray-900 dark:text-white">Score breakdown</h4>
                <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                    {report.categoryScores.map(c => (
                        <li key={c.category} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="font-medium text-gray-800 dark:text-gray-200">{c.label}</span>
                                <span className={`font-bold tabular-nums ${scoreColor(c.score)}`}>{c.applicable && c.score !== null ? <>{c.score}<span className="text-xs font-medium text-gray-400">/10</span></> : 'n/a'}</span>
                            </div>
                            {c.applicable && c.score !== null && (
                                <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={c.score} aria-label={c.label}>
                                    <div className={`h-full rounded-full ${barColor(c.score)}`} style={{ width: `${c.score * 10}%` }} />
                                </div>
                            )}
                            <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">{c.feedback}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
                <List title="Strengths" items={report.strengths} tone="text-emerald-700 dark:text-emerald-400" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} />
                <List title="To improve" items={report.improvements} tone="text-sky-700 dark:text-sky-400" icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />} />
                <List title="Missing concepts" items={report.missingConcepts} tone="text-amber-700 dark:text-amber-400" icon={<ListChecks className="h-4 w-4" aria-hidden="true" />} />
                {report.misconceptions.length > 0 && (
                    <section>
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400"><XCircle className="h-4 w-4" aria-hidden="true" />Misconceptions</h4>
                        <ul className="mt-1.5 space-y-2 text-sm">
                            {report.misconceptions.map((m, i) => (
                                <li key={i}>
                                    <p className="text-gray-700 dark:text-gray-300">“{m.statement}”</p>
                                    <p className="text-gray-500 dark:text-gray-400">→ {m.correction}</p>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <section className="rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-900/10 p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 dark:text-blue-200"><Target className="h-4 w-4" aria-hidden="true" />A correct approach</h4>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-blue-950 dark:text-blue-100">{report.correctApproach}</p>
            </section>

            <section>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white"><Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />Feedback</h4>
                <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{report.finalFeedback}</p>
                {report.confidence === 'LOW' && <p className="mt-1 text-xs text-gray-500">The AI was not very confident about this assessment (for example the recording was unclear).</p>}
            </section>

            {transcript && (
                <details className="group rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Transcript of your explanation <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{transcript.text}</p>
                    {transcript.lowConfidence && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Parts of the recording were unclear, so the transcript may contain errors.</p>}
                </details>
            )}
            <p className="text-[11px] text-gray-400">AI-generated assessment of your reasoning only — not your accent, grammar or speaking speed.</p>
        </article>
    );
}

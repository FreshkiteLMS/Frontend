"use client";

import { useState, type ReactNode } from 'react';
import {
    AlertCircle, ArrowRight, Check, CheckCircle2, ChevronDown, Copy, FileText, Gauge, Info, Lightbulb,
    MessageSquare, Repeat2, Sparkles, Target, Timer, X, XCircle,
} from 'lucide-react';
import type { AudioMetrics, CategoryScore, SpeakingReport, TranscriptSegment } from '@/types/speaking';
import {
    PERFORMANCE_LABELS, PERFORMANCE_STYLES, TONE_CHIP, formatClock, formatScore, importanceTone, ratingTone, scoreTone,
    splitSentences, toParagraphs, type Tone,
} from '@/lib/speaking';

/** Circular score out of 10 with the number in the middle (text carries the value). */
export function ScoreRing({ score, size = 112, label }: { score: number | null; size?: number; label?: string }) {
    const r = (size - 12) / 2;
    const c = 2 * Math.PI * r;
    const frac = score === null ? 0 : Math.max(0, Math.min(1, score / 10));
    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `Score ${formatScore(score)} out of 10`}>
            <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={10} className="fill-none stroke-gray-200 dark:stroke-gray-800" />
                <circle
                    cx={size / 2} cy={size / 2} r={r} strokeWidth={10} strokeLinecap="round"
                    className={`fill-none stroke-current ${scoreTone(score)} transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none`}
                    strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
                />
            </svg>
            <span className="absolute text-center">
                <span className="block text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{formatScore(score)}</span>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">out of 10</span>
            </span>
        </div>
    );
}

export function PerformanceBadge({ level }: { level: SpeakingReport['performanceLevel'] | null }) {
    if (!level) return null;
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PERFORMANCE_STYLES[level]}`}>
            {PERFORMANCE_LABELS[level]}
        </span>
    );
}

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE_CHIP[tone]}`}>{children}</span>;
}

/** Long prose → short bullet points (a single sentence stays a plain line). */
function Points({ text, dot = 'bg-gray-400' }: { text: string; dot?: string }) {
    const items = splitSentences(text);
    if (items.length <= 1) return <p className="leading-relaxed">{items[0] ?? text}</p>;
    return (
        <ul className="space-y-1.5">
            {items.map((s, i) => (
                <li key={i} className="flex gap-2.5 leading-relaxed">
                    <span className={`mt-[0.55em] h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                    <span>{s}</span>
                </li>
            ))}
        </ul>
    );
}

const barColor = (s: number | null) =>
    s === null ? 'bg-gray-300' : s >= 7.5 ? 'bg-emerald-500' : s >= 6 ? 'bg-sky-500' : s >= 4 ? 'bg-amber-500' : 'bg-rose-500';

function CategoryBar({ c }: { c: CategoryScore }) {
    return (
        <li className="py-3">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.label}</span>
                <span className={`text-sm font-semibold tabular-nums ${scoreTone(c.score)}`}>
                    {c.applicable ? `${formatScore(c.score)} / ${c.maxScore}` : 'Not assessed'}
                </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden="true">
                {c.applicable && <div className={`h-full rounded-full transition-all ${barColor(c.score)}`} style={{ width: `${((c.score ?? 0) / c.maxScore) * 100}%` }} />}
            </div>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{c.feedback}</p>
            {c.applicable && <p className="mt-0.5 text-[11px] text-gray-400">Weight {Math.round(c.weight * 100)}%</p>}
        </li>
    );
}

const SECTION_TONE: Record<Tone, { border: string; icon: string }> = {
    green: { border: 'border-l-emerald-500', icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    amber: { border: 'border-l-amber-500', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    red: { border: 'border-l-rose-500', icon: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
    sky: { border: 'border-l-sky-500', icon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
    indigo: { border: 'border-l-indigo-500', icon: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
    teal: { border: 'border-l-teal-500', icon: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' },
    gray: { border: 'border-l-gray-400', icon: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300' },
};

function Section({ id, title, tone, icon, count, children, defaultOpen = true }: { id: string; title: string; tone: Tone; icon: ReactNode; count?: number; children: ReactNode; defaultOpen?: boolean }) {
    const t = SECTION_TONE[tone];
    return (
        <details id={id} open={defaultOpen} className={`group scroll-mt-24 rounded-2xl border border-l-4 border-gray-100 dark:border-gray-800 ${t.border} bg-white dark:bg-gray-900`}>
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.icon}`} aria-hidden="true">{icon}</span>
                <h3 className="flex-1 font-semibold text-gray-900 dark:text-white">
                    {title}
                    {count !== undefined && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${t.icon}`}>{count}</span>}
                </h3>
                <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 sm:px-5 text-sm text-gray-700 dark:text-gray-300">{children}</div>
        </details>
    );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-gray-500 dark:text-gray-400">{children}</p>;

const RATING_LABEL: Record<string, string> = {
    CLEAR: 'Clear', MOSTLY_CLEAR: 'Mostly clear', UNCLEAR: 'Unclear', GOOD: 'Good', FAIR: 'Fair', POOR: 'Needs work',
    NONE: 'None', SOME: 'Some', EXCESSIVE: 'Too much',
};

const RATING_TILE: Record<Tone, string> = {
    green: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    amber: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
    red: 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10',
    sky: 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10',
    indigo: 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10',
    teal: 'border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10',
    gray: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60',
};
const RATING_TEXT: Record<Tone, string> = {
    green: 'text-emerald-700 dark:text-emerald-300', amber: 'text-amber-700 dark:text-amber-300', red: 'text-rose-700 dark:text-rose-300',
    sky: 'text-sky-700 dark:text-sky-300', indigo: 'text-indigo-700 dark:text-indigo-300', teal: 'text-teal-700 dark:text-teal-300', gray: 'text-gray-700 dark:text-gray-300',
};

function RatingTile({ label, value, tone, icon }: { label: string; value: string; tone: Tone; icon: ReactNode }) {
    const Mark = tone === 'green' ? Check : tone === 'amber' ? AlertCircle : X;
    return (
        <div className={`rounded-xl border p-3 ${RATING_TILE[tone]}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"><span aria-hidden="true">{icon}</span>{label}</p>
            <p className={`mt-1 flex items-center gap-1 text-sm font-bold ${RATING_TEXT[tone]}`}>
                <Mark className="h-4 w-4" aria-hidden="true" />{RATING_LABEL[value] ?? value}
            </p>
        </div>
    );
}

function paceTone(wpm: number | null): Tone {
    if (wpm === null) return 'gray';
    return wpm >= 110 && wpm <= 160 ? 'green' : wpm >= 90 && wpm <= 185 ? 'amber' : 'red';
}

export function Transcript({ text, segments, lowConfidence, language }: { text: string; segments: TranscriptSegment[]; lowConfidence: boolean; language: string | null }) {
    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatic transcript{language ? ` · language: ${language}` : ''}. The recording itself was deleted after transcription and cannot be played back.
            </p>
            {lowConfidence && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2.5 text-amber-900 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" /> Parts of the recording were unclear, so the transcript may contain errors.
                </p>
            )}
            {segments.length > 0 ? (
                <ol className="space-y-1.5">
                    {segments.map((s, i) => (
                        <li key={i} className="flex gap-3">
                            <span className="w-10 flex-shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-gray-400">{formatClock(s.start)}</span>
                            <span className={s.uncertain ? 'italic text-gray-400 dark:text-gray-500' : ''}>
                                {s.text}{s.uncertain && <span className="sr-only"> (unclear)</span>}
                                {s.uncertain && <span aria-hidden="true" className="ml-1 text-[10px] not-italic uppercase tracking-wide">unclear</span>}
                            </span>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
            )}
        </div>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }, () => undefined);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 dark:border-sky-500/40 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10"
        >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

const NAV: { id: string; label: string; dot: string }[] = [
    { id: 'strengths', label: 'Strengths', dot: 'bg-emerald-500' },
    { id: 'missing', label: 'Missing concepts', dot: 'bg-amber-500' },
    { id: 'incorrect', label: 'Corrections', dot: 'bg-rose-500' },
    { id: 'improve', label: 'Improvements', dot: 'bg-indigo-500' },
    { id: 'ideal', label: 'Ideal answer', dot: 'bg-sky-500' },
    { id: 'communication', label: 'Communication', dot: 'bg-teal-500' },
    { id: 'transcript', label: 'Transcript', dot: 'bg-gray-400' },
];

/**
 * The full AI assessment report. Used by students (their own attempts) and by
 * instructors (any attempt in the course). Contains no audio playback —
 * recordings are not retained.
 */
export function AssessmentReport({
    report, transcript, audioMetrics, header, idPrefix = 'r',
}: {
    report: SpeakingReport;
    transcript: { text: string; language: string | null; lowConfidence: boolean; segments: TranscriptSegment[] } | null | undefined;
    audioMetrics?: AudioMetrics | null;
    header?: ReactNode;
    idPrefix?: string;
}) {
    const sid = (s: string) => `${idPrefix}-${s}`;
    const cf = report.communicationFeedback;
    const paragraphs = toParagraphs(report.idealAnswer);
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6" id={sid('overview')}>
                {header}
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                    <ScoreRing score={report.overallScore} />
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                            <PerformanceBadge level={report.performanceLevel} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Confidence: {report.confidence.level.toLowerCase()}</span>
                        </div>
                        <p className="mt-2 font-medium text-gray-900 dark:text-gray-100">{report.summary}</p>
                        <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-left text-sm text-gray-600 dark:text-gray-300">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Why this score</p>
                            <Points text={report.scoreRationale} dot="bg-sky-500" />
                        </div>
                        {report.adjustments.map(a => <p key={a} className="mt-1 text-xs text-gray-500 dark:text-gray-400">{a}</p>)}
                    </div>
                </div>
                {report.confidence.limitations.length > 0 && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <ul className="space-y-0.5">
                            {report.confidence.limitations.map(l => <li key={l}>{l}</li>)}
                        </ul>
                    </div>
                )}
                <h3 className="mt-6 text-sm font-semibold text-gray-900 dark:text-white">Score breakdown</h3>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {report.categoryScores.map(c => <CategoryBar key={c.category} c={c} />)}
                </ul>
            </div>

            <nav aria-label="Report sections" className="sticky top-16 z-10 -mx-1 flex gap-1.5 overflow-x-auto bg-white/90 dark:bg-gray-950/90 px-1 py-2 backdrop-blur">
                {NAV.map(n => (
                    <a key={n.id} href={`#${sid(n.id)}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span className={`h-1.5 w-1.5 rounded-full ${n.dot}`} aria-hidden="true" />{n.label}
                    </a>
                ))}
            </nav>

            <Section id={sid('strengths')} title="Strengths" tone="green" icon={<CheckCircle2 className="h-5 w-5" />} count={report.strengths.length}>
                {report.strengths.length === 0 ? <Empty>No clear strengths were identified in this answer.</Empty> : (
                    <ul className="space-y-3">
                        {report.strengths.map((s, i) => (
                            <li key={i} className="flex gap-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 p-3">
                                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                <div className="min-w-0 space-y-1">
                                    <p className="font-semibold text-gray-900 dark:text-white">{s.title}</p>
                                    <Points text={s.description} dot="bg-emerald-500" />
                                    {s.evidence && <blockquote className="border-l-2 border-emerald-400 pl-3 text-xs italic text-gray-500 dark:text-gray-400">“{s.evidence}”</blockquote>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section id={sid('missing')} title="Missing concepts" tone="amber" icon={<Target className="h-5 w-5" />} count={report.missedConcepts.length}>
                {report.missedConcepts.length === 0 ? <Empty>You covered the important concepts.</Empty> : (
                    <ul className="space-y-2.5">
                        {report.missedConcepts.map((m, i) => {
                            const tone = importanceTone(m.importance);
                            return (
                                <li key={i}>
                                    <details open={m.importance === 'HIGH'} className="group/m rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5">
                                        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                                            <span className="flex-1 font-semibold text-gray-900 dark:text-white">{m.concept}</span>
                                            <Chip tone={tone}>{m.importance === 'HIGH' ? 'High' : m.importance === 'MEDIUM' ? 'Medium' : 'Low'} priority</Chip>
                                            <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open/m:rotate-180" aria-hidden="true" />
                                        </summary>
                                        <div className="space-y-3 border-t border-amber-200/70 dark:border-amber-500/20 px-3 py-3">
                                            <Points text={m.description} dot="bg-amber-500" />
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <div className="rounded-lg bg-white/70 dark:bg-gray-900/60 p-2.5 ring-1 ring-inset ring-amber-200 dark:ring-amber-500/20">
                                                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"><Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />Why it matters</p>
                                                    <Points text={m.whyItMatters} dot="bg-amber-500" />
                                                </div>
                                                <div className="rounded-lg bg-white/70 dark:bg-gray-900/60 p-2.5 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/20">
                                                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300"><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />Say it like this</p>
                                                    <Points text={m.suggestion} dot="bg-emerald-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </details>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Section>

            <Section id={sid('incorrect')} title="Incorrect information" tone="red" icon={<XCircle className="h-5 w-5" />} count={report.incorrectInformation.length}>
                {report.incorrectInformation.length === 0 ? <Empty>No incorrect statements were found.</Empty> : (
                    <ul className="space-y-3">
                        {report.incorrectInformation.map((x, i) => (
                            <li key={i} className="space-y-2 rounded-xl border border-rose-200/70 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/5 p-3">
                                <p className="flex gap-2"><X className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" /><span><span className="font-semibold text-rose-700 dark:text-rose-300">You said: </span>“{x.statement}”</span></p>
                                <div className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" /><div className="min-w-0"><span className="font-semibold text-amber-700 dark:text-amber-300">Why it’s off</span><Points text={x.explanation} dot="bg-amber-500" /></div></div>
                                <div className="flex gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2.5"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /><div className="min-w-0"><span className="font-semibold text-emerald-700 dark:text-emerald-300">Better</span><Points text={x.correction} dot="bg-emerald-500" /></div></div>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section id={sid('improve')} title="How to improve" tone="indigo" icon={<Lightbulb className="h-5 w-5" />} count={report.improvements.length}>
                {report.improvements.length === 0 ? <Empty>No specific improvements suggested.</Empty> : (
                    <ol className="space-y-3">
                        {report.improvements.map((x, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" aria-hidden="true">{i + 1}</span>
                                <div className="min-w-0 space-y-1">
                                    <p className="font-semibold text-gray-900 dark:text-white">{x.title}</p>
                                    <Points text={x.description} dot="bg-indigo-500" />
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </Section>

            <Section id={sid('ideal')} title="Ideal answer" tone="sky" icon={<Sparkles className="h-5 w-5" />}>
                <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">A model spoken answer. Try saying it in your own words.</p>
                    <CopyButton text={report.idealAnswer} />
                </div>
                <div className="space-y-3 rounded-xl bg-sky-50/70 dark:bg-sky-500/10 p-4 text-[15px] leading-relaxed text-gray-800 dark:text-gray-100">
                    {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
            </Section>

            <Section id={sid('communication')} title="Communication" tone="teal" icon={<MessageSquare className="h-5 w-5" />}>
                {cf ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            <RatingTile label="Clarity" value={cf.clarity} tone={ratingTone(cf.clarity)} icon={<MessageSquare className="h-3.5 w-3.5" />} />
                            <RatingTile label="Structure" value={cf.structure} tone={ratingTone(cf.structure)} icon={<Target className="h-3.5 w-3.5" />} />
                            <RatingTile label="Repetition" value={cf.repetition} tone={ratingTone(cf.repetition)} icon={<Repeat2 className="h-3.5 w-3.5" />} />
                        </div>
                        <Points text={cf.feedback} dot="bg-teal-500" />
                        {cf.languageFeedback && (
                            <div className="rounded-lg bg-teal-50/60 dark:bg-teal-500/10 p-2.5">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Language</p>
                                <Points text={cf.languageFeedback} dot="bg-teal-500" />
                            </div>
                        )}
                        {audioMetrics && (
                            <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Delivery <span className="font-normal text-gray-400">(from timestamps, approximate)</span></p>
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <RatingTile label="Pace" value={audioMetrics.wordsPerMinute === null ? '—' : `${audioMetrics.wordsPerMinute} wpm`} tone={paceTone(audioMetrics.wordsPerMinute)} icon={<Gauge className="h-3.5 w-3.5" />} />
                                    <RatingTile label="Long pauses (3s+)" value={String(audioMetrics.longPauseCount)} tone={audioMetrics.longPauseCount === 0 ? 'green' : audioMetrics.longPauseCount < 3 ? 'amber' : 'red'} icon={<Timer className="h-3.5 w-3.5" />} />
                                    <RatingTile label="Speaking time" value={formatClock(audioMetrics.speakingDurationSeconds)} tone="gray" icon={<Timer className="h-3.5 w-3.5" />} />
                                    <RatingTile label="Words" value={String(audioMetrics.wordCount)} tone="gray" icon={<FileText className="h-3.5 w-3.5" />} />
                                </div>
                                {cf.deliveryFeedback && <div className="mt-2"><Points text={cf.deliveryFeedback} dot="bg-teal-500" /></div>}
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400">Pronunciation, accent and voice are not assessed.</p>
                    </div>
                ) : <Empty>No communication feedback.</Empty>}
            </Section>

            <Section id={sid('transcript')} title="Transcript" tone="gray" icon={<FileText className="h-5 w-5" />} defaultOpen={false}>
                {transcript ? <Transcript {...transcript} /> : <Empty>No transcript available.</Empty>}
            </Section>

            <p className="px-1 text-[11px] text-gray-400">
                Evaluated by {report.metadata.evaluationModel} · transcribed by {report.metadata.transcriptionModel} · rubric {report.metadata.rubricVersion} · {new Date(report.metadata.createdAt).toLocaleString()}
            </p>
        </div>
    );
}

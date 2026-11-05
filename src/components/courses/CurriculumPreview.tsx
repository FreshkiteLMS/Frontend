'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { CurriculumDraft } from '@/types/structured-course';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Requested versus generated counts, shown only for the numbers the admin actually asked for. */
function CountComparison({ summary }: { summary: CurriculumDraft['summary'] }) {
    const rows = [
        { label: 'Modules', requested: summary.requestedModules, generated: summary.generatedModules },
        { label: 'Lessons', requested: summary.requestedLessons, generated: summary.generatedLessons },
    ].filter((r) => r.requested !== null);
    if (!rows.length) return null;
    return (
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Requested versus generated">
            {rows.map((r) => (
                <div key={r.label} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-3 py-2">
                    <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{r.label}: requested vs generated</dt>
                    <dd className={`text-sm font-semibold tabular-nums ${r.requested === r.generated ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-300'}`}>
                        {r.requested} requested · {r.generated} generated
                    </dd>
                </div>
            ))}
        </dl>
    );
}

interface CurriculumPreviewProps {
    draft: CurriculumDraft;
    /** Disable the actions while a run or a request is in flight. */
    busy: boolean;
    applying: boolean;
    onApply: (acknowledgeReview: boolean) => void;
    onDiscard: () => void;
}

/**
 * The generated curriculum, for review before it replaces anything students can
 * see: counts, requested versus generated, deviations, content-preservation
 * flags, and every module and lesson (collapsible).
 */
export function CurriculumPreview({ draft, busy, applying, onApply, onDiscard }: CurriculumPreviewProps) {
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [acknowledged, setAcknowledged] = useState(false);
    const { summary } = draft;
    const allOpen = draft.modules.length > 0 && draft.modules.every((m) => open[m.id]);
    const needsAck = draft.needs_review;
    const replacing = draft.current !== null;

    return (
        <section aria-labelledby="curriculum-preview-title" className="mt-5 rounded-lg border border-blue-100 dark:border-blue-900 bg-white dark:bg-gray-800 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h5 id="curriculum-preview-title" className="text-sm font-semibold text-gray-900 dark:text-white">Generated curriculum — awaiting your review</h5>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                    {plural(summary.generatedModules, 'module')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                    {plural(summary.generatedLessons, 'lesson')}
                </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {replacing
                    ? `Students still see the current curriculum (${plural(draft.current!.modules, 'module')}, ${plural(draft.current!.lessons, 'lesson')}) until you apply this one.`
                    : 'Nothing is saved to the course until you apply this curriculum.'}
            </p>

            <CountComparison summary={summary} />

            {summary.deviationReason && (
                <p role="note" className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">Why the counts differ: </span>{summary.deviationReason}
                </p>
            )}

            {draft.review_reasons.length > 0 && (
                <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-red-800 dark:text-red-200">
                        <p className="font-semibold">Check before applying — some source content may not be fully preserved</p>
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                            {draft.review_reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Modules and lessons</span>
                <button
                    type="button"
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setOpen(allOpen ? {} : Object.fromEntries(draft.modules.map((m) => [m.id, true])))}
                >
                    {allOpen ? 'Collapse all' : 'Expand all'}
                </button>
            </div>
            <ol className="mt-2 space-y-1.5 max-h-96 overflow-y-auto text-sm">
                {draft.modules.map((m, mi) => {
                    const expanded = !!open[m.id];
                    return (
                        <li key={m.id} className="rounded-lg border border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => setOpen((o) => ({ ...o, [m.id]: !expanded }))}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                            >
                                {expanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                                <span className="font-medium text-gray-800 dark:text-gray-200 flex-1 min-w-0">{mi + 1}. {m.title}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{plural(m.lessons.length, 'lesson')}</span>
                            </button>
                            {expanded && (
                                <div className="px-3 pb-3">
                                    {m.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{m.description}</p>}
                                    <ul className="space-y-2">
                                        {m.lessons.map((l) => (
                                            <li key={l.id} className="ml-5">
                                                <p className="text-gray-800 dark:text-gray-200">• {l.title}</p>
                                                {l.description && <p className="text-xs text-gray-500 dark:text-gray-400">{l.description}</p>}
                                                {l.source_sections.length > 0 && (
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500">From: {l.source_sections.join(' · ')}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>

            {draft.warnings.length > 0 && (
                <details className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                    <summary className="cursor-pointer font-semibold">{plural(draft.warnings.length, 'processing warning')}</summary>
                    <ul className="mt-1.5 list-disc list-inside space-y-0.5">
                        {draft.warnings.slice(0, 20).map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </details>
            )}

            {needsAck && (
                <label className="mt-4 flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <input type="checkbox" className="mt-0.5" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                    I have reviewed the warnings above and want to apply this curriculum anyway.
                </label>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    onClick={() => onApply(acknowledged)}
                    disabled={busy || applying || (needsAck && !acknowledged)}
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                    {replacing ? 'Replace current curriculum with this one' : 'Apply this curriculum'}
                </button>
                <button
                    type="button"
                    onClick={onDiscard}
                    disabled={busy || applying}
                    className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Discard
                </button>
            </div>
        </section>
    );
}

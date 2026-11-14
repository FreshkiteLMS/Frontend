"use client";

import { Fragment, memo, type ReactNode } from 'react';
import { CheckCircle2, Circle, CircleDot, CircleSlash, Clock3, XCircle } from 'lucide-react';
import type { AptitudeDifficulty, AptitudeResult, AptitudeWorkflow } from '@/types/aptitude';

/** null → "—": a percentage without data is never shown as 0 %. */
export const fmtPct = (v: number | null | undefined, digits = 0) => (typeof v === 'number' ? `${v.toFixed(digits)}%` : '—');

const WORKFLOW: Record<AptitudeWorkflow, { label: string; cls: string; Icon: typeof Circle }> = {
    not_started: { label: 'Not started', cls: 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400', Icon: Circle },
    in_progress: { label: 'In progress', cls: 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300', Icon: CircleDot },
    completed: { label: 'Completed', cls: 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300', Icon: Clock3 },
};

/** Workflow status: an outlined chip (where the student is). */
export function WorkflowBadge({ status }: { status: AptitudeWorkflow }) {
    const s = WORKFLOW[status] ?? WORKFLOW.not_started;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
            <s.Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {s.label}
        </span>
    );
}

const RESULT: Record<AptitudeResult, { label: string; cls: string; Icon: typeof Circle }> = {
    not_evaluated: { label: 'Not evaluated', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', Icon: CircleSlash },
    pass: { label: 'Pass', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', Icon: CheckCircle2 },
    fail: { label: 'Fail', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', Icon: XCircle },
};

/** Evaluation result: a filled chip (how the latest answer was marked). */
export function ResultBadge({ result, prefix }: { result: AptitudeResult; prefix?: string }) {
    const r = RESULT[result] ?? RESULT.not_evaluated;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${r.cls}`}>
            <r.Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {prefix ? `${prefix} ${r.label.toLowerCase()}` : r.label}
        </span>
    );
}

const DIFF: Record<AptitudeDifficulty, string> = {
    easy: 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30',
    medium: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30',
    hard: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/30',
};
export function DifficultyTag({ value }: { value: AptitudeDifficulty | null }) {
    if (!value) return null;
    return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${DIFF[value]}`}>{value}</span>;
}

const IMAGE_RE = /\[Image:\s*(https?:\/\/[^\]\s]+)\s*\]/g;

/**
 * Document-derived text: rendered as plain React text (never HTML), with line
 * breaks and spacing preserved so expressions like "120 / 2 = 60" and tables
 * of numbers stay readable; `[Image: url]` tokens from the document become images.
 */
export const RichQuestionText = memo(function RichQuestionText({ text, className = '' }: { text: string; className?: string }) {
    const parts: ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(IMAGE_RE)) {
        if (m.index! > last) parts.push(<Fragment key={`t${last}`}>{text.slice(last, m.index)}</Fragment>);
        parts.push(
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`i${m.index}`} src={m[1]} alt="Figure from the question" loading="lazy" className="my-3 block max-h-80 max-w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700" />
        );
        last = m.index! + m[0].length;
    }
    if (last < text.length) parts.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
    return <div className={`whitespace-pre-wrap break-words [font-variant-numeric:tabular-nums] ${className}`}>{parts}</div>;
});

/** Circular progress (0–100). */
export function ProgressRing({ value, size = 96, label }: { value: number; size?: number; label: string }) {
    const r = (size - 10) / 2;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, value));
    return (
        <div className="relative inline-flex shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${v}%`}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" className="fill-none stroke-gray-200 dark:stroke-gray-700" />
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" strokeLinecap="round" className="fill-none stroke-blue-600 transition-[stroke-dashoffset] duration-500" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{v}%</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">done</span>
            </span>
        </div>
    );
}

export function StatTile({ label, value, sub, tone = 'neutral' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'neutral' | 'green' | 'red' | 'blue' }) {
    const t = { neutral: 'text-gray-900 dark:text-white', green: 'text-green-700 dark:text-green-400', red: 'text-red-700 dark:text-red-400', blue: 'text-blue-700 dark:text-blue-400' }[tone];
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${t}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
    );
}

/** Thin stacked bar: passed / failed / in progress / not started. */
export function OutcomeBar({ total, passed, failed, inProgress }: { total: number; passed: number; failed: number; inProgress: number }) {
    if (!total) return <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" />;
    const w = (n: number) => `${(n / total) * 100}%`;
    return (
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" role="img" aria-label={`${passed} passed, ${failed} failed, ${inProgress} in progress, ${total - passed - failed - inProgress} not started`}>
            <span className="bg-green-500" style={{ width: w(passed) }} />
            <span className="bg-red-500" style={{ width: w(failed) }} />
            <span className="bg-amber-400" style={{ width: w(inProgress) }} />
        </div>
    );
}

export const fmtWhen = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

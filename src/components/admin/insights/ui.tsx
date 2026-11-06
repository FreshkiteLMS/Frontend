"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Info, Lock, RefreshCw } from 'lucide-react';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { httpStatus } from '@/services/api/admin-insights.api';

/* ───────────── Data loading ───────────── */

export interface AsyncState<T> {
    data: T | null;
    error: unknown;
    loading: boolean;
    reload: () => void;
}

/** Load once per `key`; stale responses (key changed meanwhile) are dropped. */
export function useAsync<T>(fn: () => Promise<T>, key: string, enabled = true): AsyncState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [loading, setLoading] = useState(enabled);
    const [nonce, setNonce] = useState(0);
    const fnRef = useRef(fn);
    useEffect(() => { fnRef.current = fn; });

    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        setLoading(true);
        setError(null);
        fnRef.current().then(
            d => { if (alive) { setData(d); setLoading(false); } },
            e => { if (alive) { setError(e); setLoading(false); } },
        );
        return () => { alive = false; };
    }, [key, nonce, enabled]);

    const reload = useCallback(() => setNonce(n => n + 1), []);
    return { data, error, loading, reload };
}

/** Loading → skeleton, 403 → permission state, other errors → retry. */
export function Async<T>({ state, skeleton, children }: { state: AsyncState<T>; skeleton?: ReactNode; children: (data: T) => ReactNode }) {
    if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
    if (state.loading && !state.data) return <>{skeleton ?? <SkeletonBlock rows={4} />}</>;
    if (!state.data) return null;
    return <>{children(state.data)}</>;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
    const status = httpStatus(error);
    if (status === 403 || status === 401) {
        return (
            <div role="alert" className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
                <Lock className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <p className="mt-2 font-semibold text-amber-900 dark:text-amber-200">You don&apos;t have permission to view this</p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Student analytics are available to administrators only.</p>
            </div>
        );
    }
    return (
        <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300 flex flex-wrap items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">{status === 404 ? 'Not found.' : apiErrorMessage(error, 'Something went wrong while loading this.')}</span>
            {onRetry && status !== 404 && (
                <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-semibold underline">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                </button>
            )}
        </div>
    );
}

export function SkeletonBlock({ rows = 3, className = '' }: { rows?: number; className?: string }) {
    return (
        <div className={`space-y-3 animate-pulse ${className}`} aria-busy="true" aria-label="Loading">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800/70" />
            ))}
        </div>
    );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-10 text-center">
            {icon && <div className="mx-auto mb-2 flex justify-center text-gray-300 dark:text-gray-600">{icon}</div>}
            <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
            {children && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{children}</div>}
        </div>
    );
}

/** Honest note about what the data can and cannot show. */
export function DataNote({ children }: { children: ReactNode }) {
    return (
        <p className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}

/* ───────────── Layout ───────────── */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                {items.map((it, i) => (
                    <li key={i} className="flex items-center gap-1 min-w-0">
                        {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        {it.href ? (
                            <Link href={it.href} className="hover:text-gray-900 dark:hover:text-white truncate">{it.label}</Link>
                        ) : (
                            <span aria-current="page" className="font-medium text-gray-900 dark:text-white truncate">{it.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export interface TabDef<T extends string> { id: T; label: string; count?: number | null; hidden?: boolean }

export function TabBar<T extends string>({ tabs, active, onChange, label }: { tabs: TabDef<T>[]; active: T; onChange: (t: T) => void; label: string }) {
    const shown = tabs.filter(t => !t.hidden);
    return (
        <div role="tablist" aria-label={label} className="-mx-4 sm:mx-0 mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 px-4 sm:px-0">
            {shown.map(t => (
                <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active === t.id}
                    onClick={() => onChange(t.id)}
                    className={`whitespace-nowrap px-3.5 py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors ${
                        active === t.id
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t.label}
                    {t.count !== undefined && t.count !== null && (
                        <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[11px] tabular-nums">{t.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

export function Panel({ title, subtitle, actions, children, className = '' }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 ${className}`}>
            {(title || actions) && (
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        {title && <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>}
                        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}

/** A labelled figure inside a panel (not a stand-alone stat card). */
export function Figure({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-xl font-semibold tabular-nums ${tone ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
    );
}

export function ProgressBar({ value, label, tone = 'blue', className = '' }: { value: number | null | undefined; label?: string; tone?: 'blue' | 'green'; className?: string }) {
    const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
    const fill = tone === 'green' ? 'bg-[#0ca30c]' : 'bg-[#2a78d6] dark:bg-[#3987e5]';
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="h-1.5 flex-1 min-w-[48px] rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
                <div className={`h-full rounded-full ${fill}`} style={{ width: `${v}%` }} />
            </div>
            <span className="w-9 text-right text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300">{v}%</span>
        </div>
    );
}

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';
    if (url) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={url} alt="" width={size} height={size} className="rounded-full object-cover shrink-0 bg-gray-100" style={{ width: size, height: size }} />;
    }
    return (
        <span aria-hidden="true" className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
            {initials}
        </span>
    );
}

export function StudentCode({ code }: { code: string | null | undefined }) {
    if (!code) return <span className="text-xs text-gray-400" title="Student ID not assigned yet">—</span>;
    return <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">{code}</span>;
}

const STATUS_TONE: Record<string, string> = {
    active: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800',
    inactive: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800',
    never: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700',
    neutral: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
    info: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800',
    danger: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800',
};

export function Pill({ tone = 'neutral', children, title }: { tone?: keyof typeof STATUS_TONE | string; children: ReactNode; title?: string }) {
    return <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${STATUS_TONE[tone] ?? STATUS_TONE.neutral}`}>{children}</span>;
}

export const ACTIVITY_LABEL: Record<string, string> = { active: 'Active', inactive: 'Inactive', never: 'No activity yet' };

/* ───────────── Formatting ───────────── */

export const fmtDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d?: string | Date | null) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
export function fmtRelative(d?: string | Date | null, never = 'Never') {
    if (!d) return never;
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return fmtDate(d);
}

export const EVENT_LABEL: Record<string, string> = {
    lesson_completed: 'Lesson completed',
    problem_solved: 'Problem solved',
    assessment_submitted: 'Test submitted',
    question_completed: 'Question completed',
    audio_submitted: 'Audio answer recorded',
    logic_submitted: 'Approach explained (audio)',
    course_enrolled: 'Enrolled in course',
    course_completed: 'Course completed',
    certificate_earned: 'Certificate earned',
    assignment_evaluated: 'Assignment assessed',
    meeting_attendance: 'Meeting attendance',
};

export const VIA_LABEL: Record<string, string> = { direct: 'Purchased / assigned', batch: 'Via batch', bundle: 'Via bundle', full_access: 'Full access' };

export const inputCls = 'px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';
export const btnSecondary = 'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50';
export const btnPrimary = 'inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';

"use client";

import { useMemo, useState, type ReactNode } from 'react';
import { EVENT_LABEL } from './ui';

/*
 * Small, dependency-free charts for the admin views.
 * Colour roles (reference data-viz palette, sequential blue):
 *   single series   #2a78d6 light / #3987e5 dark
 *   heat levels 1-4 light #b7d3f6 #6da7ec #2a78d6 #184f95 · dark #184f95 #256abf #3987e5 #86b6ef
 *   zero            neutral surface tint (gray-100 / gray-800)
 * Every chart has a hover tooltip and a table view; colour never carries meaning alone.
 */

const HEAT = [
    'bg-gray-100 dark:bg-gray-800',
    'bg-[#b7d3f6] dark:bg-[#184f95]',
    'bg-[#6da7ec] dark:bg-[#256abf]',
    'bg-[#2a78d6] dark:bg-[#3987e5]',
    'bg-[#184f95] dark:bg-[#86b6ef]',
];
const SERIES = 'bg-[#2a78d6] dark:bg-[#3987e5]';

interface Tip { x: number; y: number; content: ReactNode }

function Tooltip({ tip }: { tip: Tip | null }) {
    if (!tip) return null;
    return (
        <div
            role="tooltip"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 dark:bg-gray-100 px-2.5 py-1.5 text-xs text-white dark:text-gray-900 shadow-lg whitespace-nowrap"
            style={{ left: tip.x, top: tip.y - 6 }}
        >
            {tip.content}
        </div>
    );
}

const dayLabel = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** GitHub-style calendar: one column per week (Sun→Sat), intensity from the student's own quartiles. */
export function ActivityHeatmap({ days, levels }: { days: { date: string; count: number; types: Record<string, number> }[]; levels: number[] }) {
    const [tip, setTip] = useState<Tip | null>(null);
    const [showTable, setShowTable] = useState(false);
    const level = (c: number) => (c <= 0 ? 0 : c <= (levels[0] || 1) ? 1 : c <= (levels[1] || 2) ? 2 : c <= (levels[2] || 3) ? 3 : 4);

    const { weeks, months } = useMemo(() => {
        if (!days.length) return { weeks: [] as (typeof days[number] | null)[][], months: [] as { col: number; label: string }[] };
        const firstDow = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
        const cells: (typeof days[number] | null)[] = [...Array(firstDow).fill(null), ...days];
        const w: (typeof days[number] | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
        const m: { col: number; label: string }[] = [];
        let last = '';
        w.forEach((col, i) => {
            const first = col.find(Boolean);
            if (!first) return;
            const mk = first.date.slice(0, 7);
            if (mk !== last) {
                last = mk;
                m.push({ col: i, label: new Date(`${first.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }) });
            }
        });
        return { weeks: w, months: m };
    }, [days]);

    const active = days.filter(d => d.count > 0);

    return (
        <div>
            <div className="relative overflow-x-auto pb-1" onMouseLeave={() => setTip(null)}>
                <div className="inline-block min-w-full">
                    <div className="relative ml-7 h-4 text-[10px] text-gray-500 dark:text-gray-400">
                        {months.map(m => <span key={`${m.col}-${m.label}`} className="absolute" style={{ left: m.col * 13 }}>{m.label}</span>)}
                    </div>
                    <div className="flex gap-[2px]">
                        <div className="mr-1 flex w-6 flex-col gap-[2px] text-[10px] text-gray-500 dark:text-gray-400">
                            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => <span key={i} className="h-[11px] leading-[11px]">{l}</span>)}
                        </div>
                        {weeks.map((col, wi) => (
                            <div key={wi} className="flex flex-col gap-[2px]">
                                {Array.from({ length: 7 }, (_, di) => {
                                    const d = col[di];
                                    if (!d) return <span key={di} className="h-[11px] w-[11px]" />;
                                    return (
                                        <span
                                            key={di}
                                            className={`h-[11px] w-[11px] rounded-[2px] ${HEAT[level(d.count)]}`}
                                            onMouseEnter={e => {
                                                const host = (e.currentTarget.closest('.relative') as HTMLElement).getBoundingClientRect();
                                                const r = e.currentTarget.getBoundingClientRect();
                                                setTip({
                                                    x: r.left - host.left + r.width / 2,
                                                    y: r.top - host.top,
                                                    content: (
                                                        <span>
                                                            <strong>{d.count} learning action{d.count === 1 ? '' : 's'}</strong> · {dayLabel(d.date)}
                                                            {Object.entries(d.types).map(([t, n]) => <span key={t} className="block opacity-80">{EVENT_LABEL[t] ?? t}: {n}</span>)}
                                                        </span>
                                                    ),
                                                });
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <Tooltip tip={tip} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <button type="button" onClick={() => setShowTable(s => !s)} className="underline hover:text-gray-800 dark:hover:text-gray-200" aria-expanded={showTable}>
                    {showTable ? 'Hide' : 'Show'} active days as a table
                </button>
                <span className="flex items-center gap-1" aria-hidden="true">
                    Less {HEAT.map((c, i) => <span key={i} className={`h-[11px] w-[11px] rounded-[2px] ${c}`} />)} More
                </span>
            </div>
            {showTable && (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
                    {active.length === 0 ? <p className="p-3 text-sm text-gray-500">No learning activity in this range.</p> : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs text-gray-500"><tr><th className="px-3 py-2">Day</th><th className="px-3 py-2">Actions</th><th className="px-3 py-2">Breakdown</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {active.slice().reverse().map(d => (
                                    <tr key={d.date}><td className="px-3 py-1.5 whitespace-nowrap">{dayLabel(d.date)}</td><td className="px-3 py-1.5 tabular-nums">{d.count}</td>
                                        <td className="px-3 py-1.5 text-xs text-gray-500">{Object.entries(d.types).map(([t, n]) => `${EVENT_LABEL[t] ?? t} ${n}`).join(' · ')}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

/** Single-series vertical bars (e.g. events per day / week). */
export function BarSeries({ data, height = 120, valueLabel, labelEvery = 1 }: {
    data: { label: string; value: number; tooltip?: ReactNode }[];
    height?: number;
    valueLabel: string;
    labelEvery?: number;
}) {
    const [tip, setTip] = useState<Tip | null>(null);
    const [showTable, setShowTable] = useState(false);
    const max = Math.max(1, ...data.map(d => d.value));
    return (
        <div>
            <div className="relative" onMouseLeave={() => setTip(null)}>
                <div className="flex items-end gap-[2px] border-b border-gray-200 dark:border-gray-700" style={{ height }}>
                    {data.map((d, i) => (
                        <div
                            key={i}
                            className="group flex h-full flex-1 min-w-[3px] items-end"
                            onMouseEnter={e => {
                                const host = (e.currentTarget.parentElement!.parentElement as HTMLElement).getBoundingClientRect();
                                const r = e.currentTarget.getBoundingClientRect();
                                const barTop = r.bottom - (d.value / max) * height;
                                setTip({ x: r.left - host.left + r.width / 2, y: barTop - host.top, content: d.tooltip ?? <span><strong>{d.value}</strong> {valueLabel} · {d.label}</span> });
                            }}
                        >
                            <div className={`w-full rounded-t-[4px] ${SERIES} group-hover:opacity-80`} style={{ height: d.value ? Math.max(2, (d.value / max) * height) : 0 }} />
                        </div>
                    ))}
                </div>
                <Tooltip tip={tip} />
            </div>
            <div className="mt-1 flex gap-[2px] text-[10px] text-gray-500 dark:text-gray-400">
                {data.map((d, i) => <span key={i} className="flex-1 min-w-[3px] truncate text-center">{i % labelEvery === 0 ? d.label : ''}</span>)}
            </div>
            <button type="button" onClick={() => setShowTable(s => !s)} className="mt-1 text-[11px] text-gray-500 underline hover:text-gray-800 dark:hover:text-gray-200" aria-expanded={showTable}>
                {showTable ? 'Hide' : 'Show'} table
            </button>
            {showTable && (
                <table className="mt-2 w-full text-xs">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {data.map((d, i) => <tr key={i}><td className="py-1 text-gray-500">{d.label}</td><td className="py-1 text-right tabular-nums text-gray-800 dark:text-gray-200">{d.value}</td></tr>)}
                    </tbody>
                </table>
            )}
        </div>
    );
}

/** Labelled horizontal bars: distributions and per-item rates. Values are always printed. */
export function HBars({ items, max, unit = '' }: { items: { label: ReactNode; value: number; note?: ReactNode }[]; max?: number; unit?: string }) {
    const top = max ?? Math.max(1, ...items.map(i => i.value));
    return (
        <ul className="space-y-2.5">
            {items.map((it, i) => (
                <li key={i}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-gray-700 dark:text-gray-300">{it.label}</span>
                        <span className="shrink-0 tabular-nums text-gray-600 dark:text-gray-400">{it.value}{unit}{it.note ? <span className="ml-1 text-xs text-gray-400">{it.note}</span> : null}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden" title={`${it.value}${unit}`}>
                        <div className={`h-full rounded-full ${SERIES}`} style={{ width: `${Math.min(100, (it.value / top) * 100)}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/**
 * One bar split into labelled parts (e.g. completed / in progress / not started).
 * Parts are separated by a 2px surface gap and always listed with their counts.
 */
export function SplitBar({ parts, label }: { parts: { label: string; value: number; className: string }[]; label: string }) {
    const total = parts.reduce((n, p) => n + p.value, 0);
    return (
        <div>
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" role="img" aria-label={`${label}: ${parts.map(p => `${p.label} ${p.value}`).join(', ')}`}>
                {total > 0 && parts.filter(p => p.value > 0).map(p => <div key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.value}`} />)}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                {parts.map(p => (
                    <li key={p.label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${p.className}`} aria-hidden="true" />{p.label} <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">{p.value}</span></li>
                ))}
            </ul>
        </div>
    );
}

/** Course status parts (blue = in progress, green = completed, gray = not started), shared by several views. */
export const COURSE_PARTS = {
    completed: 'bg-[#0ca30c]',
    inProgress: 'bg-[#2a78d6] dark:bg-[#3987e5]',
    notStarted: 'bg-gray-300 dark:bg-gray-600',
};

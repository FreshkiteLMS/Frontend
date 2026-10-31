"use client";

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Info, Loader2, RefreshCw, RotateCcw, Search, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { leaderboardService, type LeaderboardPage, type LeaderboardRow } from '@/services/api/leaderboard.api';
import { LeaderAvatar, RankBadge, SCORING_RULES, rowSummary } from './leaderboard-shared';

const PAGE_SIZE = 20;

/** Full LMS leaderboard: ranked, searchable, paginated, with how points are earned. */
export function LeaderboardBoard() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [data, setData] = useState<LeaderboardPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [rebuilding, setRebuilding] = useState(false);

    useEffect(() => {
        const id = window.setTimeout(() => {
            setDebounced(query.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(id);
    }, [query]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await leaderboardService.getPage({ page, limit: PAGE_SIZE, q: debounced || undefined }));
            setError(null);
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message || e?.message || 'Could not load the leaderboard');
        } finally {
            setLoading(false);
        }
    }, [page, debounced]);

    useEffect(() => {
        void load();
    }, [load]);

    const rebuild = async () => {
        setRebuilding(true);
        try {
            const { rescored } = await leaderboardService.rebuild();
            toast.success(`Recalculated ${rescored} students`);
            await load();
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(e?.response?.data?.message || e?.message || 'Rebuild failed');
        } finally {
            setRebuilding(false);
        }
    };

    const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white">
                        <Trophy className="w-7 h-7 text-amber-500" /> Leaderboard
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Rankings across all LMS courses, problem sets and assessments.
                        {data?.updated_at && <> Updated {new Date(data.updated_at).toLocaleString()}.</>}
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Find a student"
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>
                    {isAdmin && (
                        <button
                            onClick={rebuild}
                            disabled={rebuilding}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                            title="Re-score every student now"
                        >
                            {rebuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Recalculate
                        </button>
                    )}
                </div>
            </header>

            {data?.me && (
                <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex flex-wrap items-center gap-4">
                    <LeaderAvatar person={data.me.user} size={48} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-blue-100">Your rank</p>
                        <p className="text-2xl font-black">#{data.me.rank} <span className="text-base font-medium text-blue-100">of {data.total_students}</span></p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-blue-100">Points</p>
                        <p className="text-2xl font-black tabular-nums">{data.me.points.toLocaleString()}</p>
                    </div>
                    <p className="w-full text-sm text-blue-100">{rowSummary(data.me)}</p>
                </div>
            )}

            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                {error ? (
                    <div className="p-8 text-center space-y-3">
                        <p className="text-sm text-gray-500">{error}</p>
                        <button onClick={() => void load()} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <RotateCcw className="w-4 h-4" /> Try again
                        </button>
                    </div>
                ) : loading && !data ? (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800 animate-pulse">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <li key={i} className="flex items-center gap-4 px-5 py-4">
                                <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                                <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                                <span className="flex-1 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                            </li>
                        ))}
                    </ul>
                ) : data && data.data.length === 0 ? (
                    <p className="p-10 text-center text-sm text-gray-500">
                        {debounced ? `No students match “${debounced}”.` : 'No progress recorded yet.'}
                    </p>
                ) : (
                    <ol className={`divide-y divide-gray-100 dark:divide-gray-800 ${loading ? 'opacity-60' : ''}`}>
                        {data?.data.map((row) => (
                            <Row key={row.user.id} row={row} open={expanded === row.user.id} onToggle={() => setExpanded((e) => (e === row.user.id ? null : row.user.id))} />
                        ))}
                    </ol>
                )}

                {data && data.total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
                        <span className="text-gray-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40" aria-label="Previous page">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40" aria-label="Next page">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-3">
                    <Info className="w-4 h-4 text-blue-500" /> How points are earned
                </h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                    {SCORING_RULES.map((r) => (
                        <li key={r.label} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.detail}</p>
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-gray-400 mt-3">Repeating a lesson or retaking a test never adds points twice — only your best result counts.</p>
            </section>
        </div>
    );
}

function Row({ row, open, onToggle }: { row: LeaderboardRow; open: boolean; onToggle: () => void }) {
    const b = row.breakdown;
    return (
        <li className={row.is_me ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}>
            <button onClick={onToggle} className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40" aria-expanded={open}>
                <RankBadge rank={row.rank} />
                <LeaderAvatar person={row.user} size={40} />
                <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {row.user.name}{row.is_me && <span className="ml-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">(you)</span>}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{rowSummary(row)}</span>
                </span>
                <span className="text-right">
                    <span className="block text-base font-black tabular-nums text-gray-900 dark:text-white">{row.points.toLocaleString()}</span>
                    <span className="block text-[11px] text-gray-400">points</span>
                </span>
            </button>
            {open && (
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pb-4 text-xs">
                    <Stat label="Courses" value={b.course_points} />
                    <Stat label="Problem solving" value={b.problem_points} />
                    <Stat label="Completion bonus" value={b.completion_bonus} />
                    <Stat label="Assessments" value={b.assessment_points} />
                    <Stat label="Lessons done" value={row.stats.lessons_completed} plain />
                    <Stat label="Problems (E/M/H)" text={`${row.stats.problems_by_difficulty.easy}/${row.stats.problems_by_difficulty.medium}/${row.stats.problems_by_difficulty.hard}`} />
                    <Stat label="Questions done" value={row.stats.questions_completed} plain />
                    <Stat label="Assessments taken" value={row.stats.assessments_taken} plain />
                </dl>
            )}
        </li>
    );
}

function Stat({ label, value, text, plain }: { label: string; value?: number; text?: string; plain?: boolean }) {
    return (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="font-bold text-gray-900 dark:text-white tabular-nums">{text ?? (plain ? value : `${value} pts`)}</dd>
        </div>
    );
}

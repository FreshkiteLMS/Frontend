"use client";

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Mic, Search, Users } from 'lucide-react';
import { problemCourseService } from '@/services/api/problem-course.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { ProblemProgressSummary, ProblemStudentProgressRow } from '@/types/problem-course';
import { scoreColor } from '@/components/courses/problem-tracker/LogicAssessmentReport';
import { LogicAssessmentsTab } from './LogicAssessmentsTab';

type View = 'students' | 'logic';

const SORTS = [
    { v: 'name:asc', label: 'Name (A–Z)' },
    { v: 'activity:desc', label: 'Recently active' },
    { v: 'solved:desc', label: 'Most problems solved' },
    { v: 'score:desc', label: 'Highest logic score' },
    { v: 'score:asc', label: 'Lowest logic score' },
];

const fmtScore = (s: number | null) => (s === null ? '—' : `${s}/10`);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never');

/**
 * Admin "Student progress" for a Problem Solving course: each student's tracker
 * progress next to their "Explain your approach" (AI logic) results, with a
 * drill-down into every assessment. Scores are out of 10.
 */
export function ProblemProgressDashboard({ courseId }: { courseId: string }) {
    const [view, setView] = useState<View>('students');
    const [focus, setFocus] = useState<{ userId: string; name: string } | null>(null);
    const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
    const [rows, setRows] = useState<ProblemStudentProgressRow[]>([]);
    const [summary, setSummary] = useState<ProblemProgressSummary | null>(null);
    const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const [activity, setActivity] = useState('');
    const [sort, setSort] = useState(SORTS[0].v);
    const [page, setPage] = useState(1);

    useEffect(() => {
        problemCourseService.adminProblems(courseId)
            .then(s => setSections(s.map(x => ({ id: x.id, title: x.title }))))
            .catch(() => setSections([]));
    }, [courseId]);

    // Typing searches after a short pause.
    useEffect(() => { const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, dir] = sort.split(':');
            const r = await problemCourseService.studentProgress(courseId, { q: query, activity, sort: s, dir, page, limit: 25 });
            setRows(r.data);
            setMeta(r.meta);
            setSummary(r.summary);
            setError(null);
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load student progress.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, query, activity, sort, page]);
    useEffect(() => { void load(); }, [load]);

    const openStudent = (r: ProblemStudentProgressRow) => {
        setFocus({ userId: r.userId, name: r.name });
        setView('logic');
    };

    const input = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';
    const tabs: { id: View; label: string; Icon: typeof Users }[] = [
        { id: 'students', label: 'Students', Icon: Users },
        { id: 'logic', label: 'Logic assessments', Icon: Mic },
    ];
    const cards = summary ? [
        ['Students', summary.students],
        ['Active', summary.active],
        ['Avg. problems solved', `${summary.averageSolvedPercent}%`],
        ['Explained an approach', summary.studentsExplained],
        ['Avg. logic score', fmtScore(summary.averageLogicScore)],
    ] : [];

    return (
        <div className="space-y-5">
            <div role="tablist" aria-label="Progress views" className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
                {tabs.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={view === id}
                        onClick={() => { setView(id); if (id === 'students') setFocus(null); }}
                        className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${view === id ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />{label}
                    </button>
                ))}
            </div>

            {view === 'logic' ? (
                <LogicAssessmentsTab courseId={courseId} sections={sections} student={focus} onClearStudent={() => setFocus(null)} />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        {summary ? cards.map(([label, value]) => (
                            <div key={label as string} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                                <p className="mt-1 text-xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
                            </div>
                        )) : [0, 1, 2, 3, 4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Student name, email or ID" aria-label="Search students" className={`${input} w-full pl-9`} />
                        </div>
                        <select value={activity} onChange={e => { setActivity(e.target.value); setPage(1); }} aria-label="Activity" className={input}>
                            <option value="">All students</option>
                            <option value="active">Active</option>
                            <option value="inactive">Not started</option>
                            <option value="explained">Explained an approach</option>
                        </select>
                        <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} aria-label="Sort" className={input}>
                            {SORTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                        </select>
                    </div>

                    {error && (
                        <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
                            {error} <button type="button" onClick={() => void load()} className="font-medium underline">Retry</button>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/40 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">Student</th>
                                        <th className="px-4 py-3">Problems solved</th>
                                        <th className="px-4 py-3">Logic attempts</th>
                                        <th className="px-4 py-3">Avg. score</th>
                                        <th className="px-4 py-3">Best</th>
                                        <th className="px-4 py-3">Latest</th>
                                        <th className="px-4 py-3">Last active</th>
                                        <th className="px-4 py-3"><span className="sr-only">Action</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {loading && !rows.length ? [0, 1, 2].map(i => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-gray-100 dark:bg-gray-700" /></td></tr>)
                                        : rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">{query || activity ? 'No students match.' : 'No students in this course yet.'}</td></tr>
                                            : rows.map(r => (
                                                <tr key={r.userId} className={loading ? 'opacity-60' : ''}>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                                                        <p className="text-xs text-gray-500">{r.studentCode ?? r.email}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="tabular-nums text-gray-900 dark:text-white">{r.problems.solved} / {r.problems.total}</p>
                                                        <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200 dark:bg-gray-700" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.problems.percentSolved} aria-label={`${r.name}: ${r.problems.percentSolved}% solved`}>
                                                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.problems.percentSolved}%` }} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">
                                                        {r.logic.attempts}
                                                        {r.logic.attempts > 0 && <span className="block text-xs text-gray-500">{r.logic.problemsExplained} problem{r.logic.problemsExplained === 1 ? '' : 's'} assessed</span>}
                                                    </td>
                                                    <td className={`px-4 py-3 font-bold tabular-nums ${scoreColor(r.logic.averageScore)}`}>{fmtScore(r.logic.averageScore)}</td>
                                                    <td className={`px-4 py-3 tabular-nums ${scoreColor(r.logic.bestScore)}`}>{fmtScore(r.logic.bestScore)}</td>
                                                    <td className={`px-4 py-3 tabular-nums ${scoreColor(r.logic.latestScore)}`}>{fmtScore(r.logic.latestScore)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtDate(r.lastActivity)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => openStudent(r)}
                                                            disabled={r.logic.attempts === 0}
                                                            title={r.logic.attempts === 0 ? 'No logic assessments yet' : undefined}
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                                                        >
                                                            <Mic className="h-3.5 w-3.5" aria-hidden="true" />Results
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>
                        {meta && meta.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 text-xs text-gray-500">
                                <span>Page {meta.page} of {meta.totalPages} · {meta.total} students</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                                    <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages} aria-label="Next page" className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

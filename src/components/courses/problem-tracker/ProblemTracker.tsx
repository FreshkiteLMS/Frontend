"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw, SearchX, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { problemCourseService } from '@/services/api/problem-course.api';
import type { ProblemCourse, TrackerSection, ProblemStatus } from '@/types/problem-course';
import { computeStats, filterSections, isSolved, type DifficultyFilter, type StatusFilter } from './stats';
import { StatsDashboard } from './StatsDashboard';
import { SearchFilterBar } from './SearchFilterBar';
import { SectionCard } from './SectionCard';

const expandedKey = (courseId: string) => `pt-expanded-${courseId}`;

function loadExpanded(courseId: string): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(expandedKey(courseId));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/** Immutably replace one problem's status, keeping all other object refs stable
 *  so memoized sections/rows that didn't change skip re-rendering. */
function withStatus(sections: TrackerSection[], problemId: string, status: ProblemStatus): TrackerSection[] {
    return sections.map(section => {
        if (!section.problems.some(p => p.id === problemId)) return section;
        return {
            ...section,
            problems: section.problems.map(p =>
                p.id === problemId ? { ...p, userStatus: status, completed: isSolved(status) } : p
            ),
        };
    });
}

interface ProblemTrackerProps {
    courseId: string;
}

export function ProblemTracker({ courseId }: ProblemTrackerProps) {
    const router = useRouter();

    const [course, setCourse] = useState<ProblemCourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState('');
    const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');

    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [busyId, setBusyId] = useState<string | null>(null);

    // Latest sections ref so the status revert closure never goes stale.
    const sectionsRef = useRef<TrackerSection[]>([]);
    sectionsRef.current = course?.sections ?? [];

    const fetchTracker = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await problemCourseService.getTracker(courseId);
            setCourse(data);
            setExpanded(new Set(loadExpanded(courseId)));
        } catch (err: any) {
            const message = err?.response?.data?.error?.message || err?.message || 'Failed to load this tracker.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchTracker();
    }, [fetchTracker]);

    // Persist expansion state so it survives reloads (spec: "remember expansion").
    const persistExpanded = useCallback(
        (next: Set<string>) => {
            try {
                window.localStorage.setItem(expandedKey(courseId), JSON.stringify([...next]));
            } catch {
                /* ignore quota / private-mode errors */
            }
        },
        [courseId]
    );

    const toggleSection = useCallback(
        (sectionId: string) => {
            setExpanded(prev => {
                const next = new Set(prev);
                next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
                persistExpanded(next);
                return next;
            });
        },
        [persistExpanded]
    );

    const expandAll = useCallback(() => {
        const all = new Set((sectionsRef.current || []).map(s => s.id));
        setExpanded(all);
        persistExpanded(all);
    }, [persistExpanded]);

    const collapseAll = useCallback(() => {
        const empty = new Set<string>();
        setExpanded(empty);
        persistExpanded(empty);
    }, [persistExpanded]);

    const handleStatusChange = useCallback(
        async (problemId: string, next: ProblemStatus) => {
            const prevSections = sectionsRef.current;
            const prevProblem = prevSections.flatMap(s => s.problems).find(p => p.id === problemId);
            if (!prevProblem || prevProblem.userStatus === next) return;
            const prevStatus = prevProblem.userStatus;

            // Optimistic update
            setCourse(c => (c ? { ...c, sections: withStatus(c.sections, problemId, next) } : c));
            setBusyId(problemId);

            try {
                await problemCourseService.updateStatus(courseId, problemId, next);
            } catch (err: any) {
                // Revert on failure
                setCourse(c => (c ? { ...c, sections: withStatus(c.sections, problemId, prevStatus) } : c));
                toast.error(err?.response?.data?.error?.message || 'Could not save your status. Please try again.');
            } finally {
                setBusyId(cur => (cur === problemId ? null : cur));
            }
        },
        [courseId]
    );

    // ── Derived (memoized) ──
    const stats = useMemo(() => computeStats(course?.sections ?? []), [course?.sections]);

    const filtersActive = query.trim() !== '' || difficulty !== 'all' || status !== 'all';

    const visibleSections = useMemo(
        () => filterSections(course?.sections ?? [], query, difficulty, status),
        [course?.sections, query, difficulty, status]
    );

    // While filtering, reveal every matching section; otherwise honor the user's
    // saved expansion state.
    const effectiveExpanded = useMemo(
        () => (filtersActive ? new Set(visibleSections.map(s => s.id)) : expanded),
        [filtersActive, visibleSections, expanded]
    );

    // ── Render states ──
    if (loading) return <TrackerSkeleton />;

    if (error) {
        return (
            <ErrorState message={error} onRetry={fetchTracker} onBack={() => router.push('/student')} />
        );
    }

    if (!course) return null;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
                {/* Header */}
                <button
                    onClick={() => router.push('/student')}
                    className="mb-5 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </button>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">{course.title}</h1>
                    {course.description && (
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-slate-400">{course.description}</p>
                    )}
                </div>

                {/* Dashboard */}
                <div className="mb-6">
                    <StatsDashboard stats={stats} />
                </div>

                {/* Search + filters */}
                <SearchFilterBar
                    query={query}
                    onQueryChange={setQuery}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    status={status}
                    onStatusChange={setStatus}
                    onExpandAll={expandAll}
                    onCollapseAll={collapseAll}
                />

                {/* Sections */}
                <div className="mt-4 space-y-3">
                    {visibleSections.length === 0 ? (
                        <EmptyResults filtersActive={filtersActive} />
                    ) : (
                        visibleSections.map(section => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                expanded={effectiveExpanded.has(section.id)}
                                onToggle={toggleSection}
                                busyId={busyId}
                                onStatusChange={handleStatusChange}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-states ──────────────────────────────────────────────────────────────

function EmptyResults({ filtersActive }: { filtersActive: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16 text-center dark:border-slate-800">
            {filtersActive ? (
                <>
                    <SearchX className="mb-3 h-10 w-10 text-gray-400 dark:text-slate-600" />
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">No problems match your filters</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Try clearing the search or changing filters.</p>
                </>
            ) : (
                <>
                    <ListChecks className="mb-3 h-10 w-10 text-gray-400 dark:text-slate-600" />
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">This tracker has no problems yet</p>
                </>
            )}
        </div>
    );
}

function ErrorState({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 dark:bg-slate-950">
            <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 dark:bg-red-500/15">
                    <AlertCircle className="h-7 w-7 text-red-500 dark:text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Couldn&apos;t load the tracker</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{message}</p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        onClick={onBack}
                        className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Back
                    </button>
                    <button
                        onClick={onRetry}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </button>
                </div>
            </div>
        </div>
    );
}

function TrackerSkeleton() {
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-950">
            <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6">
                <div className="mb-6 h-8 w-1/2 rounded-lg bg-gray-200 dark:bg-slate-800" />
                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-slate-900" />
                    ))}
                </div>
                <div className="mb-4 h-12 rounded-2xl bg-gray-100 dark:bg-slate-900" />
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-slate-900" />
                    ))}
                </div>
            </div>
        </div>
    );
}

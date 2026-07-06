import { memo } from 'react';
import { Search, X, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { PROBLEM_STATUS_LABELS, PROBLEM_STATUS_ORDER } from '@/types/problem-course';
import type { DifficultyFilter, StatusFilter } from './stats';
import type { Difficulty } from '@/types/problem-course';

const DIFFICULTIES: DifficultyFilter[] = ['all', 'Easy', 'Medium', 'Hard'];

const DIFF_ACTIVE: Record<DifficultyFilter, string> = {
    all: 'bg-gray-900 text-white dark:bg-slate-200 dark:text-slate-900',
    Easy: 'bg-green-500 text-white',
    Medium: 'bg-amber-500 text-white',
    Hard: 'bg-red-500 text-white',
};

interface SearchFilterBarProps {
    query: string;
    onQueryChange: (q: string) => void;
    difficulty: DifficultyFilter;
    onDifficultyChange: (d: DifficultyFilter) => void;
    status: StatusFilter;
    onStatusChange: (s: StatusFilter) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
}

export const SearchFilterBar = memo(function SearchFilterBar({
    query,
    onQueryChange,
    difficulty,
    onDifficultyChange,
    status,
    onStatusChange,
    onExpandAll,
    onCollapseAll,
}: SearchFilterBarProps) {
    return (
        <div className="sticky top-16 z-20 -mx-4 border-b border-gray-200 bg-gray-50/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border dark:border-slate-800 dark:bg-slate-950/85 sm:px-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                    <input
                        type="text"
                        inputMode="search"
                        value={query}
                        onChange={e => onQueryChange(e.target.value)}
                        placeholder="Search problems, tags, difficulty, section…"
                        className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    {query && (
                        <button
                            onClick={() => onQueryChange('')}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Difficulty segmented control */}
                    <div className="flex items-center gap-1 rounded-xl border border-gray-300 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                        {DIFFICULTIES.map(d => (
                            <button
                                key={d}
                                onClick={() => onDifficultyChange(d)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    difficulty === d
                                        ? DIFF_ACTIVE[d]
                                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                {d === 'all' ? 'All' : (d as Difficulty)}
                            </button>
                        ))}
                    </div>

                    {/* Status filter */}
                    <select
                        aria-label="Filter by status"
                        value={status}
                        onChange={e => onStatusChange(e.target.value as StatusFilter)}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                        <option value="all">All statuses</option>
                        {PROBLEM_STATUS_ORDER.map(s => (
                            <option key={s} value={s}>
                                {PROBLEM_STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>

                    {/* Expand / collapse all */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onExpandAll}
                            title="Expand all"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition-colors hover:text-gray-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            <ChevronsUpDown className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onCollapseAll}
                            title="Collapse all"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition-colors hover:text-gray-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            <ChevronsDownUp className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

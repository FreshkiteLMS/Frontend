"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CatalogCourse } from '@/types/catalog';
import { DEFAULT_FILTERS, SORT_OPTIONS, categoryLabel, filterCourses, type CourseFilterState, type CourseSort } from '@/lib/catalog';
import { CatalogCourseCard, type CourseOpenProps } from './course-card';
import { CourseCardSkeleton, EmptyState, Reveal } from './ui';

const selectClass = 'h-11 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 pr-8 text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

export function CourseFilters({ value, onChange, categories, total, shown }: {
    value: CourseFilterState;
    onChange: (next: CourseFilterState) => void;
    categories: { key: string; count: number }[];
    total: number;
    shown: number;
}) {
    const set = (patch: Partial<CourseFilterState>) => onChange({ ...value, ...patch });
    const active = value.query || value.category !== 'all' || value.difficulty !== 'all';
    return (
        <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
                <label className="relative flex-1">
                    <span className="sr-only">Search courses</span>
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                        type="search"
                        value={value.query}
                        onChange={e => set({ query: e.target.value })}
                        placeholder="Search courses, topics or skills…"
                        className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-10 pr-10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {value.query && (
                        <button type="button" onClick={() => set({ query: '' })} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </label>
                <div className="flex gap-3">
                    <label className="flex-1 md:flex-none">
                        <span className="sr-only">Difficulty</span>
                        <select value={value.difficulty} onChange={e => set({ difficulty: e.target.value })} className={`${selectClass} w-full`}>
                            <option value="all">All levels</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </label>
                    <label className="flex-1 md:flex-none">
                        <span className="sr-only">Sort by</span>
                        <select value={value.sort} onChange={e => set({ sort: e.target.value as CourseSort })} className={`${selectClass} w-full`}>
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            {categories.length > 1 && (
                <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-hide" role="group" aria-label="Filter by category">
                    <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
                        {[{ key: 'all', count: total }, ...categories].map(c => {
                            const on = value.category === c.key;
                            return (
                                <button
                                    key={c.key}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => set({ category: c.key })}
                                    className={`h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap border transition-all ${on
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-sm'
                                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                                >
                                    {c.key === 'all' ? 'All courses' : categoryLabel(c.key)}
                                    <span className={`ml-1.5 text-xs ${on ? 'opacity-70' : 'text-gray-400'}`}>{c.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <p aria-live="polite"><SlidersHorizontal className="inline w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />Showing {shown} of {total} course{total === 1 ? '' : 's'}</p>
                {active && (
                    <button type="button" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: value.sort })} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Search + filters + grid over every published course, rendered in pages
 * ("Show more") so hundreds of courses stay fast. Data comes from the catalog;
 * filtering is local, so typing never hits the network.
 */
export function CourseExplorer({ courses, categories, loading, onOpenCourse, pageSize = 12, initialCategory }: CourseOpenProps & {
    courses: CatalogCourse[];
    categories: { key: string; count: number }[];
    loading?: boolean;
    pageSize?: number;
    initialCategory?: string;
}) {
    const [filters, setFilters] = useState<CourseFilterState>({ ...DEFAULT_FILTERS, category: initialCategory || 'all' });
    const [limit, setLimit] = useState(pageSize);
    const deferredQuery = useDeferredValue(filters.query);
    const results = useMemo(() => filterCourses(courses, { ...filters, query: deferredQuery }), [courses, filters, deferredQuery]);

    useEffect(() => { if (initialCategory) setFilters(f => ({ ...f, category: initialCategory })); }, [initialCategory]);
    // New filter → back to the first page.
    useEffect(() => setLimit(pageSize), [filters.category, filters.difficulty, filters.sort, deferredQuery, pageSize]);

    const visible = results.slice(0, limit);

    return (
        <div>
            <CourseFilters value={filters} onChange={setFilters} categories={categories} total={courses.length} shown={loading ? 0 : results.length} />
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {Array.from({ length: Math.min(pageSize, 8) }, (_, i) => <CourseCardSkeleton key={i} />)}
                </div>
            ) : courses.length === 0 ? (
                <EmptyState title="New courses are on the way" description="Our first courses are being prepared. Create an account to be ready when they launch." />
            ) : results.length === 0 ? (
                <EmptyState
                    title="No courses match your search"
                    description="Try a different keyword or clear the filters."
                    action={<button type="button" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })} className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold">Clear filters</button>}
                />
            ) : (
                <>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {visible.map((c, i) => (
                            <Reveal as="li" key={c.id} delay={Math.min(i % pageSize, 7) * 0.05}>
                                <CatalogCourseCard course={c} onOpenCourse={onOpenCourse} />
                            </Reveal>
                        ))}
                    </ul>
                    {results.length > limit && (
                        <div className="mt-10 text-center">
                            <button
                                type="button"
                                onClick={() => setLimit(l => l + pageSize)}
                                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold text-gray-800 dark:text-gray-100 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                            >
                                Show more courses <span className="text-gray-400 font-semibold">({results.length - limit} more)</span>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

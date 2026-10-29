"use client";

import { Award, BookOpen, Check, ChevronDown, ChevronRight, Layers, Play } from 'lucide-react';
import { GroupDocumentLink } from '@/components/courses/GroupDocumentLink';

export interface BundleCourseItem {
    id: string;
    title: string;
    thumbnail_url?: string;
    templateType?: string;
    progress?: number;
    completedSections?: number;
    totalSections?: number;
    status?: 'completed' | 'in-progress' | 'not-started' | string;
}

export interface BundleItem {
    id: string;
    name: string;
    image_url?: string;
    document_url?: string | null;
    progress?: number;
    status?: string;
    /** Already in the admin-chosen order (the server sorts them). */
    courses?: BundleCourseItem[];
}

/**
 * The course to send the student to next: the first in-progress course in the
 * bundle's order, else the first not started, else null when all are done.
 */
export function nextBundleCourse(courses: BundleCourseItem[] = []): BundleCourseItem | null {
    return courses.find(c => c.status === 'in-progress')
        ?? courses.find(c => c.status !== 'completed')
        ?? null;
}

const unitLabel = (c: BundleCourseItem) => (c.templateType === 'problem-solving' ? 'problems' : 'lessons');

interface BundleCardProps {
    bundle: BundleItem;
    collapsed: boolean;
    onToggle: () => void;
    onOpenCourse: (courseId: string) => void;
}

/**
 * Bundle on the student dashboard: a header with overall progress and a
 * "continue" action, then the bundle's courses as a numbered learning path.
 */
export function BundleCard({ bundle, collapsed, onToggle, onOpenCourse }: BundleCardProps) {
    const courses = bundle.courses || [];
    const completed = courses.filter(c => c.status === 'completed').length;
    const next = nextBundleCourse(courses);
    const progress = bundle.progress || 0;
    const listId = `bundle-${bundle.id}-courses`;

    return (
        <article
            aria-label={`${bundle.name} bundle`}
            className="sm:col-span-2 lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-gray-900">
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                            {bundle.image_url ? (
                                <img src={bundle.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Layers className="w-6 h-6 text-indigo-500" aria-hidden="true" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="inline-block text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded mb-1">
                                Bundle
                            </span>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug truncate">{bundle.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {courses.length} course{courses.length !== 1 ? 's' : ''} · {completed} completed
                            </p>
                        </div>
                    </div>

                    {next ? (
                        <button
                            type="button"
                            onClick={() => onOpenCourse(next.id)}
                            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm max-w-full"
                        >
                            <Play className="w-4 h-4 fill-white shrink-0" aria-hidden="true" />
                            <span className="truncate">
                                {next.status === 'in-progress' ? 'Continue' : 'Start'}: {next.title}
                            </span>
                        </button>
                    ) : courses.length > 0 ? (
                        <span className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold">
                            <Award className="w-4 h-4" aria-hidden="true" /> Bundle completed
                        </span>
                    ) : null}
                </div>

                {/* Overall progress */}
                <div className="mt-5">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400">Bundle progress</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{progress}%</span>
                    </div>
                    <div
                        role="progressbar"
                        aria-label={`${bundle.name} progress`}
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-2 bg-indigo-100 dark:bg-gray-800 rounded-full overflow-hidden"
                    >
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <GroupDocumentLink url={bundle.document_url} />
                    {courses.length > 0 && (
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-expanded={!collapsed}
                            aria-controls={listId}
                            className="ml-auto text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                            {collapsed ? 'Show courses' : 'Hide courses'}
                            <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {/* Learning path */}
            {!collapsed && courses.length > 0 && (
                <ol id={listId} className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    {courses.map((course, index) => {
                        const done = course.status === 'completed';
                        const isNext = next?.id === course.id;
                        const pct = course.progress || 0;
                        return (
                            <li key={course.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpenCourse(course.id)}
                                    className={`w-full flex items-center gap-4 px-5 sm:px-6 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${isNext ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''}`}
                                >
                                    {/* Step marker */}
                                    <span
                                        aria-hidden="true"
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                            done
                                                ? 'bg-green-500 text-white'
                                                : isNext
                                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/60'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {done ? <Check className="w-4 h-4" /> : index + 1}
                                    </span>

                                    <div className="hidden sm:flex w-16 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 items-center justify-center shrink-0">
                                        {course.thumbnail_url ? (
                                            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <BookOpen className="w-5 h-5 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="sr-only">Course {index + 1}: </span>
                                            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{course.title}</span>
                                            {isNext && (
                                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                                                    Up next
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center gap-3">
                                            <div className="flex-1 max-w-xs h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {course.completedSections || 0} / {course.totalSections || 0} {unitLabel(course)} · {pct}%
                                            </span>
                                        </div>
                                    </div>

                                    <span className="hidden md:inline text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                                        {done ? 'Review' : course.status === 'in-progress' ? 'Resume' : 'Start'}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ol>
            )}
        </article>
    );
}

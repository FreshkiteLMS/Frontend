"use client";

import Link from 'next/link';
import { Clock, Layers, ListChecks, Mic } from 'lucide-react';
import type { CatalogCourse } from '@/types/catalog';
import { categoryLabel, difficultyLabel, formatINR, moduleWord, unitLabel } from '@/lib/catalog';
import { CourseCover, Pill, difficultyTone, kindLabel } from './ui';
import { DetailsArrow, PurchaseAction, secondaryButton } from './purchase-action';

export interface CourseOpenProps {
    /** Open details in place (student store modal). Without it, cards link to the public page. */
    onOpenCourse?: (course: CatalogCourse) => void;
}

export const courseDetailsHref = (c: Pick<CatalogCourse, 'id'>) => `/catalog/${encodeURIComponent(c.id)}`;

/** One course in the catalog grid — shared by the homepage and the student store. */
export function CatalogCourseCard({ course, onOpenCourse, inBundle }: CourseOpenProps & { course: CatalogCourse; inBundle?: boolean }) {
    const { counts } = course;
    const open = onOpenCourse ? () => onOpenCourse(course) : undefined;
    const titleId = `course-${course.id}-title`;

    return (
        <article
            aria-labelledby={titleId}
            className="group relative flex flex-col h-full rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/70 dark:hover:border-blue-700/70 hover:shadow-[0_18px_40px_-18px_rgba(37,99,235,0.35)] motion-reduce:transform-none"
        >
            <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
                <div className="h-full transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transform-none">
                    <CourseCover src={course.thumbnailUrl} title={course.title} kind={course.kind} />
                </div>
                <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-gray-950/80 text-gray-800 dark:text-gray-100 backdrop-blur px-2.5 py-1 rounded-full shadow-sm">
                        {categoryLabel(course.category)}
                    </span>
                    {course.kind !== 'structured' && course.kind !== 'legacy' && kindLabel(course.kind).toLowerCase() !== categoryLabel(course.category).toLowerCase() && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-950/70 text-white backdrop-blur px-2.5 py-1 rounded-full">
                            {kindLabel(course.kind)}
                        </span>
                    )}
                </div>
                {inBundle === undefined && course.bundleIds.length > 0 && (
                    <span className="absolute bottom-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-indigo-600/90 text-white px-2.5 py-1 rounded-full backdrop-blur">
                        Also in a bundle
                    </span>
                )}
            </div>

            <div className="flex flex-col flex-1 p-5">
                <h3 id={titleId} className="font-bold text-[15px] leading-snug text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {course.title}
                </h3>
                {course.description && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">{course.description}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {course.difficulty && <Pill tone={difficultyTone(course.difficulty)}>{difficultyLabel(course.difficulty)}</Pill>}
                    {counts.modules > 0 && (
                        <Pill><Layers className="w-3 h-3" aria-hidden="true" />{counts.modules} {moduleWord(course.kind, counts.modules)}</Pill>
                    )}
                    {counts.lessons > 0 && (
                        <Pill><ListChecks className="w-3 h-3" aria-hidden="true" />{unitLabel(counts.unit, counts.lessons)}</Pill>
                    )}
                    {counts.audioQuestions > 0 && (
                        <Pill tone="violet"><Mic className="w-3 h-3" aria-hidden="true" />Speaking practice</Pill>
                    )}
                    {course.estimatedHours ? (
                        <Pill><Clock className="w-3 h-3" aria-hidden="true" />{course.estimatedHours}h</Pill>
                    ) : null}
                </div>

                <div className="mt-auto pt-5">
                    <div className="flex items-end justify-between gap-3 mb-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Price</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                                {course.price > 0 ? formatINR(course.price) : '—'}
                            </p>
                        </div>
                        {open ? (
                            <button type="button" onClick={open} aria-describedby={titleId} className={`group/btn ${secondaryButton} h-9 px-3 text-xs rounded-lg`}>
                                Details <DetailsArrow />
                            </button>
                        ) : (
                            <Link href={courseDetailsHref(course)} aria-describedby={titleId} className={`group/btn ${secondaryButton} h-9 px-3 text-xs rounded-lg`}>
                                Details <DetailsArrow />
                            </Link>
                        )}
                    </div>
                    <PurchaseAction product={{ type: 'course', id: course.id, mongoId: course._id, name: course.title, price: course.price }} />
                </div>
            </div>
        </article>
    );
}

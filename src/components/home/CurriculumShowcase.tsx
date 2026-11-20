"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Layers } from 'lucide-react';
import type { Catalog } from '@/types/catalog';
import { categoryLabel, moduleWord, unitLabel } from '@/lib/catalog';
import { CurriculumAccordion } from '@/components/catalog/curriculum-accordion';
import { DetailsSkeleton, useCourseDetail } from '@/components/catalog/details';
import { courseDetailsHref } from '@/components/catalog/course-card';
import { PurchaseAction } from '@/components/catalog/purchase-action';
import { ErrorState, Reveal, SectionHeading } from '@/components/catalog/ui';

const MAX_TABS = 6;

/**
 * Section 4 — what students actually learn: the real module → lesson outline
 * of a course, fetched only for the course that is selected.
 */
export function CurriculumShowcase({ catalog }: { catalog: Catalog | null }) {
    const reduce = useReducedMotion();
    const courses = useMemo(
        () => (catalog?.courses ?? [])
            .filter(c => c.counts.modules > 0)
            .sort((a, b) => b.counts.modules - a.counts.modules || b.counts.lessons - a.counts.lessons)
            .slice(0, MAX_TABS),
        [catalog],
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = courses.find(c => c.id === selectedId) ?? courses[0];
    const { data, error, retry } = useCourseDetail(selected?.id ?? null);

    if (!courses.length) return null;

    return (
        <section id="curriculum" aria-labelledby="curriculum-title" className="scroll-mt-20 relative py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/40 overflow-hidden">
            <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-200/30 dark:bg-indigo-800/10 blur-3xl translate-x-1/3 -translate-y-1/3" aria-hidden="true" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="curriculum-title"
                    eyebrow="Inside the courses"
                    title={<>See exactly what you’ll learn — <span className="text-blue-600 dark:text-blue-400">module by module</span></>}
                    description="This is the real curriculum of our courses, straight from the platform. Pick a course and open any module to see its lessons."
                />

                <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
                    {/* Course picker */}
                    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-hide">
                        <div role="tablist" aria-label="Courses" className="flex lg:flex-col gap-2 w-max lg:w-auto">
                            {courses.map(c => {
                                const on = c.id === selected.id;
                                return (
                                    <button
                                        key={c.id}
                                        role="tab"
                                        type="button"
                                        aria-selected={on}
                                        aria-controls="curriculum-panel"
                                        onClick={() => setSelectedId(c.id)}
                                        className={`relative text-left rounded-2xl px-4 py-3.5 w-64 lg:w-full border transition-all ${on
                                            ? 'bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-800 shadow-lg shadow-blue-900/5'
                                            : 'bg-transparent border-transparent hover:bg-white/70 dark:hover:bg-gray-900/60'}`}
                                    >
                                        {on && <motion.span layoutId="curriculum-tab" className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-blue-600" transition={{ duration: reduce ? 0 : 0.3 }} aria-hidden="true" />}
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">{categoryLabel(c.category)}</span>
                                        <span className={`block mt-0.5 font-bold leading-snug line-clamp-2 ${on ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{c.title}</span>
                                        <span className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <Layers className="w-3 h-3" aria-hidden="true" />
                                            {c.counts.modules} {moduleWord(c.kind, c.counts.modules)}{c.counts.lessons > 0 ? ` · ${unitLabel(c.counts.unit, c.counts.lessons)}` : ''}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Outline */}
                    <Reveal>
                        <div id="curriculum-panel" role="tabpanel" aria-label={selected.title} className="rounded-3xl bg-white dark:bg-gray-950 border border-gray-200/80 dark:border-gray-800 p-5 sm:p-8 shadow-xl shadow-gray-900/5">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                                <div className="min-w-0">
                                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">{selected.title}</h3>
                                    {selected.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{selected.description}</p>}
                                </div>
                                <div className="flex sm:flex-col gap-2 sm:w-44 shrink-0">
                                    <PurchaseAction product={{ type: 'course', id: selected.id, mongoId: selected._id, name: selected.title, price: selected.price }} />
                                </div>
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selected.id}
                                    initial={reduce ? false : { opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    {error ? (
                                        <ErrorState message="We couldn’t load this curriculum." onRetry={retry} />
                                    ) : data ? (
                                        <CurriculumAccordion modules={data.curriculum.modules} unit={data.curriculum.unit} kind={data.kind} previewModules={4} />
                                    ) : (
                                        <DetailsSkeleton />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                            <Link href={courseDetailsHref(selected)} className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                                View complete course details <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

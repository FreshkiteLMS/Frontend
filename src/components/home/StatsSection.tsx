"use client";

import { BookOpen, Brain, Calculator, GraduationCap, Layers, ListChecks, Mic, Package } from 'lucide-react';
import type { CatalogStats } from '@/types/catalog';
import { AnimatedCounter, Reveal } from '@/components/catalog/ui';

/**
 * The learner count is real but only shown once it is meaningful; below this
 * it reads as a weakness rather than social proof. Change or remove as needed.
 */
export const MIN_PUBLIC_STUDENT_COUNT = 100;

/** Live platform numbers from the catalog API. Zero values are left out — nothing is padded or rounded up. */
export function StatsSection({ stats }: { stats: CatalogStats | null }) {
    if (!stats || stats.courses === 0) return null;
    const items = [
        { icon: BookOpen, value: stats.courses, label: stats.courses === 1 ? 'Published course' : 'Published courses' },
        { icon: Layers, value: stats.modules, label: 'Learning modules' },
        { icon: ListChecks, value: stats.lessons, label: 'Lessons' },
        { icon: Brain, value: stats.problems, label: 'Coding problems' },
        { icon: Calculator, value: stats.aptitudeQuestions, label: 'Aptitude questions' },
        { icon: Mic, value: stats.audioQuestions, label: 'Speaking practice questions' },
        { icon: Package, value: stats.bundles, label: stats.bundles === 1 ? 'Course bundle' : 'Course bundles' },
        ...(stats.students >= MIN_PUBLIC_STUDENT_COUNT ? [{ icon: GraduationCap, value: stats.students, label: 'Registered learners' }] : []),
    ].filter(i => i.value > 0).slice(0, 6);

    return (
        <section aria-label="Platform at a glance" className="relative border-y border-gray-200/70 dark:border-gray-800/80 bg-gray-50/70 dark:bg-gray-900/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
                <dl className={`grid grid-cols-2 sm:grid-cols-3 ${items.length >= 5 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-x-6 gap-y-10`}>
                    {items.map((item, i) => (
                        <Reveal key={item.label} delay={i * 0.06}>
                            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                                <span className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-sm">
                                    <item.icon className="w-5 h-5" aria-hidden="true" />
                                </span>
                                <dt className="order-3 mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{item.label}</dt>
                                <dd className="order-2 text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white tabular-nums">
                                    <AnimatedCounter value={item.value} />
                                </dd>
                            </div>
                        </Reveal>
                    ))}
                </dl>
            </div>
        </section>
    );
}

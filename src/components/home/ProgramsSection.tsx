"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Catalog } from '@/types/catalog';
import { CourseExplorer } from '@/components/catalog/course-explorer';
import { ErrorState, SectionHeading } from '@/components/catalog/ui';

/** Section 3 — every published course, searchable and filterable (live catalog data). */
export function ProgramsSection({ catalog, loading, error, onRetry }: { catalog: Catalog | null; loading: boolean; error: boolean; onRetry: () => void }) {
    return (
        <section id="courses" aria-labelledby="courses-title" className="scroll-mt-20 py-20 sm:py-24 bg-white dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="courses-title"
                    eyebrow="Explore all courses"
                    title={<>Find the course that <span className="text-blue-600 dark:text-blue-400">fits your goal</span></>}
                    description="Every published course, with its real curriculum. Search by topic or skill, filter by category and level, and open any course to see exactly what’s inside."
                    action={
                        <Link href="/catalog" className="group inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-300">
                            View full catalog <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                    }
                />
                {error ? (
                    <ErrorState onRetry={onRetry} />
                ) : (
                    <CourseExplorer courses={catalog?.courses ?? []} categories={catalog?.categories ?? []} loading={loading} pageSize={8} />
                )}
            </div>
        </section>
    );
}

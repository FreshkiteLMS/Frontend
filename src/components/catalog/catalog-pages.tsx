"use client";

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { Catalog, CatalogBundleDetail, CatalogCourseDetail } from '@/types/catalog';
import { useCatalog } from '@/hooks/use-catalog';
import { Navbar } from '@/components/layout/Navbar';
import { HomeFooter } from '@/components/home/HomeFooter';
import { bundleCourses } from '@/components/home/BundleShowcase';
import { CourseExplorer } from './course-explorer';
import { AllAccessCard, CatalogBundleCard } from './bundle-card';
import { BundleDetailsLoader, CourseDetailsLoader } from './details';
import { ErrorState, Reveal, SectionHeading } from './ui';

function PublicShell({ children, categories }: { children: ReactNode; categories?: { key: string; count: number }[] }) {
    return (
        <MotionConfig reducedMotion="user">
            <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white min-h-screen overflow-x-clip">
                <Navbar />
                <main className="pt-24 sm:pt-28 pb-20">{children}</main>
                <HomeFooter categories={categories} />
            </div>
        </MotionConfig>
    );
}

function BackLink({ href = '/#courses', label = 'All courses' }: { href?: string; label?: string }) {
    return (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> {label}
        </Link>
    );
}

/** /catalog — the complete catalog: every course, every bundle, the All-In-One plan. */
export function PublicCatalogPage({ initialCatalog, initialCategory }: { initialCatalog: Catalog | null; initialCategory?: string }) {
    const { catalog, loading, error, retry } = useCatalog(initialCatalog);
    const byId = useMemo(() => new Map((catalog?.courses ?? []).map(c => [c.id, c])), [catalog]);
    return (
        <PublicShell categories={catalog?.categories}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <BackLink href="/" label="Home" />
                <header className="mb-10">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Course catalog</h1>
                    <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                        {catalog ? `${catalog.stats.courses} published course${catalog.stats.courses === 1 ? '' : 's'}${catalog.stats.bundles ? ` and ${catalog.stats.bundles} bundle${catalog.stats.bundles === 1 ? '' : 's'}` : ''}. ` : ''}
                        Open any course to see its complete curriculum.
                    </p>
                </header>
                {error ? <ErrorState onRetry={retry} /> : (
                    <CourseExplorer courses={catalog?.courses ?? []} categories={catalog?.categories ?? []} loading={loading} initialCategory={initialCategory} />
                )}
                {catalog && catalog.bundles.length > 0 && (
                    <section aria-labelledby="catalog-bundles" className="mt-20">
                        <SectionHeading id="catalog-bundles" eyebrow="Bundles" title="Save with a learning path" />
                        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {catalog.bundles.map((b, i) => (
                                <Reveal as="li" key={b.id} delay={(i % 3) * 0.08}><CatalogBundleCard bundle={b} courses={bundleCourses(b, byId)} /></Reveal>
                            ))}
                        </ul>
                    </section>
                )}
                {catalog && catalog.allAccess.price > 0 && catalog.courses.length > 0 && (
                    <div className="mt-10"><AllAccessCard price={catalog.allAccess.price} courseCount={catalog.allAccess.courseCount} /></div>
                )}
            </div>
        </PublicShell>
    );
}

export function PublicCoursePage({ id, initial }: { id: string; initial: CatalogCourseDetail | null }) {
    return (
        <PublicShell>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <BackLink />
                <CourseDetailsLoader id={id} initial={initial} variant="page" />
            </div>
        </PublicShell>
    );
}

export function PublicBundlePage({ id, initial }: { id: string; initial: CatalogBundleDetail | null }) {
    return (
        <PublicShell>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <BackLink href="/#bundles" label="All bundles" />
                <BundleDetailsLoader id={id} initial={initial} variant="page" />
            </div>
        </PublicShell>
    );
}

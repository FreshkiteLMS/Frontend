"use client";

import { useMemo } from 'react';
import type { Catalog, CatalogBundle, CatalogCourse } from '@/types/catalog';
import { AllAccessCard, CatalogBundleCard } from '@/components/catalog/bundle-card';
import { Reveal, SectionHeading } from '@/components/catalog/ui';

/** Resolve a bundle's course UUIDs to catalog courses, keeping the bundle's order. */
export function bundleCourses(bundle: CatalogBundle, byId: Map<string, CatalogCourse>): CatalogCourse[] {
    return bundle.courseIds.map(id => byId.get(id)).filter(Boolean) as CatalogCourse[];
}

/** Section 5 — every published bundle, plus the All-In-One plan. */
export function BundleShowcase({ catalog }: { catalog: Catalog | null }) {
    const byId = useMemo(() => new Map((catalog?.courses ?? []).map(c => [c.id, c])), [catalog]);
    if (!catalog || (!catalog.bundles.length && !(catalog.allAccess.price > 0 && catalog.courses.length))) return null;

    return (
        <section id="bundles" aria-labelledby="bundles-title" className="scroll-mt-20 py-20 sm:py-24 bg-white dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="bundles-title"
                    eyebrow="Course bundles"
                    title={<>Learning paths that <span className="text-indigo-600 dark:text-indigo-400">save you more</span></>}
                    description="Bundles group related courses into one path, in a recommended order. Savings are calculated from each course’s own price."
                />
                {catalog.bundles.length > 0 && (
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {catalog.bundles.map((b, i) => (
                            <Reveal as="li" key={b.id} delay={(i % 3) * 0.08}>
                                <CatalogBundleCard bundle={b} courses={bundleCourses(b, byId)} />
                            </Reveal>
                        ))}
                    </ul>
                )}
                {catalog.allAccess.price > 0 && catalog.courses.length > 0 && (
                    <Reveal className={catalog.bundles.length ? 'mt-8' : ''}>
                        <AllAccessCard price={catalog.allAccess.price} courseCount={catalog.allAccess.courseCount} />
                    </Reveal>
                )}
            </div>
        </section>
    );
}

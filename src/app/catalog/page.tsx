import type { Metadata } from 'next';
import { PublicCatalogPage } from '@/components/catalog/catalog-pages';
import { getCatalogServer } from '@/lib/catalog-server';

export const metadata: Metadata = {
    title: 'Course catalog — Freshkite',
    description: 'Browse every published Freshkite course and bundle, filter by category and level, and see the full curriculum before you enroll.',
    alternates: { canonical: '/catalog' },
    openGraph: { title: 'Course catalog — Freshkite', description: 'Every published course and bundle, with the full curriculum.', url: '/catalog' },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
    const [catalog, params] = await Promise.all([getCatalogServer(), searchParams]);
    const category = typeof params.category === 'string' ? params.category.slice(0, 60) : undefined;
    return <PublicCatalogPage initialCatalog={catalog} initialCategory={category} />;
}

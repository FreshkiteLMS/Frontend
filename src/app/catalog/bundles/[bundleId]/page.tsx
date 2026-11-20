import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublicBundlePage } from '@/components/catalog/catalog-pages';
import { getBundleServer } from '@/lib/catalog-server';

export const revalidate = 60;

const load = cache((id: string) => getBundleServer(id));
type Props = { params: Promise<{ bundleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { bundleId } = await params;
    const { data } = await load(bundleId);
    if (!data) return { title: 'Bundle — Freshkite' };
    const description = (data.description || `${data.courseCount} courses in one learning path.`).slice(0, 160);
    return {
        title: `${data.name} — Course bundle — Freshkite`,
        description,
        alternates: { canonical: `/catalog/bundles/${data.id}` },
        openGraph: { title: data.name, description, url: `/catalog/bundles/${data.id}`, ...(data.imageUrl ? { images: [data.imageUrl] } : {}) },
    };
}

export default async function BundlePage({ params }: Props) {
    const { bundleId } = await params;
    const { data, notFound: missing } = await load(bundleId);
    if (missing) notFound();
    return <PublicBundlePage id={bundleId} initial={data} />;
}

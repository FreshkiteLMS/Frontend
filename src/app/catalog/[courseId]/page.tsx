import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublicCoursePage } from '@/components/catalog/catalog-pages';
import { getCourseServer } from '@/lib/catalog-server';

export const revalidate = 60;

const load = cache((id: string) => getCourseServer(id));
type Props = { params: Promise<{ courseId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { courseId } = await params;
    const { data } = await load(courseId);
    if (!data) return { title: 'Course — Freshkite' };
    const description = (data.description || data.overview || `Learn ${data.title} with Freshkite.`).slice(0, 160);
    return {
        title: `${data.title} — Freshkite`,
        description,
        alternates: { canonical: `/catalog/${encodeURIComponent(data.id)}` },
        openGraph: { title: data.title, description, url: `/catalog/${encodeURIComponent(data.id)}`, ...(data.thumbnailUrl ? { images: [data.thumbnailUrl] } : {}) },
    };
}

export default async function CoursePage({ params }: Props) {
    const { courseId } = await params;
    const { data, notFound: missing } = await load(courseId);
    if (missing) notFound();
    const jsonLd = data && {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: data.title,
        description: data.description || data.title,
        provider: { '@type': 'Organization', name: 'Freshkite' },
        ...(data.learningObjectives.length ? { teaches: data.learningObjectives.slice(0, 10) } : {}),
        ...(data.price > 0 ? { offers: { '@type': 'Offer', price: data.price, priceCurrency: 'INR', category: 'Paid' } } : {}),
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
    };
    return (
        <>
            {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\u003c') }} />}
            <PublicCoursePage id={courseId} initial={data} />
        </>
    );
}

import type { Metadata } from 'next';
import { HomeLanding } from '@/components/home/HomeLanding';
import { getCatalogServer } from '@/lib/catalog-server';
import { categoryLabel } from '@/lib/catalog';

// Rebuilt at most once a minute, matching the catalog API cache.
export const revalidate = 60;

const TITLE = 'Freshkite — Expert-led tech courses with hands-on practice';
const DESCRIPTION =
    'Structured technology courses, guided problem solving and practice assessments. Explore every course and bundle, see the full curriculum, and enroll online.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', title: TITLE, description: DESCRIPTION, url: '/', siteName: 'Freshkite' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default async function Home() {
    const catalog = await getCatalogServer();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // Structured data: the organisation plus the published courses (real catalog data only).
    const jsonLd = [
        { '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: 'Freshkite', url: appUrl || undefined },
        ...(catalog?.courses.length
            ? [{
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                itemListElement: catalog.courses.slice(0, 50).map((c, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    item: {
                        '@type': 'Course',
                        name: c.title,
                        description: c.description || c.title,
                        url: `${appUrl}/catalog/${encodeURIComponent(c.id)}`,
                        provider: { '@type': 'Organization', name: 'Freshkite' },
                        ...(c.category ? { about: categoryLabel(c.category) } : {}),
                        ...(c.price > 0 ? { offers: { '@type': 'Offer', price: c.price, priceCurrency: 'INR', category: 'Paid' } } : {}),
                    },
                })),
            }]
            : []),
    ];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
            <HomeLanding initialCatalog={catalog} />
        </>
    );
}

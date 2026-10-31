import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Link-preview metadata for shared profiles. Only a profile its owner made
 * public resolves here (the API returns 404 otherwise), so nothing private
 * ever reaches a crawler.
 */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
    const { username } = await params;
    try {
        const res = await fetch(`${API_URL}/public/profiles/${encodeURIComponent(username)}`, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        const p = body?.data;
        if (!p || p.restricted) throw new Error('restricted');
        const title = `${p.user.name}${p.user.headline ? ` — ${p.user.headline}` : ''} | Freshkite`;
        const description = (p.user.bio || `${p.user.name}'s learning profile on Freshkite`).slice(0, 200);
        return {
            title,
            description,
            openGraph: { title, description, type: 'profile', images: p.user.avatar_url?.startsWith('http') ? [p.user.avatar_url] : undefined },
            twitter: { card: 'summary', title, description },
        };
    } catch {
        return { title: 'Learner profile | Freshkite', robots: { index: false } };
    }
}

export default function PublicProfileLayout({ children }: { children: ReactNode }) {
    return children;
}

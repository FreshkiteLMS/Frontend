"use client";

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ProfilePage } from '@/components/profile/profile-page';

/** /u/:username — the shareable profile link; works without signing in. */
export default function PublicProfileRoute() {
    const params = useParams<{ username: string }>();
    const raw = params?.username;
    const username = typeof raw === 'string' ? decodeURIComponent(raw) : '';

    return (
        <>
            <Header />
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
                <ProfilePage idOrUsername={username} mode="public" />
            </main>
        </>
    );
}

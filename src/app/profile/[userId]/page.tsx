"use client";

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ProfilePage } from '@/components/profile/profile-page';

/** /profile/:idOrUsername — profiles inside the signed-in app. */
export default function ProfileRoute() {
    const params = useParams<{ userId: string }>();
    const raw = params?.userId;
    const key = typeof raw === 'string' ? decodeURIComponent(raw) : Array.isArray(raw) ? raw[0] : '';

    return (
        <>
            <Header />
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
                <ProfilePage idOrUsername={key} />
            </main>
        </>
    );
}

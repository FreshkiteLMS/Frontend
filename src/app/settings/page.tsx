"use client";

import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { SettingsPage } from '@/components/settings/settings-page';

export default function SettingsRoute() {
    return (
        <>
            <Header />
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
                {/* useSearchParams (section deep links) needs a Suspense boundary. */}
                <Suspense fallback={null}>
                    <SettingsPage />
                </Suspense>
            </main>
        </>
    );
}

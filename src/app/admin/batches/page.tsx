"use client";

import { Suspense } from 'react';
import { BatchesHub } from '@/components/batches/batches-hub';
import { Header } from '@/components/layout/header';

export default function BatchesPage() {
    return (
        <>
            <Header />
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
                <BatchesHub />
            </Suspense>
        </>
    );
}

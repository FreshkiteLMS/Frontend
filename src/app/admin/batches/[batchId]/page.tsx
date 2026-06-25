"use client";

import { use, Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { BatchDetail } from '@/components/batches/batch-detail';

interface PageProps {
    params: Promise<{ batchId: string }>;
}

export default function AdminBatchDetailPage({ params }: PageProps) {
    const { batchId } = use(params);
    return (
        <>
            <Header />
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading…</div>}>
                <BatchDetail batchId={batchId} />
            </Suspense>
        </>
    );
}

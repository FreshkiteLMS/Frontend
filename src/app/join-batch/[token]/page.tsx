"use client";

import { use } from 'react';
import { Header } from '@/components/layout/header';
import { JoinBatch } from '@/components/batches/join-batch';

/** Batch invitation link. Signed-out visitors are sent to login and back (src/proxy.ts). */
export default function JoinBatchPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    return (
        <>
            <Header />
            <JoinBatch token={token} />
        </>
    );
}

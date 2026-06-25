"use client";

import { use } from 'react';
import { TestViewer } from '@/components/tests/test-viewer';
import { Header } from '@/components/layout/header';

interface PageProps {
    params: Promise<{ testId: string }>;
}

export default function ViewTestPage({ params }: PageProps) {
    const { testId } = use(params);
    return (
        <>
            <Header />
            <TestViewer testId={testId} />
        </>
    );
}

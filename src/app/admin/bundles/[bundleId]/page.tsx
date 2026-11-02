"use client";

import { use } from 'react';
import { Header } from '@/components/layout/header';
import { BundleEditor } from '@/components/admin/bundles/bundle-editor';

interface PageProps {
    params: Promise<{ bundleId: string }>;
}

export default function EditBundlePage({ params }: PageProps) {
    const { bundleId } = use(params);
    return (
        <>
            <Header />
            <BundleEditor key={bundleId} bundleId={bundleId} />
        </>
    );
}

"use client";

import { Header } from '@/components/layout/header';
import { BundleList } from '@/components/admin/bundles/bundle-list';

export default function AdminBundlesPage() {
    return (
        <>
            <Header />
            <BundleList />
        </>
    );
}

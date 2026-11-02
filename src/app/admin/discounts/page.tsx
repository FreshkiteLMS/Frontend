"use client";

import { Suspense } from 'react';
import { DiscountManager } from '@/components/admin/discounts/discount-manager';
import { Header } from '@/components/layout/header';

export default function AdminDiscountsPage() {
    return (
        <>
            <Header />
            {/* DiscountManager reads ?create= / ?product= deep links. */}
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading…</div>}>
                <DiscountManager />
            </Suspense>
        </>
    );
}

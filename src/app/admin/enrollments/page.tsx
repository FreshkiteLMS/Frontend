"use client";

import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { EnrollmentManagement } from '@/components/admin/enrollments/enrollment-management';

export default function AdminEnrollmentsPage() {
    return (
        <>
            <Header />
            {/* Reads ?tab= / ?student= deep links. */}
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading…</div>}>
                <EnrollmentManagement />
            </Suspense>
        </>
    );
}

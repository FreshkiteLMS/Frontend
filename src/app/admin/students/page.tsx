"use client";

import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { StudentManagement } from '@/components/admin/students/student-management';

export default function AdminStudentsPage() {
    return (
        <>
            <Header />
            {/* useSearchParams (URL filters) needs a Suspense boundary for prerendering. */}
            <Suspense>
                <StudentManagement />
            </Suspense>
        </>
    );
}

"use client";

import { use, Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Student360 } from '@/components/admin/students/student-360';

interface PageProps {
    params: Promise<{ studentId: string }>;
}

export default function AdminStudentDetailPage({ params }: PageProps) {
    const { studentId } = use(params);
    return (
        <>
            <Header />
            <Suspense>
                <Student360 studentId={studentId} />
            </Suspense>
        </>
    );
}

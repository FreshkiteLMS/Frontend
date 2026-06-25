"use client";

import { use } from 'react';
import { Header } from '@/components/layout/header';
import { StudentDetail } from '@/components/students/student-detail';

interface PageProps {
    params: Promise<{ studentId: string }>;
}

export default function AdminStudentDetailPage({ params }: PageProps) {
    const { studentId } = use(params);
    return (
        <>
            <Header />
            <StudentDetail studentId={studentId} />
        </>
    );
}

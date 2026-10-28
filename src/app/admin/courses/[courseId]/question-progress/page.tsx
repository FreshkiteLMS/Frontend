"use client";

import { use } from 'react';
import { Header } from '@/components/layout/header';
import { ProgressDashboard } from '@/components/courses/structured-questions/ProgressDashboard';

interface PageProps {
    params: Promise<{ courseId: string }>;
    searchParams: Promise<{ student?: string }>;
}

export default function QuestionProgressPage({ params, searchParams }: PageProps) {
    const { courseId } = use(params);
    const { student } = use(searchParams);
    return (
        <>
            <Header />
            <ProgressDashboard courseId={courseId} initialStudentId={typeof student === 'string' ? student : null} />
        </>
    );
}

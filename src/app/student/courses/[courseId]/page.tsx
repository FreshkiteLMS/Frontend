"use client";

import { use } from 'react';
import { CourseViewer } from '@/components/courses/course-viewer';
import { Header } from '@/components/layout/header';

interface PageProps {
    params: Promise<{ courseId: string }>;
}

export default function ViewCoursePage({ params }: PageProps) {
    const { courseId } = use(params);
    return (
        <>
            <Header />
            <CourseViewer courseId={courseId} />
        </>
    );
}

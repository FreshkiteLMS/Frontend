"use client";

import { use } from 'react';
import { CoursePreview } from '@/components/courses/course-preview';
import { Header } from '@/components/layout/header';

interface PageProps {
    params: Promise<{ courseId: string }>;
}

export default function PreviewCoursePage({ params }: PageProps) {
    const { courseId } = use(params);
    return (
        <>
            <Header />
            <CoursePreview courseId={courseId} />
        </>
    );
}

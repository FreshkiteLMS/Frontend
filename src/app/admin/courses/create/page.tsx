"use client";

import { Suspense } from 'react';
import { CourseCreation } from '@/components/courses/course-creation';
import { Header } from '@/components/layout/header';

export default function CreateCoursePage() {
    return (
        <>
            <Header />
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
                <CourseCreation />
            </Suspense>
        </>
    );
}

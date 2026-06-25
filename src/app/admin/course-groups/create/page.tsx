"use client";

import { Suspense } from 'react';
import { CourseGroupCreation } from '@/components/courses/course-group-creation';
import { Header } from '@/components/layout/header';

export default function CreateCourseGroupPage() {
    return (
        <>
            <Header />
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
                <CourseGroupCreation />
            </Suspense>
        </>
    );
}

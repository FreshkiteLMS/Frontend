"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudentDashboard } from '@/components/dashboard/student-dashboard';
import { Header } from '@/components/layout/header';
import { studentService } from '@/services/api/student.api';
import { Loader2 } from 'lucide-react';

function StudentPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkEnrollment = async () => {
            const hasPaymentSuccess = searchParams.get('success') === 'true';

            if (hasPaymentSuccess) {
                // Just paid — let them in even if access hasn't been granted yet.
                setIsAuthorized(true);
                setLoading(false);
                return;
            }

            // Enrolled courses OR any resolved access (bundle / full access) — the
            // same resolver the catalogue uses for "Continue learning", so the
            // catalogue can never send a student here only to be sent back.
            const [stats, access] = await Promise.allSettled([
                studentService.getDashboardStats(),
                studentService.getMyAccess(),
            ]);
            const enrolled = stats.status === 'fulfilled' && stats.value.enrolledCourses > 0;
            const hasAccess = access.status === 'fulfilled' && (access.value.fullAccess || access.value.courses.length > 0);
            if (stats.status === 'rejected') console.error('Failed to check enrollment status:', stats.reason);

            if (enrolled || hasAccess) {
                setIsAuthorized(true);
                setLoading(false);
            } else {
                router.replace('/student/courses');
            }
        };

        checkEnrollment();
    }, [router, searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">Preparing your workspace...</p>
            </div>
        );
    }

    if (!isAuthorized) {
        return null; // Redirecting...
    }

    return (
        <>
            <Header />
            <StudentDashboard />
        </>
    );
}

export default function StudentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">Preparing your workspace...</p>
            </div>
        }>
            <StudentPageContent />
        </Suspense>
    );
}

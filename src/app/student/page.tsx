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

            try {
                // Always fetch the latest stats to ensure the dashboard has data
                const stats = await studentService.getDashboardStats();

                if (hasPaymentSuccess) {
                    // Just paid — let them in even if DB hasn't reflected it yet
                    setIsAuthorized(true);
                } else if (stats.enrolledCourses > 0) {
                    setIsAuthorized(true);
                } else {
                    router.push('/student/courses');
                    return;
                }

            } catch (error) {
                console.error('Failed to check enrollment status:', error);

                if (hasPaymentSuccess) {
                    // If they just paid but stats failed, still let them in to see the success message
                    setIsAuthorized(true);
                } else {
                    router.push('/student/courses');
                    return;
                }
            } finally {
                setLoading(false);
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

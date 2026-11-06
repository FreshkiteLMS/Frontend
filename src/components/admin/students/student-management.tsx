"use client";

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { Breadcrumbs, DataNote, btnPrimary, btnSecondary } from '../insights/ui';
import { StudentDirectory } from './student-directory';

/**
 * Student Management has two views of the same students:
 *  - Students: the directory (one row per student, every course) → Student 360
 *  - Course progress: the existing per-course dashboards (score grids, speaking
 *    analytics, assignment assessment, problem-solving progress)
 */
export function StudentManagementNav({ active }: { active: 'students' | 'courses' }) {
    const tab = (id: 'students' | 'courses', href: string, label: string) => (
        <Link
            href={href}
            aria-current={active === id ? 'page' : undefined}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${active === id ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
            {label}
        </Link>
    );
    return (
        <nav aria-label="Student management views" className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {tab('students', '/admin/students', 'Students')}
            {tab('courses', '/admin/progress', 'Course progress')}
        </nav>
    );
}

export function StudentManagement() {
    const [rebuilding, setRebuilding] = useState(false);
    const rebuild = async () => {
        setRebuilding(true);
        try {
            const r = await adminInsightsService.rebuildSummaries();
            toast.success(r.alreadyRunning ? 'A refresh is already running' : 'Refreshing every student’s figures in the background');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not start the refresh'));
        } finally { setRebuilding(false); }
    };
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Students' }]} />
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Find any student and open their complete learning journey.</p>
                    <div className="mt-3"><StudentManagementNav active="students" /></div>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={rebuild} disabled={rebuilding} className={btnSecondary} title="Recompute every student's directory figures now">
                        <RefreshCw className={`h-4 w-4 ${rebuilding ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh figures
                    </button>
                    <Link href="/admin/students/enroll" className={btnPrimary}><UserPlus className="h-4 w-4" aria-hidden="true" /> Enroll</Link>
                </div>
            </div>
            <StudentDirectory />
            <div className="mt-3">
                <DataNote>
                    Progress uses the same calculation as the student app. Directory figures update automatically after each learning action
                    and are fully recomputed every six hours; a student&apos;s own page is always computed live.
                </DataNote>
            </div>
        </div>
    );
}

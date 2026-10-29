"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpen, Loader2 } from "lucide-react";
import { courseService } from "@/services/api/course.api";
import { apiErrorMessage } from "@/services/api/structured-course.api";
import { ProgressDashboard } from "@/components/courses/structured-questions/ProgressDashboard";
import { STRUCTURED_COURSE_TEMPLATE } from "@/types/structured-questions";
import type { Course } from "@/types/course";

/**
 * Admin entry point for question & assignment progress across courses: pick a
 * Structured Course, then see every student's saved statuses and audio scores.
 * The selected course is kept in the URL (?course=) so views can be shared.
 */
export function ProgressHub() {
    const router = useRouter();
    const params = useSearchParams();
    const selectedId = params.get("course") || "";
    const [courses, setCourses] = useState<(Course & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await courseService.getAllCourses({ template_type: STRUCTURED_COURSE_TEMPLATE });
            setCourses(
                list
                    .filter((c): c is Course & { id: string } => !!c.id)
                    .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
            );
        } catch (err) {
            setError(apiErrorMessage(err, "Failed to load courses."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Default to the first course once the list arrives.
    useEffect(() => {
        if (!loading && !selectedId && courses.length > 0) {
            router.replace(`/admin/progress?course=${encodeURIComponent(courses[0].id)}`);
        }
    }, [loading, selectedId, courses, router]);

    const selected = useMemo(() => courses.find(c => c.id === selectedId), [courses, selectedId]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div>
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Dashboard
                </Link>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-blue-600" aria-hidden="true" /> Student progress
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Audio questions, assignments and self-assessed scores for each course.
                        </p>
                    </div>
                    {courses.length > 0 && (
                        <div className="w-full md:w-96">
                            <label htmlFor="ph-course" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Course</label>
                            <select
                                id="ph-course"
                                value={selectedId}
                                onChange={e => router.replace(`/admin/progress?course=${encodeURIComponent(e.target.value)}`)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.title}{c.status !== "active" ? " (draft)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-500" aria-busy="true">
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading courses…
                </div>
            ) : error ? (
                <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300">
                    {error} <button type="button" onClick={load} className="underline font-medium">Retry</button>
                </div>
            ) : courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-16 text-center">
                    <BookOpen className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    <p className="mt-3 font-medium text-gray-700 dark:text-gray-200">No courses with questions yet</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Progress tracking is available for courses that use the Structured Course template.
                    </p>
                    <Link href="/admin/courses/create" className="mt-4 inline-flex px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                        Create a course
                    </Link>
                </div>
            ) : selected ? (
                <ProgressDashboard key={selected.id} courseId={selected.id} embedded />
            ) : selectedId ? (
                <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    That course was not found or no longer uses the Structured Course template. Pick another course above.
                </p>
            ) : null}
        </div>
    );
}

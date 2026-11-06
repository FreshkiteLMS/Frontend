"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpen, Loader2 } from "lucide-react";
import { courseService } from "@/services/api/course.api";
import { apiErrorMessage } from "@/services/api/structured-course.api";
import { ProgressDashboard } from "@/components/courses/structured-questions/ProgressDashboard";
import { ProblemProgressDashboard } from "@/components/admin/problem-solving/ProblemProgressDashboard";
import { STRUCTURED_COURSE_TEMPLATE } from "@/types/structured-questions";
import type { Course } from "@/types/course";
import { StudentManagementNav } from "@/components/admin/students/student-management";

const PROBLEM_SOLVING_TEMPLATE = "problem-solving";

type HubCourse = Course & { id: string; kind: "structured" | "problem" };

const byTitle = (a: Course, b: Course) => (a.title || "").localeCompare(b.title || "");

/**
 * Admin entry point for student progress across courses. Structured Courses
 * show questions, assignments and audio scores; Problem Solving courses show
 * tracker progress and "Explain your approach" (AI logic) results.
 * The selected course is kept in the URL (?course=) so views can be shared.
 */
export function ProgressHub() {
    const router = useRouter();
    const params = useSearchParams();
    const selectedId = params.get("course") || "";
    const [courses, setCourses] = useState<HubCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [structured, problem] = await Promise.all([
                courseService.getAllCourses({ template_type: STRUCTURED_COURSE_TEMPLATE }),
                courseService.getAllCourses({ template_type: PROBLEM_SOLVING_TEMPLATE }),
            ]);
            const tag = (list: Course[], kind: HubCourse["kind"]): HubCourse[] =>
                list.filter((c): c is Course & { id: string } => !!c.id).sort(byTitle).map(c => ({ ...c, kind }));
            setCourses([...tag(structured, "structured"), ...tag(problem, "problem")]);
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
    const groups = useMemo(() => [
        { label: "Structured courses", items: courses.filter(c => c.kind === "structured") },
        { label: "Problem Solving courses", items: courses.filter(c => c.kind === "problem") },
    ].filter(g => g.items.length > 0), [courses]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div>
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Dashboard
                </Link>
                <div className="mb-4"><StudentManagementNav active="courses" /></div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-blue-600" aria-hidden="true" /> Student progress
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selected?.kind === "problem"
                                ? "Problems solved and AI logic assessment results for each student."
                                : "Audio questions, assignments and self-assessed scores for each course."}
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
                                {groups.map(g => (
                                    <optgroup key={g.label} label={g.label}>
                                        {g.items.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.title}{c.status !== "active" ? " (draft)" : ""}
                                            </option>
                                        ))}
                                    </optgroup>
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
                    <p className="mt-3 font-medium text-gray-700 dark:text-gray-200">No courses to track yet</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Progress tracking is available for Structured Courses and Problem Solving courses.
                    </p>
                    <Link href="/admin/courses/create" className="mt-4 inline-flex px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                        Create a course
                    </Link>
                </div>
            ) : selected ? (
                selected.kind === "problem"
                    ? <ProblemProgressDashboard key={selected.id} courseId={selected.id} />
                    : <ProgressDashboard key={selected.id} courseId={selected.id} embedded />
            ) : selectedId ? (
                <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    That course was not found or no longer supports progress tracking. Pick another course above.
                </p>
            ) : null}
        </div>
    );
}

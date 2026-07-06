'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { courseGroupService } from '@/services/api/courseGroupService';
import { CourseGroup, Course } from '@/types/course';
import { CourseCard } from '@/components/courses/course-card';
import { Loader2, BookOpen, AlertCircle, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function CourseExplore() {
    const [groups, setGroups] = useState<CourseGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuth();
    const router = useRouter();
    const isAdmin = user?.role === 'admin';

    const handleEditGroup = (id: string) => {
        router.push(`/admin/course-groups/create?id=${id}`);
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete the course group "${name}"?`)) {
            try {
                await courseGroupService.deleteGroup(id);
                setGroups(prevGroups => prevGroups.filter(g => g._id !== id));
            } catch (error) {
                console.error('Failed to delete group:', error);
                toast.error('Failed to delete course group. Please try again.');
            }
        }
    };

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const data = await courseGroupService.getGroupedCourses();
                setGroups(data);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch courses:', err);
                setError('Failed to load courses. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Discovering courses for you...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Students only see published (active) courses; admins see everything so they
    // can manage drafts. Groups with no visible courses are hidden for students.
    const isCourseVisible = (ce: CourseGroup['courses'][number]) =>
        typeof ce.courseId === 'object' && ce.courseId !== null &&
        (isAdmin || (ce.courseId as unknown as Course).status === 'active');

    const visibleGroups = groups
        .map(g => ({ ...g, courses: g.courses.filter(isCourseVisible) }))
        .filter(g => isAdmin || g.courses.length > 0);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
                        Explore Our Courses
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Empower your career with top-tier education. Choose from a variety of paths tailored for your success.
                    </p>
                </header>

                {visibleGroups.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No courses available yet</h3>
                        <p className="text-gray-500">We&apos;re working hard to bring you the best learning experience.</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {visibleGroups.map((group) => (
                            <section key={group._id} className="scroll-mt-20">
                                <div className="flex items-center gap-4 mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                                        {group.name}
                                    </h2>
                                    <div className="h-0.5 flex-grow bg-gradient-to-r from-indigo-100 to-transparent"></div>
                                    <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 whitespace-nowrap">
                                        {group.courses.length} courses
                                    </span>
                                    {isAdmin && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditGroup(group._id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Group"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGroup(group._id, group.name)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Group"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {group.description && (
                                    <p className="text-gray-600 mb-8 -mt-6 max-w-3xl">
                                        {group.description}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {group.courses.map((ce) => {
                                        const course = typeof ce.courseId === 'object'
                                            ? ce.courseId as unknown as Course
                                            : null;
                                        if (!course) return null;
                                        return (
                                            <CourseCard
                                                key={(course as any)._id ?? (ce.courseId as string)}
                                                course={course}
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

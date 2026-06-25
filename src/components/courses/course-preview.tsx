"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, Send, CheckCircle, BookOpen, PlayCircle, CheckSquare, Tag, Edit, Trash2, EyeOff, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { courseService } from '@/services/api/course.api';
import { normalizeSection, CourseRenderer } from './CourseRenderer';

interface CoursePreviewProps {
    courseId: string;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

export function CoursePreview({ courseId }: CoursePreviewProps) {
    const router = useRouter();
    const [course, setCourse] = useState<any>(null);
    const [currentSection, setCurrentSection] = useState(0);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isUnpublishing, setIsUnpublishing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [published, setPublished] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const data = await courseService.getCourseWithSections(courseId);
                setCourse(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load course for preview');
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [courseId]);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await courseService.publish(courseId);
            setPublished(true);
            toast.success('Course published successfully');
            setTimeout(() => {
                router.push('/admin');
            }, 1500);
        } catch (err: any) {
            console.error(err);
            const apiError = err?.response?.data?.error;
            if (apiError?.code === 'COURSE_VALIDATION_FAILED' && apiError?.details?.missing) {
                toast.error(`Cannot publish — missing: ${apiError.details.missing.join(', ')}`);
            } else {
                toast.error(apiError?.message || 'Failed to publish course. Please try again.');
            }
        } finally {
            setIsPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        setIsUnpublishing(true);
        try {
            const updated = await courseService.unpublish(courseId);
            setCourse((prev: any) => ({ ...prev, status: updated?.status || 'inactive' }));
            toast.success('Course unpublished — it is now hidden from students');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.error?.message || 'Failed to unpublish course. Please try again.');
        } finally {
            setIsUnpublishing(false);
        }
    };

    const handleEdit = () => {
        router.push(`/admin/courses/create?id=${courseId}`);
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${course.title}"? This permanently removes the course and all its content.`)) {
            return;
        }
        setIsDeleting(true);
        try {
            await courseService.delete(courseId);
            toast.success('Course deleted');
            router.push('/admin');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.error?.message || 'Failed to delete course. Please try again.');
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading preview...</div>;
    if (error || !course) return <div className="p-8 text-center text-red-500 dark:text-red-400">{error || 'Course not found'}</div>;

    if (published) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
                    <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course Published Successfully!</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {course.title} is now available to students
                    </p>
                </div>
            </div>
        );
    }

    const sections = course.sections || [];
    const categoryLabel = (course.category || '').replace(/_/g, ' ');
    const tags: string[] = course.tags || [];
    const isPublished = course.status === 'active';
    const busy = isPublishing || isUnpublishing || isDeleting;

    // Aggregate stats across all sections (using the same normalizer as the renderer)
    const normalized = sections.map((s: any) => normalizeSection(s));
    const totalLessons = sections.length;
    const totalVideos = normalized.reduce((sum: number, s: any) => sum + s.videos.length, 0);
    const totalAssignments = normalized.reduce((sum: number, s: any) => sum + s.assignments.length, 0);

    const activeSection = sections[currentSection];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {isPublished ? 'Manage Course' : 'Course Preview'}
                            </h2>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isPublished
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                {isPublished ? <Globe className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                            {isPublished
                                ? 'This course is live for students. You can edit, unpublish, or delete it.'
                                : 'This is exactly what students will see once published.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleEdit}
                            disabled={busy}
                            className="flex items-center gap-2 px-5 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Edit className="w-5 h-5" />
                            Edit
                        </button>

                        {isPublished ? (
                            <button
                                onClick={handleUnpublish}
                                disabled={busy}
                                className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                {isUnpublishing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Unpublishing...
                                    </>
                                ) : (
                                    <>
                                        <EyeOff className="w-5 h-5" />
                                        Unpublish
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handlePublish}
                                disabled={busy}
                                className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                {isPublishing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Publish Course
                                    </>
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleDelete}
                            disabled={busy}
                            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-5 h-5" />
                                    Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ───────── Metadata hero (admin-entered = source of truth) ───────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3">
                    <div className="md:col-span-1 bg-gray-100 dark:bg-gray-900 min-h-[200px]">
                        {course.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <BookOpen className="w-12 h-12" />
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2 p-6">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {categoryLabel && (
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold capitalize">
                                    {categoryLabel}
                                </span>
                            )}
                            {course.difficulty && (
                                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-bold capitalize">
                                    {course.difficulty}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{course.title}</h1>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">{course.description}</p>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {tags.map((t) => (
                                    <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                                        <Tag className="w-3 h-3" /> {t}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-6 flex-wrap">
                            <div className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(course.price)}</div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                <BookOpen className="w-4 h-4" /> {totalLessons} {totalLessons === 1 ? 'section' : 'sections'}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                <PlayCircle className="w-4 h-4" /> {totalVideos} {totalVideos === 1 ? 'video' : 'videos'}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                <CheckSquare className="w-4 h-4" /> {totalAssignments} {totalAssignments === 1 ? 'assignment' : 'assignments'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ───────── Content (rendered with the SHARED CourseRenderer) ───────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sticky top-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sections</h3>
                        {sections.length === 0 ? (
                            <p className="text-sm text-gray-400">No sections yet.</p>
                        ) : (
                            <nav className="space-y-2">
                                {sections.map((section: any, index: number) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setCurrentSection(index)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors ${currentSection === index
                                            ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <p className="text-sm font-medium">{index + 1}. {section.title}</p>
                                    </button>
                                ))}
                            </nav>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        {activeSection ? (
                            <>
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                    {activeSection.title}
                                </h3>
                                <CourseRenderer section={activeSection} />

                                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <button
                                        onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                                        disabled={currentSection === 0}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Section {currentSection + 1} of {sections.length}
                                    </span>
                                    <button
                                        onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                                        disabled={currentSection === sections.length - 1}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-gray-400 py-12">This course has no content sections yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {isPublished ? (
                <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Globe className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">Course is Live</h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                This course is published and visible to students. Use &ldquo;Edit&rdquo; to change its
                                details or content, &ldquo;Unpublish&rdquo; to take it offline, or &ldquo;Delete&rdquo; to remove it permanently.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">Preview Mode</h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                Review everything above. Click &ldquo;Publish Course&rdquo; when you&apos;re ready to make it available to students.
                                Publishing is blocked until the course has a title, description, price, and at least one section.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

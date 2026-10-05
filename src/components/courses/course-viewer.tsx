"use client";

import { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft,
    ChevronRight,
    ChevronLeft,
    CheckCircle,
    Circle,
    Menu,
    BookOpen,
    LayoutList,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { progressService } from '@/services/api/progress.api';
import { useAuth } from '@/hooks/use-auth';
import { courseService } from '@/services/api/course.api';
import type { Course } from '@/types/course';
import toast from 'react-hot-toast';
import { TableOfContents } from './TableOfContents';
import { ProblemTracker } from './problem-tracker/ProblemTracker';
import { DocumentResourceCard } from './DocumentResourceCard';
import { CourseOverview } from './structured/CourseOverview';
import { LessonBody, buildCourseOutline, lessonHeadings, type CourseOutline } from './course-outline';

// ─── Reading progress bar ─────────────────────────────────────────────────────

function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 h-[3px] z-[200] bg-transparent pointer-events-none">
            <div
                className="h-full bg-blue-500 transition-[width] duration-75 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}

// ─── Course viewer ─────────────────────────────────────────────────────────────

/** Sentinel selection for the course overview page (structured courses). */
const OVERVIEW = '__overview__';

interface CourseViewerProps {
    courseId: string;
}

export function CourseViewer({ courseId }: CourseViewerProps) {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const [courseData, setCourseData] = useState<Course | null>(null);
    const [outline, setOutline] = useState<CourseOutline | null>(null);
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [loading, setLoading] = useState(true);
    // Problem-solving courses are rendered by a dedicated tracker.
    const [isProblemCourse, setIsProblemCourse] = useState(false);
    const [leftOpen, setLeftOpen] = useState(true);

    const lessons = useMemo(() => outline?.lessons ?? [], [outline]);
    const selectedIndex = lessons.findIndex((l) => l.id === selectedId);
    const selectedLesson = selectedIndex >= 0 ? lessons[selectedIndex] : null;
    const headings = useMemo(() => lessonHeadings(selectedLesson), [selectedLesson]);
    const isStructured = outline?.format === 'structured';

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                setLoading(true);
                if (!user) return;

                const data = await courseService.getCourseWithSections(courseId);
                setCourseData(data);

                if (data.template_type === 'problem-solving') {
                    setIsProblemCourse(true);
                    return;
                }

                let progressData: any[] = [];
                try {
                    progressData = await progressService.getStudentProgress(user.id, courseId);
                } catch (error) {
                    console.error('Error fetching progress:', error);
                }

                // Viewing reads the stored structure only — no AI involved here.
                const nextOutline = buildCourseOutline(data);
                const done = new Set<string>(progressData.filter((p: any) => p.completed).map((p: any) => String(p.sectionId)));
                setOutline(nextOutline);
                setCompleted(done);

                const firstIncomplete = nextOutline.lessons.find((l) => !done.has(l.id));
                const startedStructured = nextOutline.format === 'structured' && nextOutline.lessons.some((l) => done.has(l.id));
                setSelectedId(
                    nextOutline.format === 'structured' && !startedStructured
                        ? OVERVIEW
                        : (firstIncomplete || nextOutline.lessons[0])?.id ?? null
                );
            } catch (error) {
                console.error('Error fetching course data:', error);
                toast.error('Failed to load course content. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (courseId && user) fetchCourseData();
    }, [courseId, user]);

    // Scroll to top on lesson change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [selectedId]);

    const selectLesson = (id: string) => {
        setSelectedId(id);
        setLeftOpen(false);
    };

    const handleLessonComplete = async () => {
        if (!user || !selectedLesson || !courseData) return;
        setIsCompleting(true);
        try {
            await progressService.completeSection(selectedLesson.id, user.id, courseData.id || courseData._id, 0);
            setCompleted((prev) => new Set(prev).add(selectedLesson.id));
            toast.success('Lesson marked as complete! 🎉');

            if (selectedIndex < lessons.length - 1) {
                const nextId = lessons[selectedIndex + 1].id;
                setTimeout(() => setSelectedId(nextId), 800);
            }
        } catch (error: any) {
            console.error('Error marking lesson as complete:', error);
            toast.error(error.message || 'Failed to mark lesson as complete.');
        } finally {
            setIsCompleting(false);
        }
    };

    if (authLoading || loading) return <LoadingState />;

    if (isProblemCourse) return <ProblemTracker courseId={courseId} />;

    if (!courseData || !outline || !selectedId) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-gray-500 dark:text-gray-400">No course content available.</p>
                    <button
                        onClick={() => router.push('/student')}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const completedCount = lessons.filter((l) => completed.has(l.id)).length;
    const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
    const hasPrev = selectedIndex > 0;
    const hasNext = selectedIndex >= 0 && selectedIndex < lessons.length - 1;
    const currentModuleIndex = selectedLesson ? outline.modules.findIndex((m) => m.id === selectedLesson.moduleId) : -1;
    const currentModule = currentModuleIndex >= 0 ? outline.modules[currentModuleIndex] : null;
    const courseDescription = courseData.description || outline.structured?.description || '';

    return (
        <div className="flex bg-white dark:bg-gray-950" style={{ minHeight: 'calc(100vh - 4rem)' }}>
            <ReadingProgress />

            {/* ── LEFT SIDEBAR ── */}
            {leftOpen && (
                <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setLeftOpen(false)} />
            )}

            <aside className={`
                ${leftOpen ? 'translate-x-0' : '-translate-x-full'}
                fixed lg:relative lg:translate-x-0 z-40 lg:z-auto
                w-72 flex-shrink-0 transition-transform duration-300 ease-in-out
            `}>
                <div className="sticky top-16 h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">

                    <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => router.push('/student')}
                            className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Dashboard
                        </button>
                        <h2 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
                            {courseData.title}
                        </h2>

                        {user?.role !== 'admin' && (
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Progress</span>
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{progress}%</span>
                                </div>
                                <div
                                    className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
                                    role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress"
                                >
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                                    {completedCount} of {lessons.length} lessons
                                </p>
                            </div>
                        )}
                    </div>

                    <nav className="flex-1 overflow-y-auto py-3" aria-label="Course lessons">
                        {isStructured && (
                            <button
                                onClick={() => selectLesson(OVERVIEW)}
                                className={`w-full text-left px-4 py-2.5 mb-1 flex items-center gap-3 text-[13px] font-medium border-r-2 transition-colors ${
                                    selectedId === OVERVIEW
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                            >
                                <LayoutList className="w-4 h-4" />
                                Course overview
                            </button>
                        )}

                        {outline.modules.map((module, mi) => (
                            <div key={module.id} className="mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-5 py-2">
                                    {module.title ? `Module ${mi + 1} · ${module.title}` : 'Lessons'}
                                </p>
                                {module.lessons.map((lesson) => {
                                    const isActive = selectedId === lesson.id;
                                    const isDone = completed.has(lesson.id);
                                    const number = lessons.indexOf(lesson) + 1;
                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => selectLesson(lesson.id)}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-r-2 ${
                                                isActive
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent'
                                            }`}
                                        >
                                            <div className="flex-shrink-0 mt-0.5">
                                                {isDone ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : isActive ? (
                                                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                    </div>
                                                ) : (
                                                    <Circle className="w-4 h-4 text-gray-200 dark:text-gray-700" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[13px] leading-snug font-medium truncate ${
                                                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {number}. {lesson.title}
                                                </p>
                                                {isDone && !isActive && (
                                                    <span className="text-[10px] text-green-500 dark:text-green-400 font-semibold">Completed</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 min-w-0 overflow-x-hidden bg-white dark:bg-gray-950">

                <div className="lg:hidden flex items-center gap-3 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => setLeftOpen(true)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Open lesson list"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
                        {selectedLesson?.title ?? 'Course overview'}
                    </span>
                </div>

                <div className="flex">
                    {/* Fills all space beside the sidebar. Prose is capped for readable
                        line length inside LessonContent; code, tables and media use the full width. */}
                    <article className="flex-1 w-full px-5 sm:px-8 lg:px-12 xl:px-16 py-10 min-w-0">
                        {selectedId === OVERVIEW || !selectedLesson ? (
                            <div className="max-w-5xl">
                                <CourseOverview
                                    title={courseData.title}
                                    description={courseDescription}
                                    outline={outline}
                                    completed={completed}
                                    onOpenLesson={selectLesson}
                                />
                                <DocumentResourceCard
                                    url={courseData.document_url}
                                    title="Original Course Document"
                                    description="View the source document this course was built from."
                                    actionLabel="Open Document"
                                    className="mt-10"
                                />
                                {lessons.length > 0 && (
                                    <div className="mt-10 flex justify-end">
                                        <button
                                            onClick={() => selectLesson((lessons.find((l) => !completed.has(l.id)) || lessons[0]).id)}
                                            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                                        >
                                            {completedCount > 0 ? 'Continue learning' : 'Start first lesson'}
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <header className="mb-10">
                                    <div className="flex flex-wrap items-center gap-2.5 mb-3">
                                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-500 dark:text-blue-400">
                                            {currentModule?.title ? `Module ${currentModuleIndex + 1} · ` : ''}Lesson {selectedIndex + 1} of {lessons.length}
                                        </span>
                                        {completed.has(selectedLesson.id) && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full border border-green-100 dark:border-green-800/40">
                                                <CheckCircle className="w-3 h-3" />
                                                Completed
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-3xl sm:text-[34px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                                        {selectedLesson.title}
                                    </h1>
                                    <div className="mt-6 h-px bg-gray-100 dark:bg-gray-800" />
                                </header>

                                {/* Structured courses show the source link on the overview only.
                                    Legacy courses have no overview page, so their first lesson is the start. */}
                                {!isStructured && selectedIndex === 0 && (
                                    <DocumentResourceCard
                                        url={courseData.document_url}
                                        title="Original Course Document"
                                        description="View the source document this course was built from."
                                        actionLabel="Open Document"
                                        className="mb-8"
                                    />
                                )}

                                <LessonBody item={selectedLesson} />

                                <footer className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                                        <button
                                            onClick={() => hasPrev && setSelectedId(lessons[selectedIndex - 1].id)}
                                            disabled={!hasPrev}
                                            className="flex items-center gap-2 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Previous Lesson
                                        </button>

                                        <div className="flex gap-3">
                                            {!completed.has(selectedLesson.id) && user?.role !== 'admin' && (
                                                <button
                                                    onClick={handleLessonComplete}
                                                    disabled={isCompleting}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    {isCompleting ? 'Saving…' : 'Mark Complete'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => hasNext && setSelectedId(lessons[selectedIndex + 1].id)}
                                                disabled={!hasNext}
                                                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                                            >
                                                Next Lesson
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </footer>
                            </>
                        )}
                    </article>

                    {/* Sticky TOC — visible only at 2xl+ */}
                    {headings.length >= 2 && (
                        <aside className="hidden 2xl:block w-[220px] flex-shrink-0 py-10 pl-4 pr-2">
                            <div className="sticky top-24">
                                <TableOfContents headings={headings} />
                            </div>
                        </aside>
                    )}
                </div>
            </main>
        </div>
    );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingState() {
    return (
        <div className="flex bg-white dark:bg-gray-950" style={{ minHeight: 'calc(100vh - 4rem)' }}>
            <div className="hidden lg:block w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4" />
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full" />
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-4" />
                    <div className="space-y-3 mt-6">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-1">
                                <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full flex-1"
                                    style={{ width: `${55 + (i % 4) * 12}%` }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 px-10 py-10 animate-pulse w-full">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-28 mb-5" />
                <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-full w-2/3 mb-10" />
                <div className="h-px bg-gray-100 dark:bg-gray-800 mb-10" />
                <div className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full"
                            style={{ width: `${65 + (i % 5) * 8}%` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

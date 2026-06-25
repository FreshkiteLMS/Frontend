"use client";

import { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft,
    ChevronRight,
    ChevronLeft,
    CheckCircle,
    Circle,
    Lock,
    Menu,
    BookOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { progressService } from '@/services/api/progress.api';
import { useAuth } from '@/hooks/use-auth';
import { courseService } from '@/services/api/course.api';
import toast from 'react-hot-toast';
import { CourseRenderer, extractHeadings } from './CourseRenderer';
import { TableOfContents } from './TableOfContents';

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

interface CourseViewerProps {
    courseId: string;
}

export function CourseViewer({ courseId }: CourseViewerProps) {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const [selectedSection, setSelectedSection] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [isCompleting, setIsCompleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [courseData, setCourseData] = useState<any>(null);
    const [actualProgress, setActualProgress] = useState(0);
    const [leftOpen, setLeftOpen] = useState(true);

    // Extract headings from the current section's content for the TOC
    const headings = useMemo(
        () => extractHeadings(selectedSection?.content || ''),
        [selectedSection?.id, selectedSection?.content]
    );

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                setLoading(true);
                if (!user) return;

                const data = await courseService.getCourseWithSections(courseId);
                const normalizedData = {
                    ...data,
                    templateType: (data as any).template_type || (data as any).templateType,
                };
                setCourseData(normalizedData);

                let progressData: any[] = [];
                try {
                    progressData = await progressService.getStudentProgress(user.id, courseId);
                } catch (error) {
                    console.error('Error fetching progress:', error);
                }

                const progressMap = new Map(
                    progressData.map((p: any) => [p.sectionId, p.completed])
                );

                const mappedSections = (data.sections || []).map((section: any) => ({
                    id: section.id,
                    title: section.title,
                    content: section.content || '',
                    videoUrl: section.videoUrl || section.video_url,
                    imageUrl: section.imageUrl || section.image_url,
                    youtube_videos: section.youtube_videos || section.youtubeVideos || [],
                    assignments: section.assignments || [],
                    resources: section.resources || [],
                    orderIndex: section.orderIndex || section.order_index,
                    duration: section.duration,
                    completed: progressMap.get(section.id) || false,
                    locked: false,
                }));

                setSections(mappedSections);

                const completedCount = mappedSections.filter((s: any) => s.completed).length;
                setActualProgress(
                    mappedSections.length > 0
                        ? Math.round((completedCount / mappedSections.length) * 100)
                        : 0
                );

                const firstIncomplete = mappedSections.find((s: any) => !s.completed);
                setSelectedSection(firstIncomplete || mappedSections[0] || null);
            } catch (error) {
                console.error('Error fetching course data:', error);
                toast.error('Failed to load course content. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (courseId && user) fetchCourseData();
    }, [courseId, user]);

    // Scroll to top on section change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [selectedSection?.id]);

    const handleSectionComplete = async () => {
        if (!user || !selectedSection || !courseData) return;
        setIsCompleting(true);
        try {
            await progressService.completeSection(
                selectedSection.id.toString(),
                user.id,
                courseData.id,
                0
            );

            setSections(prev => {
                const updated = prev.map(s =>
                    s.id === selectedSection.id ? { ...s, completed: true } : s
                );
                const done = updated.filter((s: any) => s.completed).length;
                setActualProgress(updated.length > 0 ? Math.round((done / updated.length) * 100) : 0);
                return updated;
            });

            setSelectedSection((prev: any) => ({ ...prev, completed: true }));
            toast.success('Lesson marked as complete! 🎉');

            const currentIndex = sections.findIndex(s => s.id === selectedSection.id);
            if (currentIndex < sections.length - 1) {
                setTimeout(() => setSelectedSection(sections[currentIndex + 1]), 800);
            }
        } catch (error: any) {
            console.error('Error marking section as complete:', error);
            toast.error(error.message || 'Failed to mark section as complete.');
        } finally {
            setIsCompleting(false);
        }
    };

    if (authLoading || loading) return <LoadingState />;

    if (!courseData || !selectedSection) {
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

    const currentIndex = sections.findIndex(s => s.id === selectedSection.id);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < sections.length - 1;
    const completedCount = sections.filter(s => s.completed).length;

    return (
        <div className="flex bg-white dark:bg-gray-950" style={{ minHeight: 'calc(100vh - 4rem)' }}>
            {/* Reading progress bar — fixed at top of viewport */}
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

                    {/* Sidebar header */}
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

                        {/* Progress */}
                        {user?.role !== 'admin' && (
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Progress</span>
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{actualProgress}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${actualProgress}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                                    {completedCount} of {sections.length} lessons
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Lesson list */}
                    <nav className="flex-1 overflow-y-auto py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-5 py-2">
                            Lessons
                        </p>
                        {sections.map((section, index) => {
                            const isActive = selectedSection.id === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => {
                                        if (!section.locked) {
                                            setSelectedSection(section);
                                            setLeftOpen(false);
                                        }
                                    }}
                                    disabled={section.locked}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-r-2 ${
                                        isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                            : section.locked
                                            ? 'opacity-40 cursor-not-allowed border-transparent'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent'
                                    }`}
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        {section.locked ? (
                                            <Lock className="w-4 h-4 text-gray-300" />
                                        ) : section.completed ? (
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
                                            {index + 1}. {section.title}
                                        </p>
                                        {section.completed && !isActive && (
                                            <span className="text-[10px] text-green-500 dark:text-green-400 font-semibold">
                                                Completed
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 min-w-0 overflow-x-hidden bg-white dark:bg-gray-950">

                {/* Mobile top bar */}
                <div className="lg:hidden flex items-center gap-3 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => setLeftOpen(true)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Open lesson list"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
                        {selectedSection.title}
                    </span>
                </div>

                {/*
                    Two-column layout at 2xl+:
                    - Left: article content (max 750px)
                    - Right: sticky table of contents (220px)
                    At smaller viewports the TOC column is hidden.
                */}
                <div className="flex justify-center">

                    {/* Article */}
                    <article className="w-full max-w-[750px] px-5 sm:px-10 py-10 min-w-0">

                        {/* Lesson header */}
                        <header className="mb-10">
                            <div className="flex items-center gap-2.5 mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-500 dark:text-blue-400">
                                    Lesson {currentIndex + 1} of {sections.length}
                                </span>
                                {selectedSection.completed && (
                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full border border-green-100 dark:border-green-800/40">
                                        <CheckCircle className="w-3 h-3" />
                                        Completed
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl sm:text-[34px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                                {selectedSection.title}
                            </h1>
                            <div className="mt-6 h-px bg-gray-100 dark:bg-gray-800" />
                        </header>

                        {/* Section content */}
                        <CourseRenderer section={selectedSection} />

                        {/* Bottom navigation */}
                        <footer className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                                <button
                                    onClick={() => hasPrev && setSelectedSection(sections[currentIndex - 1])}
                                    disabled={!hasPrev}
                                    className="flex items-center gap-2 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous Lesson
                                </button>

                                <div className="flex gap-3">
                                    {!selectedSection.completed && user?.role !== 'admin' && (
                                        <button
                                            onClick={handleSectionComplete}
                                            disabled={isCompleting}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            {isCompleting ? 'Saving…' : 'Mark Complete'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => hasNext && setSelectedSection(sections[currentIndex + 1])}
                                        disabled={!hasNext}
                                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                                    >
                                        Next Lesson
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </article>

                    {/* Sticky TOC — visible only at 2xl+ where the viewport is wide enough */}
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
            {/* Sidebar skeleton */}
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

            {/* Content skeleton */}
            <div className="flex-1 px-10 py-10 animate-pulse max-w-[750px] mx-auto w-full">
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

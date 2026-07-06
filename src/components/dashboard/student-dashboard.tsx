
"use client";

import { useState, useEffect } from 'react';
import {
    BookOpen,
    CheckCircle,
    TrendingUp,
    AlertCircle,
    X,
    PartyPopper,
    ChevronRight,
    Flame,
    Play,
    RotateCcw,
    Award,
    Layers,
    Clock,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { studentService } from '@/services/api/student.api';
import { useAuth } from '@/hooks/use-auth';

export function StudentDashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showSuccessMessage, setShowSuccessMessage] = useState(searchParams.get('success') === 'true');
    const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed' | 'not-started'>('all');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user?.email) {
            setLoading(false);
            return;
        }

        const fetchDashboard = async () => {
            try {
                const stats = await studentService.getDashboardStats();
                let coursesData: any = { courses: [], displayItems: [] };

                if (stats?.id) {
                    try {
                        const responseData = await studentService.getStudentCourses(stats.id);
                        const coursesList = Array.isArray(responseData) ? responseData : responseData.courses;
                        const displayItems = responseData.displayItems || [];
                        if (Array.isArray(coursesList)) {
                            coursesData = { courses: coursesList, displayItems };
                        }
                    } catch (err) {
                        console.error('Failed to fetch courses', err);
                    }
                }

                setDashboardData({ ...stats, ...coursesData });
            } catch (error) {
                console.error('Failed to fetch student dashboard', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [user?.email, authLoading]);

    const toggleGroup = (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(groupId) ? next.delete(groupId) : next.add(groupId);
            return next;
        });
    };

    if (authLoading || loading) {
        return <DashboardSkeleton />;
    }

    if (!user) {
        return (
            <div className="p-8 text-center text-gray-500">Please log in to view your dashboard.</div>
        );
    }

    const displayItems: any[] = dashboardData?.displayItems || [];
    const enrolledCount = dashboardData?.enrolledCourses || 0;
    const completedCount = dashboardData?.completedCourses || 0;
    const avgProgress = dashboardData?.averageProgress || 0;

    // Compute total lessons completed across all individual courses
    const totalLessonsCompleted = displayItems.reduce((sum: number, item: any) => {
        if (item.type === 'group') {
            return sum + (item.courses || []).reduce((s: number, c: any) => s + (c.completedSections || 0), 0);
        }
        return sum + (item.completedSections || 0);
    }, 0);

    // Find best "continue learning" candidate
    const continueCourse = displayItems.find((item: any) => {
        const status = item.status || '';
        if (item.type === 'group') return false; // prefer individual courses
        return status === 'in-progress';
    }) || displayItems.find((item: any) => {
        if (item.type === 'group') return false;
        return item.status === 'not-started';
    }) || displayItems[0];

    // Filter display items
    const filteredItems = displayItems.filter((item: any) => {
        if (filterStatus === 'all') return true;
        return (item.status || '').toLowerCase().replace(/[^a-z]/g, '') === filterStatus.replace('-', '');
    });

    const firstName = user.name?.split(' ')[0] || 'there';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Payment success banner */}
                {showSuccessMessage && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                                <PartyPopper className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">Purchase Successful!</p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-300">Your courses are being added. This may take a moment.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowSuccessMessage(false);
                                window.history.replaceState({}, '', window.location.pathname);
                            }}
                            className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 rounded-lg text-emerald-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── HERO ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                            {/* Greeting */}
                            <div>
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wider">
                                    Welcome back
                                </p>
                                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                                    {firstName} 👋
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 text-[15px]">
                                    {enrolledCount === 0
                                        ? "You're all set — explore your first course."
                                        : avgProgress === 100
                                        ? "You've completed all your courses. Amazing work!"
                                        : `You're ${avgProgress}% through your courses. Keep going!`}
                                </p>
                            </div>

                            {/* Streak badge */}
                            {enrolledCount > 0 && (
                                <div className="flex items-center gap-2 self-start bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl px-4 py-3">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <div>
                                        <p className="text-xs text-orange-500 dark:text-orange-400 font-semibold uppercase tracking-wide">Streak</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{totalLessonsCompleted > 0 ? `${totalLessonsCompleted} lesson${totalLessonsCompleted !== 1 ? 's' : ''}` : '—'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Continue Learning card */}
                        {continueCourse && (
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Thumbnail */}
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                    {continueCourse.thumbnail_url ? (
                                        <img src={continueCourse.thumbnail_url} alt={continueCourse.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <BookOpen className="w-7 h-7 text-blue-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">
                                        {continueCourse.status === 'in-progress' ? 'Continue Learning' : 'Start Learning'}
                                    </p>
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">{continueCourse.title}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex-1 h-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden" style={{ maxWidth: 160 }}>
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all"
                                                style={{ width: `${continueCourse.progress || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                                            {continueCourse.progress || 0}%
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(`/student/courses/${continueCourse.id}`)}
                                    className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    {continueCourse.status === 'in-progress' ? 'Resume' : 'Start'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── STATS ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                        iconBg="bg-blue-50 dark:bg-blue-900/20"
                        label="Enrolled"
                        value={enrolledCount}
                        suffix="courses"
                    />
                    <StatCard
                        icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                        iconBg="bg-green-50 dark:bg-green-900/20"
                        label="Completed"
                        value={completedCount}
                        suffix="courses"
                    />
                    <StatCard
                        icon={<Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                        iconBg="bg-purple-50 dark:bg-purple-900/20"
                        label="Lessons Done"
                        value={totalLessonsCompleted}
                        suffix="lessons"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                        iconBg="bg-orange-50 dark:bg-orange-900/20"
                        label="Avg Progress"
                        value={avgProgress}
                        suffix="%"
                    />
                </div>

                {/* ── COURSE CATALOG BANNER ── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white">
                    <div>
                        <p className="font-bold text-lg">Explore More Courses</p>
                        <p className="text-blue-100 text-sm mt-0.5">Expand your skills with our curated catalogue.</p>
                    </div>
                    <button
                        onClick={() => router.push('/student/courses')}
                        className="shrink-0 bg-white text-blue-700 hover:bg-blue-50 font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors text-sm"
                    >
                        Browse Courses
                    </button>
                </div>

                {/* ── MY COURSES ── */}
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Courses</h2>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'in-progress', label: 'In Progress' },
                                { id: 'completed', label: 'Completed' },
                                { id: 'not-started', label: 'Not Started' },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterStatus(f.id as any)}
                                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        filterStatus === f.id
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {displayItems.length === 0 ? (
                        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <BookOpen className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No courses yet.</p>
                            <button
                                onClick={() => router.push('/student/courses')}
                                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                Browse catalogue →
                            </button>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <AlertCircle className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No {filterStatus.replace('-', ' ')} courses.</p>
                            <button
                                onClick={() => setFilterStatus('all')}
                                className="mt-3 flex items-center gap-1.5 mx-auto text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                View all
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.map((item: any) => {
                                const isGroup = item.type === 'group';
                                const isExpanded = expandedGroups.has(item.id);
                                const isCompleted = item.status === 'completed';
                                const isInProgress = item.status === 'in-progress';

                                if (isGroup) {
                                    return (
                                        <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow col-span-1">
                                            <div className="p-5">
                                                {/* Bundle header */}
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Layers className="w-5 h-5 text-indigo-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                                                Bundle
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
                                                            {item.name}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {/* Progress */}
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{item.progress || 0}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all"
                                                            style={{ width: `${item.progress || 0}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {item.courses?.length || 0} courses
                                                    </span>
                                                    <button
                                                        onClick={(e) => toggleGroup(item.id, e)}
                                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                                    >
                                                        {isExpanded ? 'Hide' : 'View'} courses
                                                        <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                                                    {(item.courses || []).map((sub: any) => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => router.push(`/student/courses/${sub.id}`)}
                                                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{sub.title}</span>
                                                            <span className="text-xs font-semibold text-gray-400">{sub.progress || 0}%</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Individual course card
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => router.push(`/student/courses/${item.id}`)}
                                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 overflow-hidden relative">
                                            {item.thumbnail_url ? (
                                                <img
                                                    src={item.thumbnail_url}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                                </div>
                                            )}
                                            {/* Status badge */}
                                            <div className="absolute top-3 right-3">
                                                {isCompleted ? (
                                                    <span className="flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                                        <Award className="w-3 h-3" />
                                                        Done
                                                    </span>
                                                ) : isInProgress ? (
                                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                                        In Progress
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-700/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                                        Not Started
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card body */}
                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {item.title}
                                            </h3>

                                            {/* Progress */}
                                            <div>
                                                <div className="flex justify-between text-xs mb-1.5 text-gray-500 dark:text-gray-400">
                                                    <span>
                                                        {item.completedSections || 0} / {item.totalSections || 0}{' '}
                                                        {item.templateType === 'problem-solving' ? 'problems' : 'lessons'}
                                                    </span>
                                                    <span className="font-semibold">{item.progress || 0}%</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                                                        style={{ width: `${item.progress || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    iconBg,
    label,
    value,
    suffix,
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: number;
    suffix: string;
}) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                {value}<span className="text-base font-medium text-gray-400 ml-0.5">{suffix === '%' ? '%' : ''}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {label} {suffix !== '%' ? suffix : ''}
            </p>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
                {/* Hero */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
                    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-52 mb-4" />
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-64" />
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
                            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
                            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-24" />
                        </div>
                    ))}
                </div>
                {/* Course grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                            <div className="h-36 bg-gray-100 dark:bg-gray-800" />
                            <div className="p-4 space-y-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

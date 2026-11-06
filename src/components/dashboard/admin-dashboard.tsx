"use client";

import { Suspense, useCallback, useEffect, useState } from 'react';
import {
    Users,
    BookOpen,
    Layers,
    PlusCircle,
    BarChart3,
    ShieldCheck,
    AlertTriangle,
    IndianRupee,
    TicketPercent,
    Mic,
    RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminService } from '@/services/api/admin.api';
import { DashboardStats } from '@/types/common';
import { AdminWorkspace } from './admin-workspace';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

interface MetricCardProps {
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    label: string;
    value: React.ReactNode;
    detail?: React.ReactNode;
    loading: boolean;
    /** Omit for a read-only tile (no destination page). */
    onClick?: () => void;
    highlight?: boolean;
}

/** A clickable KPI tile. Values always come from the API — never placeholders. */
function MetricCard({ icon: Icon, tone, label, value, detail, loading, onClick, highlight }: MetricCardProps) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            {...(onClick ? { type: 'button' as const, onClick } : {})}
            className={`group text-left bg-white dark:bg-gray-900 rounded-2xl p-5 border ${onClick ? 'hover:border-blue-300 dark:hover:border-blue-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500' : ''} ${
                highlight ? 'border-amber-300 dark:border-amber-600' : 'border-gray-200 dark:border-gray-800'
            }`}
        >
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                <span className={`p-2 rounded-lg ${tone}`}><Icon className="w-4 h-4" /></span>
            </div>
            {loading ? (
                <div className="space-y-2" aria-hidden="true">
                    <div className="h-7 w-16 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                </div>
            ) : (
                <>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{value}</p>
                    {detail && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
                </>
            )}
        </Tag>
    );
}

export function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [today] = useState(() => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            setStats(await adminService.getDashboardStats());
            setLoadError(null);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setLoadError('Some dashboard data could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchStats(); }, [fetchStats]);

    const quickActions = [
        { icon: BarChart3, label: 'Student Progress', description: 'Questions, assignments & scores', color: 'bg-sky-600', href: '/admin/progress' },
        { icon: PlusCircle, label: 'New Course', description: 'Create new course', color: 'bg-green-500', href: '/admin/courses/create' },
        { icon: Users, label: 'Students', description: 'View & manage students', color: 'bg-blue-500', href: '/admin/students' },
        { icon: Layers, label: 'Batch Management', description: 'Manage batches', color: 'bg-indigo-500', href: '/admin/batches' },
        { icon: ShieldCheck, label: 'Enrollment Requests', description: 'Review offline approvals', color: 'bg-amber-500', href: '/admin/enrollment-requests' },
        { icon: BookOpen, label: 'Bundles', description: 'Edit bundles, courses & order', color: 'bg-rose-500', href: '/admin/bundles' },
        { icon: TicketPercent, label: 'Discounts', description: 'Coupons for courses, bundles & Master Plan', color: 'bg-violet-500', href: '/admin/discounts' },
        { icon: Mic, label: 'Attempt Requests', description: 'Audio assessment attempt limits', color: 'bg-teal-500', href: '/admin/assessment-attempts' },
    ];
    const toWorkspace = (view: string) => {
        router.replace(`/admin?view=${view}`, { scroll: false });
        document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
            {/* Page Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{today}</p>
                    <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Manage your training programs, students, and track progress</p>
                </div>
                <button
                    type="button"
                    onClick={() => { void fetchStats(); setRefreshKey(k => k + 1); }}
                    disabled={loading}
                    className="self-start sm:self-auto px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {loading ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {loadError && (
                <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                    <span className="inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden="true" /> {loadError}</span>
                    <button type="button" onClick={fetchStats} className="font-semibold underline">Retry</button>
                </div>
            )}

            {/* Key Metrics — all counted server-side from stored records */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <MetricCard
                    icon={Users}
                    tone="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    label="Students"
                    value={stats?.totalStudents ?? 0}
                    detail={stats?.activeStudentsLast7Days !== undefined
                        ? `${stats.activeStudentsLast7Days} active in the last 7 days`
                        : stats?.newStudentsLast30Days !== undefined ? `${stats.newStudentsLast30Days} joined in the last 30 days` : undefined}
                    loading={loading && !stats}
                    onClick={() => router.push('/admin/students')}
                />
                <MetricCard
                    icon={BookOpen}
                    tone="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    label="Courses"
                    value={stats?.totalCourses ?? 0}
                    detail={`${stats?.activeCourses ?? 0} published`}
                    loading={loading && !stats}
                    onClick={() => toWorkspace('courses')}
                />
                <MetricCard
                    icon={Layers}
                    tone="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    label="Batches"
                    value={stats?.totalBatches ?? 0}
                    detail={stats?.newBatchesLast30Days !== undefined ? `${stats.newBatchesLast30Days} created in the last 30 days` : undefined}
                    loading={loading && !stats}
                    onClick={() => router.push('/admin/batches')}
                />
                <MetricCard
                    icon={ShieldCheck}
                    tone="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    label="Pending approvals"
                    value={stats?.pendingApprovals ?? 0}
                    detail={(stats?.pendingApprovals ?? 0) > 0 ? 'Review enrollment requests →' : 'Nothing waiting'}
                    highlight={(stats?.pendingApprovals ?? 0) > 0}
                    loading={loading && !stats}
                    onClick={() => router.push('/admin/enrollment-requests')}
                />
                <MetricCard
                    icon={IndianRupee}
                    tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    label="Revenue, last 30 days"
                    value={inr.format(stats?.revenueLast30DaysInr ?? 0)}
                    detail={`${stats?.paidOrdersLast30Days ?? 0} paid orders`}
                    loading={loading && !stats}
                />
            </div>

            {/* Quick Actions */}
            <div className="mb-10">
                <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            onClick={() => router.push(action.href)}
                            className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-3.5 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-800 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <span className={`${action.color} w-10 h-10 shrink-0 rounded-lg flex items-center justify-center`}>
                                <action.icon className="w-5 h-5 text-white" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-gray-900 dark:text-white text-sm font-medium">{action.label}</span>
                                <span className="block truncate text-gray-500 dark:text-gray-400 text-xs">{action.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Management workspace (Overview / Batches / Students / Courses) */}
            <Suspense>
                <AdminWorkspace key={refreshKey} stats={stats} />
            </Suspense>
        </div>
    );
}

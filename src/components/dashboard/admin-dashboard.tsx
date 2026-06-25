
"use client";

import { useState, useEffect } from 'react';
import {
    Users,
    BookOpen,
    Layers,
    UserPlus,
    Key,
    PlusCircle,
    Upload,
    Send,
    TrendingUp,
    BarChart3,
    ChevronRight,
    Edit,
    Trash2,
    Search,
    ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { adminService } from '@/services/api/admin.api';
import { batchService } from '@/services/api/batch.api';
import { courseService } from '@/services/api/course.api';
import { studentService } from '@/services/api/student.api';
import { courseGroupService } from '@/services/api/courseGroupService';
import { DashboardStats } from '@/types/common';
import { Batch } from '@/types/batch';
import { Course, CourseGroup } from '@/types/course';
import { Student } from '@/types/student';

// Removed props interface as we handle navigation internally now
export function AdminDashboard() {
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<'overview' | 'batches' | 'students' | 'courses'>('overview');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('q'); // 'q' is general search

    // Pagination states
    const [studentsPage, setStudentsPage] = useState(1);
    const [studentsMeta, setStudentsMeta] = useState<any>(null);
    const [batchesPage, setBatchesPage] = useState(1);
    const [batchesMeta, setBatchesMeta] = useState<any>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesPage, setCoursesPage] = useState(1);
    const [coursesMeta, setCoursesMeta] = useState<any>(null);
    const itemsPerPage = 10;

    const fetchData = async () => {
        try {
            setLoading(true);
            const commonFilters = searchQuery ? { [searchType]: searchQuery } : {};
            
            const [statsData, batchesResult, studentsResult, coursesResult] = await Promise.all([
                adminService.getDashboardStats(),
                batchService.getAll(batchesPage, itemsPerPage, searchQuery, searchType),
                studentService.getAll(studentsPage, itemsPerPage, searchQuery, searchType),
                courseService.getAll({ page: coursesPage, limit: itemsPerPage, ...commonFilters })
            ]);
            setStats(statsData);
            setBatches(batchesResult.data);
            setBatchesMeta(batchesResult.meta);
            setStudents(studentsResult.data);
            setStudentsMeta(studentsResult.meta);
            setCourses(coursesResult.data);
            setCoursesMeta(coursesResult.meta);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDataWithEmptyFilters = async () => {
        try {
            setLoading(true);
            const [statsData, batchesResult, studentsResult, coursesResult] = await Promise.all([
                adminService.getDashboardStats(),
                batchService.getAll(1, itemsPerPage, '', 'q'),
                studentService.getAll(1, itemsPerPage, '', 'q'),
                courseService.getAll({ page: 1, limit: itemsPerPage })
            ]);
            setStats(statsData);
            setBatches(batchesResult.data);
            setBatchesMeta(batchesResult.meta);
            setStudents(studentsResult.data);
            setStudentsMeta(studentsResult.meta);
            setCourses(coursesResult.data);
            setCoursesMeta(coursesResult.meta);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (page: number) => {
        try {
            setLoading(true);
            const result = await studentService.getAll(page, itemsPerPage, searchQuery, searchType);
            setStudents(result.data);
            setStudentsMeta(result.meta);
            setStudentsPage(page);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async (page: number) => {
        try {
            setLoading(true);
            const result = await batchService.getAll(page, itemsPerPage, searchQuery, searchType);
            setBatches(result.data);
            setBatchesMeta(result.meta);
            setBatchesPage(page);
        } catch (error) {
            console.error('Failed to fetch batches:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async (page: number) => {
        try {
            setLoading(true);
            const commonFilters = searchQuery ? { [searchType]: searchQuery } : {};
            const result = await courseService.getAll({ page, limit: itemsPerPage, ...commonFilters });
            setCourses(result.data);
            setCoursesMeta(result.meta);
            setCoursesPage(page);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setStudentsPage(1);
        setBatchesPage(1);
        setCoursesPage(1);
        fetchData();
    };

    const searchOptions = {
        students: [
            { value: 'q', label: 'All Fields' },
            { value: 'first_name', label: 'First Name' },
            { value: 'last_name', label: 'Last Name' },
            { value: 'email', label: 'Email' }
        ],
        batches: [
            { value: 'q', label: 'All Fields' },
            { value: 'name', label: 'Batch Name' },
            { value: 'batch_number', label: 'Batch Number' }
        ],
        courses: [
            { value: 'q', label: 'All Fields' },
            { value: 'title', label: 'Title' },
            { value: 'category', label: 'Category' },
            { value: 'difficulty', label: 'Difficulty' }
        ]
    };

    useEffect(() => {
        fetchData();
    }, []);

    const Pagination = ({ meta, onPageChange }: { meta: any, onPageChange: (page: number) => void }) => {
        if (!meta || meta.totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-medium">{(meta.page - 1) * meta.limit + 1}</span> to <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="font-medium">{meta.total}</span> results
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(meta.page - 1)}
                        disabled={meta.page === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => onPageChange(meta.page + 1)}
                        disabled={meta.page === meta.totalPages}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    const handleNavigate = (path: string) => {
        router.push(path);
    };

    const handleViewCourse = (courseId: string) => {
        // Navigate to course preview or viewer
        router.push(`/admin/courses/${courseId}/preview`);
    };

    const handleDeleteCourse = async (id: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete the course "${title}"?`)) {
            try {
                await courseService.delete(id);
                toast.success('Course deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Failed to delete course:', error);
                toast.error('Failed to delete course');
            }
        }
    };

    const handleDeleteBatch = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete the batch "${name}"?`)) {
            try {
                await batchService.delete(id);
                toast.success('Batch deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Failed to delete batch:', error);
                toast.error('Failed to delete batch');
            }
        }
    };

    const handleEditCourse = (id: string) => {
        router.push(`/admin/courses/create?id=${id}`);
    };

    const handleEditBatch = (id: string) => {
        router.push(`/admin/batches?edit=${id}`);
    };

    const handleEditGroup = (id: string) => {
        router.push(`/admin/course-groups/create?id=${id}`);
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete the course group "${name}"?`)) {
            try {
                await courseGroupService.deleteGroup(id);
                toast.success('Course group deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Failed to delete group:', error);
                toast.error('Failed to delete course group');
            }
        }
    };

    const quickActions = [
        {
            icon: PlusCircle,
            label: 'New Course',
            description: 'Create new course',
            color: 'bg-green-500',
            action: () => handleNavigate('/admin/courses/create')
        },
        {
            icon: Users,
            label: 'Students',
            description: 'View & manage students',
            color: 'bg-blue-500',
            action: () => handleNavigate('/admin/students')
        },
        {
            icon: Layers,
            label: 'Batch Management',
            description: 'Manage batches',
            color: 'bg-indigo-500',
            action: () => handleNavigate('/admin/batches')
        },
        {
            icon: ShieldCheck,
            label: 'Enrollment Requests',
            description: 'Review offline approvals',
            color: 'bg-amber-500',
            action: () => handleNavigate('/admin/enrollment-requests')
        },
        {
            icon: BookOpen,
            label: 'New Group',
            description: 'Bundle courses',
            color: 'bg-rose-500',
            action: () => handleNavigate('/admin/course-groups/create')
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
            {/* Page Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage your training programs, students, and track progress</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setSearchQuery('');
                        setSearchType('q');
                        setStudentsPage(1);
                        setBatchesPage(1);
                        setCoursesPage(1);
                        // fetchData depends on state, but state updates are asynchronous.
                        // However, we can just reset and fetch data without filters by changing how fetchData works or by passing params.
                        // Since we just changed the state, fetchData will use old state.
                        // Let's refactor fetchData to accept optional overrides or just directly call api.
                        // Actually, useEffect will not trigger. It's better to fetch data with empty filters immediately.
                        fetchDataWithEmptyFilters();
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTab('batches')}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Total Batches</p>
                    <div className="flex items-baseline gap-2">
                        {loading ? (
                            <span className="text-gray-400 text-sm">Loading...</span>
                        ) : (
                            <>
                                <span className="text-gray-900 dark:text-white text-2xl font-semibold">{stats?.totalBatches || 0}</span>
                                <span className="text-green-600 text-sm">+2 this month</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTab('students')}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Total Students</p>
                    <div className="flex items-baseline gap-2">
                        {loading ? (
                            <span className="text-gray-400 text-sm">Loading...</span>
                        ) : (
                            <>
                                <span className="text-gray-900 dark:text-white text-2xl font-semibold">{stats?.totalStudents || 0}</span>
                                <span className="text-green-600 text-sm">+12 this month</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTab('courses')}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Total Courses</p>
                    <div className="flex items-baseline gap-2">
                        {loading ? (
                            <span className="text-gray-400 text-sm">Loading...</span>
                        ) : (
                            <>
                                <span className="text-gray-900 dark:text-white text-2xl font-semibold">{stats?.totalCourses || 0}</span>
                                <span className="text-blue-600 dark:text-blue-400 text-sm">{stats?.activeCourses || 0} active</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={action.action}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all hover:-translate-y-0.5 text-left"
                        >
                            <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                                <action.icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-gray-900 dark:text-white text-sm font-medium mb-1">{action.label}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{action.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-6 gap-4">
                <div className="flex gap-6 overflow-x-auto">
                    {(['overview', 'batches', 'students', 'courses'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setSelectedTab(tab)}
                            className={`pb-3 border-b-2 transition-colors capitalize whitespace-nowrap ${selectedTab === tab
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                {selectedTab !== 'overview' && (
                    <form onSubmit={handleSearch} className="relative pb-3 w-full sm:w-auto self-end flex gap-2">
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none"
                        >
                            {searchOptions[selectedTab as 'students' | 'batches' | 'courses']?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="relative flex-1 sm:w-64">
                            <input
                                type="text"
                                placeholder={`Search ${selectedTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none"
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <button type="submit" className="hidden">Search</button>
                        </div>
                    </form>
                )}
            </div>

            {/* Tab Content */}
            {selectedTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Batches */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-900 dark:text-white font-medium">Recent Batches</h3>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('batches')}
                                className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-700"
                            >
                                View All
                            </button>
                        </div>
                        <div className="space-y-4">
                            {batches.length === 0 && !loading ? (
                                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No batches found</p>
                            ) : (
                                batches.slice(0, 5).map((batch) => (
                                    <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="text-gray-900 dark:text-white text-sm font-medium">{batch.name}</p>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{batch.students} students • {batch.courses} courses</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-900 dark:text-gray-200">{batch.progress}%</p>
                                            <div className="flex items-center gap-1">
                                                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${batch.progress}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Students */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-900 dark:text-white font-medium">Recent Students</h3>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('students')}
                                className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-700"
                            >
                                View All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {students.length === 0 && !loading ? (
                                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No students found</p>
                            ) : (
                                students.map((student) => (
                                    <div key={student.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{student.name}</p>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{student.email}</p>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-white dark:bg-gray-600 rounded border border-gray-100 dark:border-gray-500">{student.batch}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedTab === 'batches' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-gray-900 dark:text-white font-medium">Batch Management</h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSearchType('q');
                                        setBatchesPage(1);
                                        fetchDataWithEmptyFilters();
                                    }}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    disabled={loading}
                                >
                                    {loading ? 'Refreshing...' : 'Refresh'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNavigate('/admin/batches')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create Batch
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {batches.length === 0 && !loading ? (
                            <div className="p-6 text-center text-gray-500 dark:text-gray-400">No batches found</div>
                        ) : (
                            batches.map((batch) => (
                                <div key={batch.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="text-gray-900 dark:text-white font-medium mb-1">{batch.name}</h4>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">{batch.id}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditBatch(batch.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit Batch"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBatch(batch.id, batch.name)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Batch"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleNavigate(`/admin/batches/${batch.id}`)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mb-3">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Students</p>
                                            <p className="text-gray-900 dark:text-white">{batch.students}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Courses</p>
                                            <p className="text-gray-900 dark:text-white">{batch.courses}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Progress</p>
                                            <p className="text-gray-900 dark:text-white">{batch.progress}%</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${batch.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <Pagination meta={batchesMeta} onPageChange={fetchBatches} />
                </div>
            )}



            {selectedTab === 'students' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-gray-900 dark:text-white font-medium">Student Management</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student ID</th>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</th>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enrolled Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {students.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No students found</td>
                                    </tr>
                                ) : (
                                    students.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{student.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{student.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.email}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs border border-blue-200 dark:border-blue-800">
                                                    {student.batch}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(student.enrolled).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={studentsMeta} onPageChange={fetchStudents} />
                </div>
            )}

            {selectedTab === 'courses' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-gray-900 dark:text-white font-medium">Course Management</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course Name</th>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {courses.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No courses found</td>
                                    </tr>
                                ) : (
                                    courses.map((course) => (
                                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{course.title}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{course.category?.replace('_', ' ') || 'Other'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded text-xs border ${
                                                    course.status === 'active' 
                                                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                        : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                }`}>
                                                    {course.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">₹{course.price}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleNavigate(`/admin/courses/${course.id}/preview`)}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="View Course"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={coursesMeta} onPageChange={fetchCourses} />
                </div>
            )}

        </div>
    );
}

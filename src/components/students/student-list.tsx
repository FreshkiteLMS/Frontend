"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Search, Users, ChevronRight, ChevronUp, ChevronDown,
    UserPlus, Mail, Phone, BookOpen, Layers,
} from 'lucide-react';
import { studentService } from '@/services/api/student.api';
import { AdminStudentRow } from '@/types/student';

type SortKey = 'name' | 'overallProgress' | 'purchasedCourses' | 'lastActive' | 'joinDate';

const SEARCH_FIELDS = [
    { value: 'q', label: 'All Fields' },
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'email', label: 'Email' },
];

export function StudentList() {
    const router = useRouter();
    const [rows, setRows] = useState<AdminStudentRow[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchType, setSearchType] = useState('q');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('joinDate');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const fetchPage = useCallback(async (p: number, term: string, type: string) => {
        try {
            setLoading(true);
            const { rows, meta } = await studentService.listAdmin(p, 10, term, type);
            setRows(rows);
            setMeta(meta);
        } catch (err) {
            console.error('Failed to load students', err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPage(page, appliedSearch, searchType); }, [page, appliedSearch, searchType, fetchPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setAppliedSearch(search.trim());
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
    };

    // Client-side sort of the current page.
    const sorted = [...rows].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        switch (sortKey) {
            case 'name': return a.name.localeCompare(b.name) * dir;
            case 'overallProgress': return (a.overallProgress - b.overallProgress) * dir;
            case 'purchasedCourses': return (a.purchasedCourses - b.purchasedCourses) * dir;
            case 'lastActive':
                return ((a.lastActive ? +new Date(a.lastActive) : 0) - (b.lastActive ? +new Date(b.lastActive) : 0)) * dir;
            case 'joinDate':
                return ((a.joinDate ? +new Date(a.joinDate) : 0) - (b.joinDate ? +new Date(b.joinDate) : 0)) * dir;
            default: return 0;
        }
    });

    const SortHead = ({ label, k, className = '' }: { label: string; k: SortKey; className?: string }) => (
        <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}>
            <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                {label}
                {sortKey === k ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
            </button>
        </th>
    );

    const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString() : '—';
    const fmtRelative = (d?: string | null) => {
        if (!d) return 'Never';
        const diff = Date.now() - new Date(d).getTime();
        const days = Math.floor(diff / 86400000);
        if (days <= 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 30) return `${days}d ago`;
        return new Date(d).toLocaleDateString();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" /> Back to Dashboard
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        {meta ? `${meta.total} total` : 'Manage and monitor every student'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {SEARCH_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <div className="relative">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search students..."
                                className="w-56 pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </form>
                    <button
                        onClick={() => router.push('/admin/students/enroll')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                    >
                        <UserPlus className="w-4 h-4" /> Enroll
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <SortHead label="Name" k="name" />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                <SortHead label="Courses" k="purchasedCourses" />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batches</th>
                                <SortHead label="Progress" k="overallProgress" />
                                <SortHead label="Last Active" k="lastActive" />
                                <SortHead label="Joined" k="joinDate" />
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-4 py-4">
                                            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center">
                                        <Users className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                        <p className="text-gray-500 dark:text-gray-400">No students found.</p>
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((s) => (
                                    <tr
                                        key={s.id}
                                        onClick={() => router.push(`/admin/students/${s.id}`)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">{s.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" /> {s.email}
                                            </div>
                                            {s.phone && (
                                                <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                    <Phone className="w-3 h-3" /> {s.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                <BookOpen className="w-3.5 h-3.5 text-gray-400" /> {s.purchasedCourses}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {s.batches.length === 0 ? (
                                                <span className="text-xs text-gray-400">—</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                    {s.batches.slice(0, 2).map((b, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs">{b}</span>
                                                    ))}
                                                    {s.batches.length > 2 && (
                                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded text-xs">+{s.batches.length - 2}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 w-40">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden min-w-[60px]">
                                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${s.overallProgress}%` }} />
                                                </div>
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-9 text-right">{s.overallProgress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtRelative(s.lastActive)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtDate(s.joinDate)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <ChevronRight className="w-4 h-4 text-gray-300 inline" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Page {meta.page} of {meta.totalPages} · {meta.total} students
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={meta.page === 1}
                                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >Previous</button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={meta.page >= meta.totalPages}
                                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    BarChart3, BookOpen, ChevronLeft, ChevronRight, Edit, Eye, FileText, Layers, MessageSquare, Plus, Search, TicketPercent, Trash2, UserPlus, Users, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import { batchService } from '@/services/api/batch.api';
import { courseService } from '@/services/api/course.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { BatchListRow, CourseListRow } from '@/types/admin-insights';
import type { DashboardStats } from '@/types/common';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StudentDirectory } from '@/components/admin/students/student-directory';
import { useDebouncedValue } from '@/components/courses/structured-questions/useDebouncedValue';
import {
    Avatar, Empty, ErrorState, Pill, ProgressBar, SkeletonBlock, btnPrimary, btnSecondary, fmtDate, fmtRelative, inputCls, useAsync,
} from '@/components/admin/insights/ui';

type View = 'overview' | 'batches' | 'students' | 'courses';
const VIEWS: View[] = ['overview', 'batches', 'students', 'courses'];

const TEMPLATE_LABEL: Record<string, string> = {
    'structured-course': 'Structured',
    'problem-solving': 'Problem solving',
    aptitude: 'Aptitude',
    'text-video': 'Text & video',
};

/**
 * The management workspace on /admin. Each tab is a real working view backed
 * by server-side filtering and paging; detail always opens the existing pages
 * (Student 360, batch detail, course preview / editor) — nothing is duplicated.
 */
export function AdminWorkspace({ stats }: { stats: DashboardStats | null }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const view: View = VIEWS.includes(sp.get('view') as View) ? (sp.get('view') as View) : 'overview';
    const setView = (v: View) => {
        // Each tab owns its own URL filters; switching starts clean.
        router.replace(v === 'overview' ? pathname : `${pathname}?view=${v}`, { scroll: false });
    };

    const tabs: { id: View; label: string; count?: number; icon: typeof Users }[] = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'batches', label: 'Batches', count: stats?.totalBatches, icon: Layers },
        { id: 'students', label: 'Students', count: stats?.totalStudents, icon: Users },
        { id: 'courses', label: 'Courses', count: stats?.totalCourses, icon: BookOpen },
    ];
    const action = {
        overview: null,
        batches: <Link href="/admin/batches/new" className={btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> Create batch</Link>,
        students: <Link href="/admin/students/enroll" className={btnPrimary}><UserPlus className="h-4 w-4" aria-hidden="true" /> Enroll student</Link>,
        courses: <Link href="/admin/courses/create" className={btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> New course</Link>,
    }[view];

    return (
        <section id="workspace" aria-labelledby="workspace-title" className="scroll-mt-20">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h3 id="workspace-title" className="sr-only">Management</h3>
                    <div role="tablist" aria-label="Management" className="inline-flex max-w-full overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                        {tabs.map(t => (
                            <button key={t.id} type="button" role="tab" aria-selected={view === t.id} onClick={() => setView(t.id)}
                                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                                    view === t.id ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                }`}>
                                <t.icon className="h-4 w-4" aria-hidden="true" />
                                {t.label}
                                {t.count !== undefined && <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${view === t.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-200/70 dark:bg-gray-700'}`}>{t.count}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                {action}
            </div>
            {view === 'overview' && <OverviewPanel stats={stats} onView={setView} />}
            {view === 'batches' && <BatchesPanel />}
            {view === 'students' && <StudentDirectory />}
            {view === 'courses' && <CoursesPanel />}
        </section>
    );
}

/* ───────────── Overview ───────────── */

function OverviewPanel({ stats, onView }: { stats: DashboardStats | null; onView: (v: View) => void }) {
    const batches = useAsync(() => adminInsightsService.batchList({ page: 1, limit: 4, sort: 'created', dir: 'desc' }), 'ov-batches');
    const [studentMode, setStudentMode] = useState<'last_active' | 'joined'>('last_active');
    const students = useAsync(() => adminInsightsService.directory({ limit: 6, sort: studentMode, dir: 'desc' }), `ov-students:${studentMode}`);
    const courses = useAsync(() => adminInsightsService.courseList({ page: 1, limit: 4, sort: 'updated', dir: 'desc' }), 'ov-courses');

    const facts = [
        { label: 'Active students, 7 days', value: stats?.activeStudentsLast7Days },
        { label: 'Active students, 30 days', value: stats?.activeStudentsLast30Days },
        { label: 'New students, 30 days', value: stats?.newStudentsLast30Days },
        { label: 'New batches, 30 days', value: stats?.newBatchesLast30Days },
        { label: 'Attempt requests waiting', value: stats?.pendingAttemptRequests, href: '/admin/assessment-attempts' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-5 sm:divide-x">
                {facts.map(f => {
                    const body = (
                        <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{f.label}</p>
                            <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{f.value ?? '—'}</p>
                        </>
                    );
                    return f.href
                        ? <Link key={f.label} href={f.href} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">{body}</Link>
                        : <div key={f.label} className="px-4 py-3">{body}</div>;
                })}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                <Section title={studentMode === 'last_active' ? 'Recently active students' : 'Recently joined students'} className="lg:col-span-3"
                    actions={
                        <div className="flex items-center gap-2">
                            <select aria-label="Which students" className={`${inputCls} py-1 text-xs`} value={studentMode} onChange={e => setStudentMode(e.target.value as 'last_active' | 'joined')}>
                                <option value="last_active">Recently active</option>
                                <option value="joined">Recently joined</option>
                            </select>
                            <button type="button" onClick={() => onView('students')} className="text-sm text-blue-600 hover:underline">All students</button>
                        </div>
                    }>
                    {students.error ? <ErrorState error={students.error} onRetry={students.reload} /> : !students.data ? <SkeletonBlock rows={4} /> : students.data.rows.length === 0 ? <Empty title="No students yet" /> : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {students.data.rows.map(s => (
                                <li key={s.userId}>
                                    <Link href={`/admin/students/${s.userId}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-lg">
                                        <Avatar name={s.name} url={s.avatarUrl} size={34} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                                            <span className="block truncate text-xs text-gray-500">{s.email}{s.batches[0] ? ` · ${s.batches.map(b => b.name).join(', ')}` : ''}</span>
                                        </span>
                                        <span className="hidden w-32 sm:block"><ProgressBar value={s.overallProgress} label={`${s.name} progress`} /></span>
                                        <span className="w-24 text-right text-xs text-gray-500">
                                            {studentMode === 'joined' ? `Joined ${fmtDate(s.joinedAt)}` : fmtRelative(s.lastActivityAt)}
                                            <span className="block">{s.enrolledCourses} course{s.enrolledCourses === 1 ? '' : 's'}</span>
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-gray-300" aria-hidden="true" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="Recent batches" className="lg:col-span-2" actions={<button type="button" onClick={() => onView('batches')} className="text-sm text-blue-600 hover:underline">All batches</button>}>
                    {batches.error ? <ErrorState error={batches.error} onRetry={batches.reload} /> : !batches.data ? <SkeletonBlock rows={3} /> : batches.data.data.length === 0 ? (
                        <Empty title="No batches yet"><Link href="/admin/batches/new" className="text-blue-600 hover:underline">Create the first batch</Link></Empty>
                    ) : (
                        <ul className="space-y-2">
                            {batches.data.data.map(b => (
                                <li key={b.id}>
                                    <Link href={`/admin/batches/${b.id}`} className="block rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 hover:border-blue-200 hover:bg-blue-50/40 dark:hover:border-blue-900 dark:hover:bg-blue-900/10">
                                        <span className="flex items-center gap-2">
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{b.name}</span>
                                            <Pill tone={b.status === 'active' ? 'active' : 'neutral'}>{b.status}</Pill>
                                        </span>
                                        <span className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                            <span>{b.students} students</span>
                                            <span>{b.capabilities.meetings ? `${b.meetingsScheduled} meetings` : 'No meetings'}</span>
                                            <span>{b.activeStudents} active (14d)</span>
                                        </span>
                                        <ProgressBar value={b.progress} className="mt-1.5" label={`${b.name} average progress`} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            <Section title="Recently updated courses" actions={<button type="button" onClick={() => onView('courses')} className="text-sm text-blue-600 hover:underline">All courses</button>}>
                {courses.error ? <ErrorState error={courses.error} onRetry={courses.reload} /> : !courses.data ? <SkeletonBlock rows={2} /> : courses.data.data.length === 0 ? <Empty title="No courses yet" /> : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {courses.data.data.map(c => (
                            <li key={c.id}>
                                <Link href={`/admin/courses/${c.id}/preview`} className="flex h-full flex-col rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:border-blue-200 dark:hover:border-blue-900">
                                    <CourseThumb c={c} className="h-24" />
                                    <span className="mt-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
                                    <span className="mt-1 text-xs text-gray-500">{structureLabel(c)} · {c.enrolled} enrolled</span>
                                    <span className="mt-auto pt-2"><Pill tone={c.status === 'active' ? 'active' : 'neutral'}>{c.status === 'active' ? 'Published' : c.status}</Pill></span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
        </div>
    );
}

function Section({ title, actions, children, className = '' }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 ${className}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
                {actions}
            </div>
            {children}
        </section>
    );
}

/* ───────────── Shared list chrome ───────────── */

function Pager({ meta, onPage }: { meta: { page: number; totalPages: number; total: number; limit: number }; onPage: (p: number) => void }) {
    if (meta.total === 0) return null;
    return (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{(meta.page - 1) * meta.limit + 1}–{Math.min(meta.total, meta.page * meta.limit)} of {meta.total}</span>
            {meta.totalPages > 1 && (
                <span className="flex items-center gap-2">
                    <button type="button" className={btnSecondary} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                    <span className="tabular-nums">Page {meta.page} of {meta.totalPages}</span>
                    <button type="button" className={btnSecondary} disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                </span>
            )}
        </div>
    );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${inputCls} w-full pl-9`} />
        </div>
    );
}

/** Reads a set of filter keys from the URL and writes them back (page resets on change). */
function useUrlFilters<K extends string>(keys: readonly K[], defaults: Partial<Record<K, string>>) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();
    const values = Object.fromEntries(keys.map(k => [k, sp.get(k) ?? defaults[k] ?? ''])) as Record<K, string>;
    const page = Number(sp.get('page')) || 1;
    const set = (patch: Partial<Record<K | 'page', string | number>>) => {
        const next = new URLSearchParams(sp.toString());
        for (const [k, v] of Object.entries(patch)) {
            if (v === '' || v === undefined || v === null || v === defaults[k as K]) next.delete(k); else next.set(k, String(v));
        }
        if (!('page' in patch)) next.delete('page');
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };
    return { values, page, set };
}

/* ───────────── Batches ───────────── */

const BATCH_KEYS = ['q', 'status', 'type', 'meetings', 'sort'] as const;

function BatchesPanel() {
    const router = useRouter();
    const { values: f, page, set } = useUrlFilters(BATCH_KEYS, { sort: 'created:desc' });
    const [search, setSearch] = useState(f.q);
    const dq = useDebouncedValue(search.trim(), 350);
    useEffect(() => {
        if (dq !== f.q) set({ q: dq });
        // Only the debounced text drives this; the URL is the source of truth for f.q.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dq]);
    const [sort, dir] = (f.sort || 'created:desc').split(':');
    const list = useAsync(() => adminInsightsService.batchList({ page, limit: 12, q: f.q, status: f.status, type: f.type, meetings: f.meetings, sort, dir }), `batches:${JSON.stringify(f)}:${page}`);
    const [toDelete, setToDelete] = useState<BatchListRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const remove = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await batchService.delete(toDelete.id);
            toast.success('Batch deleted');
            setToDelete(null);
            list.reload();
        } catch (err) { toast.error(apiErrorMessage(err, 'The batch was not deleted')); } finally { setDeleting(false); }
    };

    return (
        <div>
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <SearchBox value={search} onChange={setSearch} placeholder="Search batches" />
                <div className="flex flex-wrap gap-2">
                    <select aria-label="Status" className={inputCls} value={f.status} onChange={e => set({ status: e.target.value })}>
                        <option value="">Any status</option><option value="active">Active</option><option value="archived">Archived</option>
                    </select>
                    <select aria-label="Batch type" className={inputCls} value={f.type} onChange={e => set({ type: e.target.value })}>
                        <option value="">Any type</option>
                        {(list.data?.facets.types ?? (f.type ? [f.type] : [])).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select aria-label="Meetings" className={inputCls} value={f.meetings} onChange={e => set({ meetings: e.target.value })}>
                        <option value="">Meetings: any</option><option value="on">Meetings on</option><option value="off">Meetings off</option>
                    </select>
                    <select aria-label="Sort" className={inputCls} value={f.sort || 'created:desc'} onChange={e => set({ sort: e.target.value })}>
                        <option value="created:desc">Newest first</option>
                        <option value="created:asc">Oldest first</option>
                        <option value="updated:desc">Recently updated</option>
                        <option value="students:desc">Most students</option>
                        <option value="progress:desc">Highest progress</option>
                        <option value="progress:asc">Lowest progress</option>
                        <option value="name:asc">Name A–Z</option>
                    </select>
                </div>
            </div>

            {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <SkeletonBlock rows={4} /> : list.data.data.length === 0 ? (
                <Empty icon={<Layers className="h-10 w-10" />} title={f.q || f.status || f.type || f.meetings ? 'No batches match these filters' : 'No batches yet'}>
                    <Link href="/admin/batches/new" className="text-blue-600 hover:underline">Create a batch</Link>
                </Empty>
            ) : (
                <>
                    <ul className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${list.loading ? 'opacity-60' : ''}`}>
                        {list.data.data.map(b => (
                            <li key={b.id} className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors hover:border-blue-300 dark:hover:border-blue-800">
                                <button type="button" onClick={() => router.push(`/admin/batches/${b.id}`)} className="flex flex-1 flex-col p-4 text-left">
                                    <span className="flex items-start gap-2">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold text-gray-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{b.name}</span>
                                            <span className="block truncate text-xs text-gray-500">{b.description || b.batch_number}</span>
                                        </span>
                                        <Pill tone={b.status === 'active' ? 'active' : 'neutral'}>{b.status}</Pill>
                                    </span>
                                    <span className="mt-2 flex flex-wrap gap-1.5">
                                        {b.batchType && <Pill tone="info">{b.batchType}</Pill>}
                                        <Pill tone="neutral">{b.capabilities.meetings ? <><Video className="h-3 w-3" aria-hidden="true" /> {b.meetingsScheduled} meeting{b.meetingsScheduled === 1 ? '' : 's'}</> : 'Meetings off'}</Pill>
                                        <Pill tone="neutral"><MessageSquare className="h-3 w-3" aria-hidden="true" /> {b.groupCount} group{b.groupCount === 1 ? '' : 's'}</Pill>
                                    </span>
                                    <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                        <span><span className="block text-gray-500">Students</span><span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{b.students}</span></span>
                                        <span><span className="block text-gray-500">Active (14d)</span><span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{b.activeStudents}</span></span>
                                        <span><span className="block text-gray-500">Courses</span><span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{b.courses}</span></span>
                                    </span>
                                    {b.courseTitles.length > 0 && <span className="mt-2 line-clamp-1 text-xs text-gray-500">{b.courseTitles.join(' · ')}</span>}
                                    <span className="mt-3 text-xs text-gray-500">Average progress</span>
                                    <ProgressBar value={b.progress} label={`${b.name} average progress`} />
                                    <span className="mt-2 text-[11px] text-gray-400">Created {fmtDate(b.createdAt)} · updated {fmtRelative(b.updatedAt, '—')}</span>
                                </button>
                                <div className="flex items-center border-t border-gray-100 dark:border-gray-800 text-xs">
                                    <CardAction href={`/admin/batches/${b.id}?tab=students`} icon={Users} label="Students" />
                                    <CardAction href={`/admin/batches/${b.id}?tab=analytics`} icon={BarChart3} label="Analytics" />
                                    <CardAction href={`/admin/batches/${b.id}?tab=settings`} icon={Edit} label="Edit" />
                                    <button type="button" onClick={() => setToDelete(b)} className="flex items-center justify-center px-3 py-2.5 text-gray-400 hover:text-red-600" aria-label={`Delete ${b.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Pager meta={list.data.meta} onPage={p => set({ page: p })} />
                </>
            )}
            <ConfirmDialog open={!!toDelete} title="Delete this batch?" busy={deleting} confirmLabel="Delete batch" onConfirm={remove} onCancel={() => setToDelete(null)}
                message={<>Delete <strong>{toDelete?.name}</strong>? Students lose batch-based course access. Learning history, messages and other batches are not deleted.</>} />
        </div>
    );
}

function CardAction({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
    return (
        <Link href={href} className="flex flex-1 items-center justify-center gap-1.5 border-r border-gray-100 dark:border-gray-800 px-2 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-blue-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-blue-300">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
        </Link>
    );
}

/* ───────────── Courses ───────────── */

const COURSE_KEYS = ['q', 'category', 'status', 'template', 'enrollment', 'sort'] as const;

function structureLabel(c: CourseListRow) {
    if (c.template === 'problem-solving') return `${c.problems ?? 0} problems`;
    if (c.template === 'aptitude') return `${c.questions ?? 0} questions`;
    if (c.modules !== null) return `${c.modules} modules · ${c.lessons ?? 0} lessons`;
    return `${c.lessons ?? 0} lessons`;
}

function CourseThumb({ c, className = '' }: { c: CourseListRow; className?: string }) {
    return (
        <span className={`flex w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-6 w-6 text-gray-400" aria-hidden="true" />}
        </span>
    );
}

function CoursesPanel() {
    const router = useRouter();
    const { values: f, page, set } = useUrlFilters(COURSE_KEYS, { sort: 'created:desc' });
    const [search, setSearch] = useState(f.q);
    const dq = useDebouncedValue(search.trim(), 350);
    useEffect(() => {
        if (dq !== f.q) set({ q: dq });
        // Only the debounced text drives this; the URL is the source of truth for f.q.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dq]);
    const [sort, dir] = (f.sort || 'created:desc').split(':');
    const list = useAsync(() => adminInsightsService.courseList({ page, limit: 12, q: f.q, category: f.category, status: f.status, template: f.template, enrollment: f.enrollment, sort, dir }), `courses:${JSON.stringify(f)}:${page}`);
    const [confirm, setConfirm] = useState<{ kind: 'delete' | 'publish' | 'unpublish'; c: CourseListRow } | null>(null);
    const [busy, setBusy] = useState(false);

    const act = async () => {
        if (!confirm) return;
        setBusy(true);
        try {
            if (confirm.kind === 'delete') await courseService.delete(confirm.c.id);
            if (confirm.kind === 'publish') await courseService.publish(confirm.c.id);
            if (confirm.kind === 'unpublish') await courseService.unpublish(confirm.c.id);
            toast.success(confirm.kind === 'delete' ? 'Course deleted' : confirm.kind === 'publish' ? 'Course published' : 'Course unpublished');
            setConfirm(null);
            list.reload();
        } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); } finally { setBusy(false); }
    };
    const analyticsHref = (c: CourseListRow) =>
        c.template === 'structured-course' ? `/admin/courses/${c.id}/question-progress` : c.template === 'problem-solving' ? `/admin/progress?course=${c.id}` : null;

    return (
        <div>
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <SearchBox value={search} onChange={setSearch} placeholder="Search courses" />
                <div className="flex flex-wrap gap-2">
                    <select aria-label="Category" className={inputCls} value={f.category} onChange={e => set({ category: e.target.value })}>
                        <option value="">Any category</option>
                        {(list.data?.facets.categories ?? (f.category ? [f.category] : [])).map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </select>
                    <select aria-label="Status" className={inputCls} value={f.status} onChange={e => set({ status: e.target.value })}>
                        <option value="">Any status</option><option value="active">Published</option><option value="inactive">Unpublished</option><option value="archived">Archived</option>
                    </select>
                    <select aria-label="Course type" className={inputCls} value={f.template} onChange={e => set({ template: e.target.value })}>
                        <option value="">Any type</option>
                        {Object.entries(TEMPLATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select aria-label="Enrolment" className={inputCls} value={f.enrollment} onChange={e => set({ enrollment: e.target.value })}>
                        <option value="">Any enrolment</option><option value="with">With students</option><option value="none">No students</option>
                    </select>
                    <select aria-label="Sort" className={inputCls} value={f.sort || 'created:desc'} onChange={e => set({ sort: e.target.value })}>
                        <option value="created:desc">Newest first</option>
                        <option value="updated:desc">Recently updated</option>
                        <option value="students:desc">Most students</option>
                        <option value="progress:desc">Highest avg progress</option>
                        <option value="title:asc">Title A–Z</option>
                    </select>
                </div>
            </div>

            {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <SkeletonBlock rows={4} /> : list.data.data.length === 0 ? (
                <Empty icon={<BookOpen className="h-10 w-10" />} title="No courses match"><Link href="/admin/courses/create" className="text-blue-600 hover:underline">Create a course</Link></Empty>
            ) : (
                <>
                    <ul className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${list.loading ? 'opacity-60' : ''}`}>
                        {list.data.data.map(c => {
                            const analytics = analyticsHref(c);
                            return (
                                <li key={c.id} className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors hover:border-blue-300 dark:hover:border-blue-800">
                                    <button type="button" onClick={() => router.push(`/admin/courses/${c.id}/preview`)} className="flex flex-1 flex-col p-4 text-left">
                                        <span className="flex gap-3">
                                            <CourseThumb c={c} className="h-16 !w-24 shrink-0" />
                                            <span className="min-w-0 flex-1">
                                                <span className="line-clamp-2 font-semibold text-gray-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{c.title}</span>
                                                <span className="mt-1 flex flex-wrap gap-1">
                                                    <Pill tone={c.status === 'active' ? 'active' : 'neutral'}>{c.status === 'active' ? 'Published' : c.status === 'inactive' ? 'Unpublished' : c.status}</Pill>
                                                    <Pill tone="neutral">{TEMPLATE_LABEL[c.template] ?? c.template}</Pill>
                                                </span>
                                            </span>
                                        </span>
                                        {c.description && <span className="mt-2 line-clamp-2 text-xs text-gray-500">{c.description}</span>}
                                        <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                            <span><span className="block text-gray-500">Students</span><span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{c.enrolled}</span></span>
                                            <span><span className="block text-gray-500">Completed</span><span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{c.completedStudents}</span></span>
                                            <span><span className="block text-gray-500">Content</span><span className="text-sm font-medium text-gray-900 dark:text-white">{structureLabel(c)}</span></span>
                                        </span>
                                        <span className="mt-3 text-xs text-gray-500">Average student progress</span>
                                        <ProgressBar value={c.avgProgress} label={`${c.title} average progress`} />
                                        <span className="mt-2 text-[11px] text-gray-400">{c.category ? `${c.category.replace(/_/g, ' ')} · ` : ''}created {fmtDate(c.createdAt)} · updated {fmtRelative(c.updatedAt, '—')}</span>
                                    </button>
                                    <div className="flex items-center border-t border-gray-100 dark:border-gray-800 text-xs">
                                        <CardAction href={`/admin/courses/${c.id}/preview`} icon={Eye} label="View" />
                                        <CardAction href={`/admin/courses/create?id=${c.id}`} icon={Edit} label="Edit" />
                                        <CardAction href={`/admin/students?courseId=${c.id}`} icon={Users} label="Students" />
                                        {analytics && <CardAction href={analytics} icon={BarChart3} label="Progress" />}
                                        <details className="relative">
                                            <summary className="flex cursor-pointer list-none items-center px-3 py-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label={`More actions for ${c.title}`}>⋯</summary>
                                            <div className="absolute bottom-full right-0 z-10 mb-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                                <Link href={`/admin/discounts?create=${encodeURIComponent(`COURSE:${c.id}`)}`} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <TicketPercent className="h-3.5 w-3.5" aria-hidden="true" /> Create discount
                                                </Link>
                                                <Link href={`/admin/discounts?product=${encodeURIComponent(`course:${c.id}`)}`} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <TicketPercent className="h-3.5 w-3.5" aria-hidden="true" /> View coupons
                                                </Link>
                                                <button type="button" onClick={() => setConfirm({ kind: c.status === 'active' ? 'unpublish' : 'publish', c })} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {c.status === 'active' ? 'Unpublish' : 'Publish'}
                                                </button>
                                                <button type="button" onClick={() => setConfirm({ kind: 'delete', c })} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                                                </button>
                                            </div>
                                        </details>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <Pager meta={list.data.meta} onPage={p => set({ page: p })} />
                </>
            )}
            <ConfirmDialog open={!!confirm} busy={busy}
                tone={confirm?.kind === 'delete' ? 'danger' : 'primary'}
                title={confirm?.kind === 'delete' ? 'Delete this course?' : confirm?.kind === 'publish' ? 'Publish this course?' : 'Unpublish this course?'}
                confirmLabel={confirm?.kind === 'delete' ? 'Delete course' : confirm?.kind === 'publish' ? 'Publish' : 'Unpublish'}
                message={confirm?.kind === 'delete'
                    ? <>Delete <strong>{confirm.c.title}</strong>? This cannot be undone.</>
                    : confirm?.kind === 'publish' ? <>Make <strong>{confirm?.c.title}</strong> available to students?</> : <>Take <strong>{confirm?.c.title}</strong> offline? Enrolled students will no longer see it.</>}
                onConfirm={act} onCancel={() => setConfirm(null)} />
        </div>
    );
}


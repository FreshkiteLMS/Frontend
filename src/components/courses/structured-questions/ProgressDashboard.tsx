"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, Download, Grid3x3, Mic, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import {
    type CourseProgressSummary,
    type ProgressMetrics,
    type QuestionStatus,
    type StudentProgressRow,
    QUESTION_STATUS_LABELS,
    QUESTION_STATUSES,
} from '@/types/structured-questions';
import { formatDateTime, percent } from '@/lib/question-progress';
import { ProgressMatrix } from './ProgressMatrix';
import { StudentDrawer } from './StudentDrawer';
import { Pagination } from './Pagination';
import { useDebouncedValue } from './useDebouncedValue';
import { AttemptDetailView, SpeakingAnalytics } from '../speaking/SpeakingAnalytics';

const PAGE_SIZE = 25;
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm';

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

const fraction = (m: ProgressMetrics) => `${m.finished}/${m.total}`;

type View = 'speaking' | 'grid' | 'assignments';

const TABS: { id: View; label: string; icon: typeof Mic }[] = [
    { id: 'speaking', label: 'AI speaking', icon: Mic },
    { id: 'grid', label: 'Score grid', icon: Grid3x3 },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
];

/**
 * Instructor/admin dashboard for a Structured Course.
 *
 * - **AI speaking** (default): course overview, charts, sortable student table,
 *   question statistics and every attempt with its AI report and review.
 * - **Score grid**: each student's best AI score for every audio question.
 * - **Assignments**: the instructor-assessed status workflow (assignments only).
 *
 * Audio questions have no manual status or score — their progress and score
 * come from the student's AI practice. `embedded` drops the page chrome when
 * shown inside the admin progress hub.
 */
export function ProgressDashboard({ courseId, initialStudentId = null, embedded = false }: { courseId: string; initialStudentId?: string | null; embedded?: boolean }) {
    const router = useRouter();
    const [view, setView] = useState<View>('speaking');
    const [summary, setSummary] = useState<CourseProgressSummary | null>(null);
    // Deep link from the admin student page opens that student's detail directly.
    const [selected, setSelected] = useState<string | null>(initialStudentId);
    const [openAttempt, setOpenAttempt] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    // Assignments tab
    const [rows, setRows] = useState<StudentProgressRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<QuestionStatus | ''>('');
    const [completion, setCompletion] = useState<'' | 'not_started' | 'in_progress' | 'finished'>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const q = useDebouncedValue(search.trim());

    const loadSummary = useCallback(async () => {
        try {
            setSummary(await structuredCourseService.progressSummary(courseId));
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load the course summary.'));
        }
    }, [courseId]);

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await structuredCourseService.progressStudents(courseId, { q, type: 'assignment', status, completion, page, limit: PAGE_SIZE });
            setRows(res.data);
            setTotal(res.meta.total);
            setTotalPages(res.meta.totalPages);
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load assignment progress.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, q, status, completion, page]);

    useEffect(() => { void loadSummary(); }, [loadSummary]);
    useEffect(() => { if (view === 'assignments') void loadRows(); }, [view, loadRows]);
    useEffect(() => { setPage(1); }, [q, status, completion]);

    const handleExport = async () => {
        setExporting(true);
        try {
            await structuredCourseService.exportCsv(courseId);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Export failed.'));
        } finally {
            setExporting(false);
        }
    };

    const refreshAfterAssessment = () => {
        void loadSummary();
        if (view === 'assignments') void loadRows();
    };

    const showAttempt = (id: string) => {
        setSelected(null);
        setView('speaking');
        setOpenAttempt(id);
    };

    const exportButton = (
        <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            <Download className="w-4 h-4" aria-hidden="true" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
    );

    const assignmentCount = summary?.questionsByType.assignment ?? 0;

    return (
        <div className={embedded ? 'space-y-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'}>
            {embedded ? (
                <div className="flex justify-end">{exportButton}</div>
            ) : (
                <div>
                    <button onClick={() => router.push(`/admin/courses/${courseId}/preview`)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
                        <ArrowLeft className="w-5 h-5" aria-hidden="true" /> Back to course
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student progress</h1>
                            <p className="text-gray-600 dark:text-gray-400">{summary?.courseTitle ?? 'Speaking practice & assignments'}</p>
                        </div>
                        {exportButton}
                    </div>
                </div>
            )}

            {openAttempt ? (
                <AttemptDetailView courseId={courseId} attemptId={openAttempt} onBack={() => setOpenAttempt(null)} />
            ) : (
                <>
                    <div role="tablist" aria-label="Progress view" className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                        {TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={view === id}
                                onClick={() => setView(id)}
                                className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                    view === id ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />{label}
                            </button>
                        ))}
                    </div>

                    {view === 'speaking' && <SpeakingAnalytics courseId={courseId} onOpenStudent={setSelected} onOpenAttempt={setOpenAttempt} />}

                    {view === 'grid' && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                            <ProgressMatrix courseId={courseId} type="audio_question" onSelectStudent={setSelected} />
                        </div>
                    )}

                    {view === 'assignments' && (
                        <div className="space-y-4">
                            {summary && (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    <Stat label="Enrolled students" value={summary.totalStudents} />
                                    <Stat label="Assignments" value={assignmentCount} />
                                    <Stat label="Last activity" value={summary.lastActivity ? new Date(summary.lastActivity).toLocaleDateString() : '—'} />
                                </div>
                            )}
                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                    <div className="relative">
                                        <label htmlFor="pd-search" className="sr-only">Search students</label>
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden="true" />
                                        <input id="pd-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" className={`${inputCls} pl-9`} />
                                    </div>
                                    <div>
                                        <label htmlFor="pd-status" className="sr-only">Has an assignment with status</label>
                                        <select id="pd-status" value={status} onChange={e => setStatus(e.target.value as QuestionStatus | '')} className={inputCls}>
                                            <option value="">Any assignment status</option>
                                            {QUESTION_STATUSES.map(s => <option key={s} value={s}>Has {QUESTION_STATUS_LABELS[s].toLowerCase()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="pd-completion" className="sr-only">Completion</label>
                                        <select id="pd-completion" value={completion} onChange={e => setCompletion(e.target.value as typeof completion)} className={inputCls}>
                                            <option value="">Any completion</option>
                                            <option value="not_started">Not started</option>
                                            <option value="in_progress">In progress</option>
                                            <option value="finished">Finished all</option>
                                        </select>
                                    </div>
                                </div>

                                {error ? (
                                    <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300">
                                        {error} <button type="button" onClick={() => { void loadSummary(); void loadRows(); }} className="underline font-medium">Retry</button>
                                    </div>
                                ) : assignmentCount === 0 && summary ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">This course has no assignments. Audio questions are tracked on the AI speaking tab.</p>
                                ) : loading && rows.length === 0 ? (
                                    <p className="text-sm text-gray-500 py-8 text-center">Loading students…</p>
                                ) : rows.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                                        {q || status || completion ? 'No students match these filters.' : 'No students are enrolled in this course yet.'}
                                    </p>
                                ) : (
                                    <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                                        <table className="min-w-full text-sm">
                                            <caption className="sr-only">Per-student assignment progress</caption>
                                            <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                                <tr>
                                                    <th scope="col" className="py-2 pr-4">Student</th>
                                                    <th scope="col" className="py-2 pr-4">Finished</th>
                                                    <th scope="col" className="py-2 pr-2 text-right">Not started</th>
                                                    <th scope="col" className="py-2 pr-2 text-right">In progress</th>
                                                    <th scope="col" className="py-2 pr-2 text-right">Completed</th>
                                                    <th scope="col" className="py-2 pr-2 text-right">Pass</th>
                                                    <th scope="col" className="py-2 pr-4 text-right">Fail</th>
                                                    <th scope="col" className="py-2">Last activity</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                                {rows.map(r => (
                                                    <tr key={r.userId}>
                                                        <td className="py-2 pr-4">
                                                            <button type="button" onClick={() => setSelected(r.userId)} className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline">{r.name}</button>
                                                            {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                                                        </td>
                                                        <td className="py-2 pr-4 whitespace-nowrap">{fraction(r.overall)} <span className="text-gray-400">({percent(r.overall.percentFinished)})</span></td>
                                                        <td className="py-2 pr-2 text-right tabular-nums">{r.overall.counts.NOT_STARTED}</td>
                                                        <td className="py-2 pr-2 text-right tabular-nums">{r.overall.counts.IN_PROGRESS}</td>
                                                        <td className="py-2 pr-2 text-right tabular-nums">{r.overall.counts.COMPLETED}</td>
                                                        <td className="py-2 pr-2 text-right tabular-nums">{r.overall.counts.PASS}</td>
                                                        <td className="py-2 pr-4 text-right tabular-nums">{r.overall.counts.FAIL}</td>
                                                        <td className="py-2 whitespace-nowrap text-xs text-gray-500">{formatDateTime(r.lastActivity)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} noun="students" />
                            </div>
                        </div>
                    )}
                </>
            )}

            {selected && (
                <StudentDrawer courseId={courseId} userId={selected} onClose={() => setSelected(null)} onOpenAttempt={showAttempt} onAssessed={refreshAfterAssessment} />
            )}
        </div>
    );
}

"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorCode, apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import {
    QUESTION_STATUS_LABELS,
    QUESTION_STATUSES,
    QUESTION_TYPE_LABELS,
    type AudioMarksSummary,
    type CourseProgressSummary,
    type ProgressMetrics,
    type QuestionStatus,
    type QuestionType,
    type StudentProgressDetail,
    type StudentProgressRow,
} from '@/types/structured-questions';
import { formatDateTime, formatMarks, percent } from '@/lib/question-progress';
import { QuestionStatusBadge } from './QuestionStatusBadge';
import { ProgressMatrix } from './ProgressMatrix';
import { Pagination } from './Pagination';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 25;
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

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

function MarksSummaryCell({ marks }: { marks: AudioMarksSummary }) {
    if (marks.scored === 0) return <span className="text-gray-400">No scores</span>;
    return (
        <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums">{formatMarks(marks.obtained, marks.max)}</span>
            {marks.percent !== null && <span className="text-gray-400"> ({percent(marks.percent)})</span>}
            {marks.unscored > 0 && <span className="block text-[11px] text-gray-400">{marks.unscored} unscored</span>}
        </span>
    );
}

type View = 'students' | 'grid';

/**
 * Instructor/admin dashboard for a Structured Course: course summary, a
 * server-paginated student table with filters, a student × question grid,
 * a per-student detail view and assessment (PASS/FAIL or override) with notes.
 * `embedded` drops the page chrome when shown inside the admin progress hub.
 */
export function ProgressDashboard({ courseId, initialStudentId = null, embedded = false }: { courseId: string; initialStudentId?: string | null; embedded?: boolean }) {
    const router = useRouter();
    const [view, setView] = useState<View>('students');
    const [summary, setSummary] = useState<CourseProgressSummary | null>(null);
    const [rows, setRows] = useState<StudentProgressRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [type, setType] = useState<QuestionType | ''>('');
    const [status, setStatus] = useState<QuestionStatus | ''>('');
    const [completion, setCompletion] = useState<'' | 'not_started' | 'in_progress' | 'finished'>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Deep link from the admin student page opens that student's detail directly.
    const [selected, setSelected] = useState<string | null>(initialStudentId);
    const [exporting, setExporting] = useState(false);
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
            const res = await structuredCourseService.progressStudents(courseId, { q, type, status, completion, page, limit: PAGE_SIZE });
            setRows(res.data);
            setTotal(res.meta.total);
            setTotalPages(res.meta.totalPages);
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load student progress.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, q, type, status, completion, page]);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { loadRows(); }, [loadRows]);
    useEffect(() => { setPage(1); }, [q, type, status, completion]);

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
        loadSummary();
        loadRows();
    };

    const exportButton = (
        <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            <Download className="w-4 h-4" aria-hidden="true" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
    );

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
                            <p className="text-gray-600 dark:text-gray-400">{summary?.courseTitle ?? 'Questions & Assignments'}</p>
                        </div>
                        {exportButton}
                    </div>
                </div>
            )}

            {summary && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <Stat label="Enrolled students" value={summary.totalStudents} sub={`${summary.studentsStarted} started · ${summary.studentsFinished} finished all`} />
                        <Stat label="Active questions" value={summary.totalQuestions} sub={`${summary.questionsByType.audio_question} audio · ${summary.questionsByType.assignment} assignments`} />
                        <Stat label="Average finished" value={percent(summary.averagePercentFinished)} sub="per student (completed, pass or fail)" />
                        <Stat label="Passed" value={percent(summary.percentPairsPassed)} sub={`${summary.statusTotals.PASS} pass · ${summary.statusTotals.FAIL} fail`} />
                        <Stat label="Last activity" value={summary.lastActivity ? new Date(summary.lastActivity).toLocaleDateString() : '—'} />
                    </div>
                    <div className="flex flex-wrap gap-2" aria-label="Status totals across all students">
                        {QUESTION_STATUSES.map(s => (
                            <span key={s} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <QuestionStatusBadge status={s} /> {summary.statusTotals[s]}
                            </span>
                        ))}
                    </div>
                </>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <div role="tablist" aria-label="Progress view" className="mb-4 inline-flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                    {([['students', 'By student'], ['grid', 'Question grid']] as [View, string][]).map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={view === id}
                            onClick={() => setView(id)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                view === id ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {view === 'grid' ? (
                    <ProgressMatrix courseId={courseId} onSelectStudent={setSelected} />
                ) : (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="relative">
                        <label htmlFor="pd-search" className="sr-only">Search students</label>
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="pd-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" className={`${inputCls} pl-9`} />
                    </div>
                    <div>
                        <label htmlFor="pd-type" className="sr-only">Question type</label>
                        <select id="pd-type" value={type} onChange={e => setType(e.target.value as QuestionType | '')} className={inputCls}>
                            <option value="">All question types</option>
                            <option value="audio_question">Audio questions only</option>
                            <option value="assignment">Assignments only</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="pd-status" className="sr-only">Has a question with status</label>
                        <select id="pd-status" value={status} onChange={e => setStatus(e.target.value as QuestionStatus | '')} className={inputCls}>
                            <option value="">Any question status</option>
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
                        {error} <button type="button" onClick={() => { loadSummary(); loadRows(); }} className="underline font-medium">Retry</button>
                    </div>
                ) : loading && rows.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">Loading students…</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                        {q || type || status || completion ? 'No students match these filters.' : 'No students are enrolled in this course yet.'}
                    </p>
                ) : (
                    <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                        <table className="min-w-full text-sm">
                            <caption className="sr-only">Per-student question progress</caption>
                            <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th scope="col" className="py-2 pr-4">Student</th>
                                    <th scope="col" className="py-2 pr-4">Finished</th>
                                    <th scope="col" className="py-2 pr-4">Audio</th>
                                    <th scope="col" className="py-2 pr-4">Assignments</th>
                                    <th scope="col" className="py-2 pr-4">Audio marks</th>
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
                                            <button type="button" onClick={() => setSelected(r.userId)} className="text-left font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                {r.name}
                                            </button>
                                            {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                                        </td>
                                        <td className="py-2 pr-4 whitespace-nowrap">{fraction(r.overall)} <span className="text-gray-400">({percent(r.overall.percentFinished)})</span></td>
                                        <td className="py-2 pr-4 whitespace-nowrap">{fraction(r.audio)}</td>
                                        <td className="py-2 pr-4 whitespace-nowrap">{fraction(r.assignment)}</td>
                                        <td className="py-2 pr-4"><MarksSummaryCell marks={r.audioMarks} /></td>
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
                </>
                )}
            </div>

            {selected && (
                <StudentDetailDrawer courseId={courseId} userId={selected} onClose={() => setSelected(null)} onAssessed={refreshAfterAssessment} />
            )}
        </div>
    );
}

function StudentDetailDrawer({
    courseId,
    userId,
    onClose,
    onAssessed,
}: {
    courseId: string;
    userId: string;
    onClose: () => void;
    onAssessed: () => void;
}) {
    const [detail, setDetail] = useState<StudentProgressDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('');
    const [assessing, setAssessing] = useState<string | null>(null);
    const [draft, setDraft] = useState<{ status: QuestionStatus; notes: string }>({ status: 'PASS', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        try {
            setDetail(await structuredCourseService.studentDetail(courseId, userId));
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load this student.'));
        }
    }, [courseId, userId]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (questionId: string, version: number) => {
        setSaving(true);
        try {
            await structuredCourseService.assess(courseId, userId, questionId, { status: draft.status, notes: draft.notes.trim() || null, expectedVersion: version });
            toast.success(`Recorded ${QUESTION_STATUS_LABELS[draft.status].toLowerCase()}`);
            setAssessing(null);
            await load();
            onAssessed();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'The assessment was not saved.'));
            if (apiErrorCode(err) === 'VERSION_CONFLICT') load();
        } finally {
            setSaving(false);
        }
    };

    const questions = (detail?.questions || []).filter(q => !typeFilter || q.type === typeFilter);

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="sd-title">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-3xl h-full overflow-y-auto bg-white dark:bg-gray-900 shadow-xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h2 id="sd-title" className="text-xl font-bold text-gray-900 dark:text-white">{detail?.student.name ?? 'Student'}</h2>
                        {detail?.student.email && <p className="text-sm text-gray-500">{detail.student.email}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {error && <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300">{error}</div>}
                {!detail && !error && <p className="text-sm text-gray-500">Loading…</p>}

                {detail && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <Stat label="Overall finished" value={fraction(detail.metrics.overall)} sub={`${detail.metrics.overall.counts.PASS} pass · ${detail.metrics.overall.counts.FAIL} fail`} />
                            <Stat label="Audio" value={fraction(detail.metrics.audio)} />
                            <Stat label="Assignments" value={fraction(detail.metrics.assignment)} />
                            <Stat
                                label="Audio marks"
                                value={detail.metrics.audioMarks.scored ? formatMarks(detail.metrics.audioMarks.obtained, detail.metrics.audioMarks.max) : '—'}
                                sub={`${detail.metrics.audioMarks.scored} scored · ${detail.metrics.audioMarks.unscored} unscored`}
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="sd-type" className="sr-only">Filter by type</label>
                            <select id="sd-type" value={typeFilter} onChange={e => setTypeFilter(e.target.value as QuestionType | '')} className={`${inputCls} max-w-xs`}>
                                <option value="">All types</option>
                                <option value="audio_question">Audio questions</option>
                                <option value="assignment">Assignments</option>
                            </select>
                        </div>

                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {questions.map(q => (
                                <li key={q.id} className="py-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                                {QUESTION_TYPE_LABELS[q.type]}{q.topic ? ` · ${q.topic}` : ''}{!q.isActive ? ' · inactive' : ''}
                                            </p>
                                            <p className="font-medium text-gray-900 dark:text-white">{q.title}</p>
                                            <p className="text-xs text-gray-400">
                                                Updated {formatDateTime(q.progress.updatedAt)}{q.progress.updatedByRole ? ` by ${q.progress.updatedByRole}` : ''}
                                            </p>
                                            {q.progress.assessmentNotes && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">Notes: {q.progress.assessmentNotes}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {q.type === 'audio_question' && (
                                                <span className={`text-xs tabular-nums ${q.progress.marksObtained !== null ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                                    {q.progress.marksObtained !== null ? formatMarks(q.progress.marksObtained, q.progress.marksMax) : `— / ${formatMarks(q.maxMarks ?? 10, null)}`}
                                                </span>
                                            )}
                                            <QuestionStatusBadge status={q.progress.status} />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAssessing(assessing === q.id ? null : q.id);
                                                    setDraft({ status: q.progress.status === 'FAIL' ? 'FAIL' : 'PASS', notes: q.progress.assessmentNotes ?? '' });
                                                }}
                                                aria-expanded={assessing === q.id}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                Assess
                                            </button>
                                        </div>
                                    </div>
                                    {assessing === q.id && (
                                        <form className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2" onSubmit={e => { e.preventDefault(); submit(q.id, q.progress.version); }}>
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Status
                                                <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as QuestionStatus })} className={inputCls}>
                                                    {QUESTION_STATUSES.map(s => <option key={s} value={s}>{QUESTION_STATUS_LABELS[s]}</option>)}
                                                </select>
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">Notes (visible to the student)
                                                <input maxLength={2000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} className={inputCls} />
                                            </label>
                                            <div className="flex items-end gap-2">
                                                <button type="submit" disabled={saving} className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                                                    {saving ? 'Saving…' : 'Save'}
                                                </button>
                                                <button type="button" onClick={() => setAssessing(null)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
                                            </div>
                                        </form>
                                    )}
                                </li>
                            ))}
                        </ul>

                        {detail.history.length > 0 && (
                            <details className="mt-6">
                                <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">Activity history ({detail.history.length})</summary>
                                <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                    {detail.history.map(h => {
                                        const title = detail.questions.find(q => q.id === h.questionId)?.title ?? 'Question';
                                        return (
                                            <li key={h.id}>
                                                {formatDateTime(h.createdAt)} — {title}:{' '}
                                                {h.kind === 'self_score' ? (
                                                    <>{h.marksObtained != null ? `scored ${formatMarks(h.marksObtained, h.marksMax)}` : 'cleared score'}{h.fromStatus !== h.toStatus ? ` (${QUESTION_STATUS_LABELS[h.fromStatus]} → ${QUESTION_STATUS_LABELS[h.toStatus]})` : ''} (student)</>
                                                ) : (
                                                    <>{QUESTION_STATUS_LABELS[h.fromStatus]} → {QUESTION_STATUS_LABELS[h.toStatus]}
                                                    {' '}({h.kind === 'self_update' ? 'student' : `${h.kind} by ${h.actorRole}`}){h.notes ? ` — “${h.notes}”` : ''}</>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </details>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

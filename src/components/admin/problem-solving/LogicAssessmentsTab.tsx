"use client";

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { problemCourseService } from '@/services/api/problem-course.api';
import { apiErrorMessage } from '@/services/api/discount.api';
import type { AdminLogicDetail, LogicAssessmentRow, LogicOverview } from '@/types/problem-course';
import { LogicAssessmentReport, VerdictBadge, scoreColor } from '@/components/courses/problem-tracker/LogicAssessmentReport';

const STATUS_LABEL: Record<string, string> = {
    COMPLETED: 'Completed', FAILED: 'Failed', UPLOADING: 'Uploading', UPLOADED: 'Pending', TRANSCRIBING: 'Transcribing', EVALUATING: 'Evaluating',
};
const SORTS = [
    { v: 'submitted:desc', label: 'Newest first' },
    { v: 'submitted:asc', label: 'Oldest first' },
    { v: 'score:desc', label: 'Highest score' },
    { v: 'score:asc', label: 'Lowest score' },
];

/** Score filter text: a number from 0 to 10 with at most one decimal (scores are out of 10). */
const scoreInput = (raw: string) => {
    const m = raw.replace(/[^\d.]/g, '').match(/^\d{0,2}(\.\d?)?/);
    const v = m ? m[0] : '';
    return v !== '' && Number(v) > 10 ? '10' : v;
};

function Detail({ courseId, attemptId, onClose }: { courseId: string; attemptId: string; onClose: () => void }) {
    const [d, setD] = useState<AdminLogicDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        problemCourseService.logicAssessment(courseId, attemptId).then(setD).catch(e => setError(apiErrorMessage(e)));
    }, [courseId, attemptId]);
    return (
        <Modal open onClose={onClose} size="2xl" title={d ? `${d.student.name} · ${d.problem?.title ?? ''}` : 'Logic assessment'} description={d ? `Attempt ${d.attemptNumber} · ${d.submittedAt ? new Date(d.submittedAt).toLocaleString() : ''}` : undefined}>
            {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : !d ? <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-label="Loading" /> : (
                <div className="space-y-4">
                    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 text-sm sm:grid-cols-4">
                        <div><dt className="text-xs text-gray-500">Student</dt><dd className="font-medium text-gray-900 dark:text-white">{d.student.name}</dd><dd className="text-xs text-gray-500">{d.student.email}</dd></div>
                        <div><dt className="text-xs text-gray-500">Student ID</dt><dd className="font-mono text-gray-900 dark:text-white">{d.student.studentCode ?? '—'}</dd></div>
                        <div><dt className="text-xs text-gray-500">Problem</dt><dd className="font-medium text-gray-900 dark:text-white">{d.problem?.title}</dd><dd className="text-xs text-gray-500">{d.problem?.category}</dd></div>
                        <div><dt className="text-xs text-gray-500">Attempt</dt><dd className="text-gray-900 dark:text-white">#{d.attemptNumber}</dd></div>
                    </dl>
                    {d.report ? (
                        <LogicAssessmentReport report={d.report} transcript={d.transcript ? { text: d.transcript.text, lowConfidence: d.transcript.lowConfidence } : null} />
                    ) : (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm">
                            <p className="font-semibold text-gray-900 dark:text-white">{STATUS_LABEL[d.status] ?? d.status}</p>
                            {d.error && <p className="mt-1 text-gray-600 dark:text-gray-400">{d.error.code === 'NOT_ASSESSABLE' ? 'Not assessable: ' : ''}{d.error.message}</p>}
                            {d.transcript && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Transcript</summary><p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{d.transcript.text}</p></details>}
                        </div>
                    )}
                    <p className="text-xs text-gray-400">Recordings are deleted after transcription, so there is no audio to play back.</p>
                </div>
            )}
        </Modal>
    );
}

/**
 * Admin: every student's "Explain your approach" assessments for this course.
 * `student` pins the list to one student (from the Student progress table).
 */
export function LogicAssessmentsTab({ courseId, sections, student, onClearStudent }: {
    courseId: string;
    sections: { id: string; title: string }[];
    student?: { userId: string; name: string } | null;
    onClearStudent?: () => void;
}) {
    const [overview, setOverview] = useState<LogicOverview | null>(null);
    const [rows, setRows] = useState<LogicAssessmentRow[]>([]);
    const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [f, setF] = useState({ q: '', problemQ: '', sectionId: '', status: '', minScore: '', maxScore: '', sort: SORTS[0].v });
    const [applied, setApplied] = useState(f);
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState<string | null>(null);

    useEffect(() => { problemCourseService.logicOverview(courseId).then(setOverview).catch(() => undefined); }, [courseId]);
    // Typing filters apply after a short pause.
    useEffect(() => { const t = setTimeout(() => { setApplied(f); setPage(1); }, 300); return () => clearTimeout(t); }, [f]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sort, dir] = applied.sort.split(':');
            const r = await problemCourseService.logicAssessments(courseId, { ...applied, userId: student?.userId, sort, dir, page, limit: 20 });
            setRows(r.data);
            setMeta(r.meta);
            setError(null);
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load assessments.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, applied, page, student?.userId]);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => { setPage(1); }, [student?.userId]);

    const input = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';
    const cards = overview ? [
        ['Students attempted', overview.studentsAttempted], ['Submitted', overview.totalSubmitted], ['Average score', overview.averageScore != null ? `${overview.averageScore}/10` : '—'],
        ['Completed', overview.completed], ['Pending', overview.pending], ['Failed', overview.failed],
    ] : [];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {overview ? cards.map(([label, value]) => (
                    <div key={label as string} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
                    </div>
                )) : [0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <div className="relative xl:col-span-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input value={f.q} onChange={e => setF({ ...f, q: e.target.value })} placeholder="Student name, email or ID" aria-label="Search students" className={`${input} w-full pl-9`} />
                </div>
                <input value={f.problemQ} onChange={e => setF({ ...f, problemQ: e.target.value })} placeholder="Problem title" aria-label="Search problems" className={input} />
                <select value={f.sectionId} onChange={e => setF({ ...f, sectionId: e.target.value })} aria-label="Category" className={input}>
                    <option value="">All categories</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} aria-label="Status" className={input}>
                    <option value="">All statuses</option><option value="COMPLETED">Completed</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option>
                </select>
                <div className="flex items-center gap-1">
                    <input value={f.minScore} onChange={e => setF({ ...f, minScore: scoreInput(e.target.value) })} placeholder="Min (0–10)" aria-label="Minimum score" className={`${input} w-full`} inputMode="decimal" />
                    <span className="text-gray-400">–</span>
                    <input value={f.maxScore} onChange={e => setF({ ...f, maxScore: scoreInput(e.target.value) })} placeholder="Max (0–10)" aria-label="Maximum score" className={`${input} w-full`} inputMode="decimal" />
                </div>
                <select value={f.sort} onChange={e => setF({ ...f, sort: e.target.value })} aria-label="Sort" className={input}>
                    {SORTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
            </div>

            {student && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 font-medium text-blue-800 dark:text-blue-200">
                        Showing only {student.name}
                        {onClearStudent && (
                            <button type="button" onClick={onClearStudent} aria-label="Show all students" className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800/50">
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        )}
                    </span>
                </div>
            )}

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/40 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Problem</th><th className="px-4 py-3">Score /10</th><th className="px-4 py-3">Verdict</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3"><span className="sr-only">Action</span></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && !rows.length ? [0, 1, 2].map(i => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-gray-100 dark:bg-gray-700" /></td></tr>)
                                : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No logic assessments match.</td></tr>
                                    : rows.map(r => (
                                        <tr key={r.attemptId} className={loading ? 'opacity-60' : ''}>
                                            <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{r.student.name}</p><p className="text-xs text-gray-500">{r.student.studentCode ?? r.student.email}</p></td>
                                            <td className="px-4 py-3"><p className="text-gray-900 dark:text-white">{r.problem.title}</p><p className="text-xs text-gray-500">{r.problem.category} · attempt #{r.attemptNumber}</p></td>
                                            <td className={`px-4 py-3 font-bold tabular-nums ${scoreColor(r.score)}`}>{r.score ?? '—'}</td>
                                            <td className="px-4 py-3">{r.verdict ? <VerdictBadge verdict={r.verdict} /> : <span className="text-xs text-gray-500">{r.errorCode === 'NOT_ASSESSABLE' ? 'Not assessable' : STATUS_LABEL[r.status] ?? r.status}</span>}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{new Date(r.submittedAt).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right"><button type="button" onClick={() => setViewing(r.attemptId)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"><Eye className="h-3.5 w-3.5" aria-hidden="true" />View</button></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 text-xs text-gray-500">
                        <span>Page {meta.page} of {meta.totalPages} · {meta.total} assessments</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages} aria-label="Next page" className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                )}
            </div>
            {viewing && <Detail courseId={courseId} attemptId={viewing} onClose={() => setViewing(null)} />}
        </div>
    );
}

/** The attempt detail modal, reused by the admin Student 360 page. */
export { Detail as LogicAttemptDetail };

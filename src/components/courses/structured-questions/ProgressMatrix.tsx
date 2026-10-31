"use client";

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Mic, Search } from 'lucide-react';
import { apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import {
    QUESTION_STATUS_LABELS,
    type MatrixCell,
    type MatrixQuestion,
    type MatrixStudent,
    type QuestionStatus,
    type QuestionType,
} from '@/types/structured-questions';
import { STATUS_STYLES, formatDateTime, formatMarks } from '@/lib/question-progress';
import { formatScore, heatCell } from '@/lib/speaking';
import { Pagination } from './Pagination';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 20;
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm';

// Short labels keep the assignment grid dense; the full label is in the cell's title.
const SHORT: Record<QuestionStatus, string> = {
    NOT_STARTED: 'Not started',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Done',
    PASS: 'Pass',
    FAIL: 'Fail',
};

/** Audio question: the student's best AI score as a heat-map cell (number always shown). */
function ScoreCell({ cell }: { cell: MatrixCell | undefined }) {
    const has = !!cell && cell.marksObtained !== null && !!cell.marksMax;
    const ratio = has ? (cell!.marksObtained as number) / (cell!.marksMax as number) : null;
    return (
        <div
            className={`flex h-10 w-full min-w-[3.5rem] items-center justify-center rounded-md text-sm font-bold tabular-nums ${heatCell(ratio)}`}
            title={has ? `Best AI score ${formatMarks(cell!.marksObtained!, cell!.marksMax)} · ${formatDateTime(cell!.updatedAt)}` : 'Not practised'}
        >
            {has ? <>{formatScore(ratio! * 10)}</> : <span aria-hidden="true">—</span>}
            {!has && <span className="sr-only">Not practised</span>}
        </div>
    );
}

/** Assignment: the instructor-assessed status. */
function StatusCell({ cell }: { cell: MatrixCell | undefined }) {
    if (!cell) {
        return (
            <span className="text-gray-300 dark:text-gray-600" title="Not started (no response recorded)">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Not started, no response</span>
            </span>
        );
    }
    return (
        <span title={`${QUESTION_STATUS_LABELS[cell.status]} · updated ${formatDateTime(cell.updatedAt)}`} className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[cell.status]}`}>
            {SHORT[cell.status]}
        </span>
    );
}

const LEGEND = [
    { label: '7.5+', cls: 'bg-emerald-100 dark:bg-emerald-500/25' },
    { label: '6–7.4', cls: 'bg-sky-100 dark:bg-sky-500/25' },
    { label: '4–5.9', cls: 'bg-amber-100 dark:bg-amber-500/25' },
    { label: 'below 4', cls: 'bg-rose-100 dark:bg-rose-500/25' },
];

/**
 * Student × question grid for ONE question type. Audio questions show each
 * student's best AI practice score as a heat map (a dash = never practised,
 * distinct from a real 0). Assignments show the instructor-assessed status.
 */
export function ProgressMatrix({ courseId, type, onSelectStudent }: { courseId: string; type: QuestionType; onSelectStudent: (userId: string) => void }) {
    const [questions, setQuestions] = useState<MatrixQuestion[]>([]);
    const [questionTotal, setQuestionTotal] = useState(0);
    const [students, setStudents] = useState<MatrixStudent[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const q = useDebouncedValue(search.trim());
    const audio = type === 'audio_question';

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await structuredCourseService.progressMatrix(courseId, { q, type, page, limit: PAGE_SIZE });
            setQuestions(res.questions);
            setQuestionTotal(res.questionTotal);
            setStudents(res.data);
            setTotal(res.meta.total);
            setTotalPages(res.meta.totalPages);
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load the grid.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, q, type, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [q, type]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative sm:w-72">
                    <label htmlFor="pm-search" className="sr-only">Search students</label>
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <input id="pm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" className={`${inputCls} pl-9`} />
                </div>
                {audio && (
                    <ul className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400" aria-label="Score colour legend">
                        <li className="font-medium">Best AI score:</li>
                        {LEGEND.map(l => <li key={l.label} className="inline-flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${l.cls}`} aria-hidden="true" />{l.label}</li>)}
                        <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="font-semibold">—</span> not practised</li>
                    </ul>
                )}
            </div>
            {questionTotal > questions.length && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Showing the first {questions.length} of {questionTotal} questions.</p>
            )}

            {error ? (
                <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300">
                    {error} <button type="button" onClick={load} className="underline font-medium">Retry</button>
                </div>
            ) : loading && students.length === 0 ? (
                <div className="space-y-2" aria-busy="true" aria-label="Loading grid">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700/50 animate-pulse" />)}
                </div>
            ) : questions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{audio ? 'This course has no active audio questions.' : 'This course has no active assignments.'}</p>
            ) : students.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{q ? 'No students match your search.' : 'No students have access to this course yet.'}</p>
            ) : (
                <div className={`overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700 ${loading ? 'opacity-60' : ''}`}>
                    <table className="min-w-full text-sm">
                        <caption className="sr-only">{audio ? "Each student's best AI score for every audio question" : "Each student's status for every assignment"}</caption>
                        <thead className="bg-gray-50 dark:bg-gray-900/40 text-left text-xs text-gray-500 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 py-2 px-3 min-w-[12rem]">Student</th>
                                {questions.map((qq, i) => {
                                    const Icon = qq.type === 'audio_question' ? Mic : ClipboardList;
                                    return (
                                        <th key={qq.id} scope="col" className="py-2 px-2 align-bottom min-w-[5rem] max-w-[9rem] font-medium">
                                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400"><Icon className="h-3 w-3" aria-hidden="true" /> Q{i + 1}</span>
                                            <span className="line-clamp-2 normal-case text-gray-700 dark:text-gray-200" title={qq.title}>{qq.title}</span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                            {students.map(s => (
                                <tr key={s.userId} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                                    <th scope="row" className="sticky left-0 z-10 bg-white dark:bg-gray-800 py-2 px-3 text-left font-normal">
                                        <button type="button" onClick={() => onSelectStudent(s.userId)} className="text-left font-medium text-emerald-700 dark:text-emerald-400 hover:underline">{s.name}</button>
                                        {s.email && <div className="max-w-[12rem] truncate text-xs text-gray-400">{s.email}</div>}
                                    </th>
                                    {questions.map(qq => (
                                        <td key={qq.id} className="px-2 py-1.5 align-middle">
                                            {audio ? <ScoreCell cell={s.cells[qq.id]} /> : <StatusCell cell={s.cells[qq.id]} />}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} noun="students" />
        </div>
    );
}

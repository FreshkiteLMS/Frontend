"use client";

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Mic, Search } from 'lucide-react';
import { apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import {
    QUESTION_STATUS_LABELS,
    QUESTION_STATUSES,
    type MatrixCell,
    type MatrixQuestion,
    type MatrixStudent,
    type QuestionStatus,
    type QuestionType,
} from '@/types/structured-questions';
import { STATUS_STYLES, formatDateTime, formatMarks } from '@/lib/question-progress';
import { Pagination } from './Pagination';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 20;
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

// Short labels keep the grid dense; the full label is in the cell's title and sr-only text.
const SHORT: Record<QuestionStatus, string> = {
    NOT_STARTED: 'Not started',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Done',
    PASS: 'Pass',
    FAIL: 'Fail',
};

function Cell({ cell, question }: { cell: MatrixCell | undefined; question: MatrixQuestion }) {
    if (!cell) {
        // No record: the student has never touched this question.
        return (
            <span className="text-gray-300 dark:text-gray-600" title="Not started (no response recorded)">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Not started, no response</span>
            </span>
        );
    }
    const hasScore = cell.marksObtained !== null;
    return (
        <div className="flex flex-col items-start gap-0.5" title={`${QUESTION_STATUS_LABELS[cell.status]} · updated ${formatDateTime(cell.updatedAt)}`}>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[cell.status]}`}>
                {SHORT[cell.status]}
            </span>
            {question.type === 'audio_question' && (
                <span className={`text-[11px] tabular-nums ${hasScore ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
                    {hasScore ? formatMarks(cell.marksObtained!, cell.marksMax) : 'No score'}
                </span>
            )}
        </div>
    );
}

/**
 * Student × question grid with each saved status and audio score — the raw
 * records, not aggregates. A dash means no record exists (never attempted),
 * which is shown differently from a recorded score of 0.
 */
export function ProgressMatrix({ courseId, onSelectStudent }: { courseId: string; onSelectStudent: (userId: string) => void }) {
    const [questions, setQuestions] = useState<MatrixQuestion[]>([]);
    const [questionTotal, setQuestionTotal] = useState(0);
    const [students, setStudents] = useState<MatrixStudent[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [type, setType] = useState<QuestionType | ''>('');
    const [status, setStatus] = useState<QuestionStatus | ''>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const q = useDebouncedValue(search.trim());

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await structuredCourseService.progressMatrix(courseId, { q, type, status, page, limit: PAGE_SIZE });
            setQuestions(res.questions);
            setQuestionTotal(res.questionTotal);
            setStudents(res.data);
            setTotal(res.meta.total);
            setTotalPages(res.meta.totalPages);
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load the progress grid.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, q, type, status, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [q, type, status]);

    const filtered = !!(q || type || status);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                    <label htmlFor="pm-search" className="sr-only">Search students</label>
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input id="pm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" className={`${inputCls} pl-9`} />
                </div>
                <div>
                    <label htmlFor="pm-type" className="sr-only">Question type</label>
                    <select id="pm-type" value={type} onChange={e => setType(e.target.value as QuestionType | '')} className={inputCls}>
                        <option value="">Audio questions &amp; assignments</option>
                        <option value="audio_question">Audio questions only</option>
                        <option value="assignment">Assignments only</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="pm-status" className="sr-only">Students with a question in status</label>
                    <select id="pm-status" value={status} onChange={e => setStatus(e.target.value as QuestionStatus | '')} className={inputCls}>
                        <option value="">Any status</option>
                        {QUESTION_STATUSES.map(s => <option key={s} value={s}>Has {QUESTION_STATUS_LABELS[s].toLowerCase()}</option>)}
                    </select>
                </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
                <span aria-hidden="true" className="font-semibold">—</span> no response recorded · scores are self-assessed by students
                {questionTotal > questions.length && ` · showing the first ${questions.length} of ${questionTotal} questions (filter by type to narrow)`}
            </p>

            {error ? (
                <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300">
                    {error} <button type="button" onClick={load} className="underline font-medium">Retry</button>
                </div>
            ) : loading && students.length === 0 ? (
                <div className="space-y-2" aria-busy="true" aria-label="Loading progress grid">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700/50 animate-pulse" />)}
                </div>
            ) : questions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {type ? 'No active questions of this type.' : 'This course has no active questions or assignments yet.'}
                </p>
            ) : students.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {filtered ? 'No students match these filters.' : 'No students have access to this course yet.'}
                </p>
            ) : (
                <div className={`overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700 ${loading ? 'opacity-60' : ''}`}>
                    <table className="min-w-full text-sm">
                        <caption className="sr-only">Each student&apos;s status and score for every question</caption>
                        <thead className="bg-gray-50 dark:bg-gray-900/40 text-left text-xs text-gray-500 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 py-2 px-3 min-w-[12rem]">Student</th>
                                {questions.map((qq, i) => {
                                    const Icon = qq.type === 'audio_question' ? Mic : ClipboardList;
                                    return (
                                        <th key={qq.id} scope="col" className="py-2 px-3 align-bottom min-w-[8rem] max-w-[12rem] font-medium">
                                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400">
                                                <Icon className="h-3 w-3" aria-hidden="true" /> Q{i + 1}
                                                {qq.maxMarks !== null && <span>· /{formatMarks(qq.maxMarks, null)}</span>}
                                            </span>
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
                                        <button type="button" onClick={() => onSelectStudent(s.userId)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-left">
                                            {s.name}
                                        </button>
                                        {s.email && <div className="text-xs text-gray-400 truncate max-w-[12rem]">{s.email}</div>}
                                    </th>
                                    {questions.map(qq => (
                                        <td key={qq.id} className="py-2 px-3 align-top">
                                            <Cell cell={s.cells[qq.id]} question={qq} />
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

"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, BarChart3, ChevronDown, ChevronUp, Eye, EyeOff, History, Pencil, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import {
    QUESTION_TYPE_LABELS,
    type CourseQuestion,
    type QuestionDifficulty,
    type QuestionImport,
    type QuestionType,
} from '@/types/structured-questions';
import { formatDateTime, formatDueDate } from '@/lib/question-progress';
import { QuestionImportPanel } from './QuestionImportPanel';
import { Pagination } from './Pagination';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 20;
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

type EditDraft = Pick<CourseQuestion, 'type' | 'title' | 'prompt'> & {
    topic: string;
    difficulty: QuestionDifficulty | '';
    expectedDurationMinutes: string;
    resourceUrl: string;
    evaluationCriteria: string;
    dueDate: string;
    maxMarks: string;
    expectedAnswer: string;
    keyConcepts: string;
    answerLanguage: string;
    maxRecordingMinutes: string;
};

function toDraft(q: CourseQuestion): EditDraft {
    return {
        type: q.type,
        title: q.title,
        prompt: q.prompt,
        topic: q.topic ?? '',
        difficulty: q.difficulty ?? '',
        expectedDurationMinutes: q.expectedDurationMinutes != null ? String(q.expectedDurationMinutes) : '',
        resourceUrl: q.resourceUrl ?? '',
        evaluationCriteria: q.evaluationCriteria ?? '',
        dueDate: q.dueDate ?? '',
        maxMarks: q.maxMarks != null ? String(q.maxMarks) : '',
        expectedAnswer: q.expectedAnswer ?? '',
        keyConcepts: (q.keyConcepts ?? []).join('\n'),
        answerLanguage: q.answerLanguage ?? '',
        maxRecordingMinutes: q.maxRecordingMinutes != null ? String(q.maxRecordingMinutes) : '',
    };
}

/**
 * Admin management for a Structured Course's questions: import, search/filter,
 * edit, (de)activate, reorder and import history. Deactivation is a soft
 * toggle — students' historical progress on the question is always kept.
 */
export function QuestionManager({ courseId }: { courseId: string }) {
    const [questions, setQuestions] = useState<CourseQuestion[]>([]);
    const [topics, setTopics] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [type, setType] = useState<QuestionType | ''>('');
    const [topic, setTopic] = useState('');
    const [active, setActive] = useState<'all' | 'true' | 'false'>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<QuestionImport[] | null>(null);
    const q = useDebouncedValue(search.trim());

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await structuredCourseService.listQuestions(courseId, { q, type, topic, active, page, limit: PAGE_SIZE });
            setQuestions(res.data);
            setTotal(res.meta.total);
            setTotalPages(res.meta.totalPages);
            setTopics(res.topics || []);
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load questions.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, q, type, topic, active, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [q, type, topic, active]);

    const loadHistory = useCallback(async () => {
        try {
            const res = await structuredCourseService.listImports(courseId, 1, 20);
            setHistory(res.data);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Failed to load import history.'));
        }
    }, [courseId]);

    useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);

    const onImported = () => {
        load();
        if (showHistory) loadHistory();
    };

    const toggleActive = async (question: CourseQuestion) => {
        if (question.isActive && !window.confirm(`Deactivate “${question.title}”? Students will no longer see it. Their existing progress is kept and the question can be reactivated.`)) return;
        setSavingId(question.id);
        try {
            const updated = await structuredCourseService.setQuestionActive(courseId, question.id, !question.isActive);
            setQuestions(prev => prev.map(x => (x.id === updated.id ? updated : x)));
            toast.success(updated.isActive ? 'Question activated' : 'Question deactivated');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Failed to update the question.'));
        } finally {
            setSavingId(null);
        }
    };

    const move = async (question: CourseQuestion, direction: 'up' | 'down') => {
        setSavingId(question.id);
        try {
            await structuredCourseService.moveQuestion(courseId, question.id, direction);
            await load();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Failed to reorder.'));
        } finally {
            setSavingId(null);
        }
    };

    const startEdit = (question: CourseQuestion) => {
        setEditing(question.id);
        setExpanded(question.id);
        setDraft(toDraft(question));
    };

    const saveEdit = async (question: CourseQuestion) => {
        if (!draft) return;
        setSavingId(question.id);
        try {
            const updated = await structuredCourseService.updateQuestion(courseId, question.id, {
                type: draft.type,
                title: draft.title,
                prompt: draft.prompt,
                topic: draft.topic || null,
                difficulty: (draft.difficulty || null) as QuestionDifficulty | null,
                expectedDurationMinutes: draft.expectedDurationMinutes ? Number(draft.expectedDurationMinutes) : null,
                resourceUrl: draft.resourceUrl || null,
                evaluationCriteria: draft.evaluationCriteria || null,
                dueDate: draft.dueDate || null,
                // Only audio questions carry marks; empty falls back to the default (10).
                maxMarks: draft.type === 'audio_question' && draft.maxMarks ? Number(draft.maxMarks) : null,
                expectedAnswer: draft.expectedAnswer.trim() || null,
                keyConcepts: draft.keyConcepts.split(/[\n;]+/).map(x => x.trim()).filter(Boolean),
                answerLanguage: draft.answerLanguage.trim() || null,
                maxRecordingMinutes: draft.type === 'audio_question' && draft.maxRecordingMinutes ? Number(draft.maxRecordingMinutes) : null,
            });
            setQuestions(prev => prev.map(x => (x.id === updated.id ? updated : x)));
            setEditing(null);
            setDraft(null);
            toast.success('Question saved');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Failed to save the question.'));
        } finally {
            setSavingId(null);
        }
    };

    const reorderDisabled = !!(q || type || topic || active !== 'all');

    return (
        <section aria-labelledby="question-manager-heading" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 id="question-manager-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
                    Questions &amp; Assignments
                </h3>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowHistory(v => !v)}
                        aria-expanded={showHistory}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <History className="w-4 h-4" aria-hidden="true" /> Import history
                    </button>
                    <Link
                        href={`/admin/courses/${courseId}/question-progress`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        <BarChart3 className="w-4 h-4" aria-hidden="true" /> Student progress
                    </Link>
                </div>
            </div>

            <QuestionImportPanel courseId={courseId} onImported={onImported} />

            {showHistory && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Import history</h4>
                    {history === null ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No imports yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="py-2 pr-4">When</th>
                                        <th scope="col" className="py-2 pr-4">Source</th>
                                        <th scope="col" className="py-2 pr-4">Status</th>
                                        <th scope="col" className="py-2 pr-4">Rows</th>
                                        <th scope="col" className="py-2 pr-4">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                    {history.map(h => (
                                        <tr key={h.id}>
                                            <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(h.createdAt)}</td>
                                            <td className="py-2 pr-4 max-w-[16rem] truncate" title={h.sourceRef}>
                                                {h.sourceType === 'google_sheet' ? 'Google Sheet' : 'File'} · {h.sourceRef}
                                            </td>
                                            <td className="py-2 pr-4 capitalize">{h.status}{h.failureMessage ? ` — ${h.failureMessage}` : ''}</td>
                                            <td className="py-2 pr-4 whitespace-nowrap">
                                                {h.summary.valid_rows} valid / {h.summary.invalid_rows + h.summary.duplicate_rows} rejected
                                            </td>
                                            <td className="py-2 pr-4 whitespace-nowrap">
                                                {h.result ? `${h.result.inserted} new, ${h.result.updated} updated` : 'Not applied'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="relative">
                        <label htmlFor="qm-search" className="sr-only">Search questions</label>
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="qm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, prompt, topic or ID" className={`${inputCls} pl-9`} />
                    </div>
                    <div>
                        <label htmlFor="qm-type" className="sr-only">Question type</label>
                        <select id="qm-type" value={type} onChange={e => setType(e.target.value as QuestionType | '')} className={inputCls}>
                            <option value="">All types</option>
                            <option value="audio_question">Audio questions</option>
                            <option value="assignment">Assignments</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="qm-topic" className="sr-only">Topic</label>
                        <select id="qm-topic" value={topic} onChange={e => setTopic(e.target.value)} className={inputCls}>
                            <option value="">All topics</option>
                            {topics.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="qm-active" className="sr-only">Visibility</label>
                        <select id="qm-active" value={active} onChange={e => setActive(e.target.value as 'all' | 'true' | 'false')} className={inputCls}>
                            <option value="all">Active and inactive</option>
                            <option value="true">Active only</option>
                            <option value="false">Inactive only</option>
                        </select>
                    </div>
                </div>

                {error ? (
                    <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300">
                        {error} <button type="button" onClick={load} className="underline font-medium">Retry</button>
                    </div>
                ) : loading && questions.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">Loading questions…</p>
                ) : questions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                        {q || type || topic || active !== 'all' ? 'No questions match these filters.' : 'No questions yet — import a spreadsheet above.'}
                    </p>
                ) : (
                    <ul className={`divide-y divide-gray-100 dark:divide-gray-700 ${loading ? 'opacity-60' : ''}`}>
                        {questions.map((question, idx) => {
                            const isOpen = expanded === question.id;
                            const isEditing = editing === question.id && draft;
                            const absoluteIndex = (page - 1) * PAGE_SIZE + idx;
                            return (
                                <li key={question.id} className="py-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col">
                                            <button type="button" aria-label={`Move “${question.title}” up`} disabled={reorderDisabled || absoluteIndex === 0 || savingId !== null} onClick={() => move(question, 'up')} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30">
                                                <ArrowUp className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                            <button type="button" aria-label={`Move “${question.title}” down`} disabled={reorderDisabled || absoluteIndex >= total - 1 || savingId !== null} onClick={() => move(question, 'down')} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30">
                                                <ArrowDown className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(isOpen ? null : question.id)}
                                            aria-expanded={isOpen}
                                            className="flex-1 min-w-0 text-left"
                                        >
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200">{QUESTION_TYPE_LABELS[question.type]}</span>
                                                {!question.isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Inactive</span>}
                                                <span className="font-mono text-[11px] text-gray-400">{question.externalId}</span>
                                            </div>
                                            <p className="font-medium text-gray-900 dark:text-white">{question.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {[question.topic, question.difficulty, question.expectedDurationMinutes ? `${question.expectedDurationMinutes} min` : null, question.dueDate ? `due ${formatDueDate(question.dueDate)}` : null, question.maxMarks != null ? `out of ${question.maxMarks} marks` : null].filter(Boolean).join(' · ') || 'No metadata'}
                                            </p>
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => startEdit(question)} className="p-2 text-gray-500 hover:text-blue-600" aria-label={`Edit “${question.title}”`}>
                                                <Pencil className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleActive(question)}
                                                disabled={savingId === question.id}
                                                className="p-2 text-gray-500 hover:text-amber-600 disabled:opacity-40"
                                                aria-label={question.isActive ? `Deactivate “${question.title}”` : `Activate “${question.title}”`}
                                                title={question.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {question.isActive ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                                            </button>
                                            <span className="p-2 text-gray-400" aria-hidden="true">{isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                                        </div>
                                    </div>

                                    {isOpen && !isEditing && (
                                        <div className="mt-3 ml-10 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                            <p className="whitespace-pre-wrap">{question.prompt}</p>
                                            {question.evaluationCriteria && (
                                                <p className="whitespace-pre-wrap"><strong>Evaluation criteria:</strong> {question.evaluationCriteria}</p>
                                            )}
                                            {question.resourceUrl && (
                                                <p><a href={question.resourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline break-all">{question.resourceUrl}</a></p>
                                            )}
                                            <p className="text-xs text-gray-400">Updated {formatDateTime(question.updatedAt)}</p>
                                        </div>
                                    )}

                                    {isEditing && draft && (
                                        <form
                                            className="mt-3 ml-10 grid grid-cols-1 sm:grid-cols-2 gap-3"
                                            onSubmit={e => { e.preventDefault(); saveEdit(question); }}
                                        >
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Type
                                                <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as QuestionType })} className={inputCls}>
                                                    <option value="audio_question">Audio question</option>
                                                    <option value="assignment">Assignment</option>
                                                </select>
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Difficulty
                                                <select value={draft.difficulty} onChange={e => setDraft({ ...draft, difficulty: e.target.value as QuestionDifficulty | '' })} className={inputCls}>
                                                    <option value="">—</option>
                                                    <option value="beginner">Beginner</option>
                                                    <option value="intermediate">Intermediate</option>
                                                    <option value="advanced">Advanced</option>
                                                </select>
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">Title
                                                <input required maxLength={300} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">Prompt / instructions
                                                <textarea required maxLength={10000} rows={4} value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} className={inputCls} />
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Topic
                                                <input maxLength={120} value={draft.topic} onChange={e => setDraft({ ...draft, topic: e.target.value })} className={inputCls} />
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Expected duration (minutes)
                                                <input type="number" min={1} max={10080} value={draft.expectedDurationMinutes} onChange={e => setDraft({ ...draft, expectedDurationMinutes: e.target.value })} className={inputCls} />
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Resource URL
                                                <input type="url" value={draft.resourceUrl} onChange={e => setDraft({ ...draft, resourceUrl: e.target.value })} className={inputCls} />
                                            </label>
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Due date
                                                <input type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} className={inputCls} />
                                            </label>
                                            {draft.type === 'audio_question' && (
                                                <label className="text-xs text-gray-600 dark:text-gray-400">Maximum marks
                                                    <input type="number" min={0.01} max={1000} step="any" placeholder="10" value={draft.maxMarks} onChange={e => setDraft({ ...draft, maxMarks: e.target.value })} className={inputCls} />
                                                    <span className="mt-1 block text-[11px] text-gray-400">Students score themselves out of this. Leave empty for 10.</span>
                                                </label>
                                            )}
                                            <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">Evaluation criteria
                                                <textarea maxLength={5000} rows={3} value={draft.evaluationCriteria} onChange={e => setDraft({ ...draft, evaluationCriteria: e.target.value })} className={inputCls} />
                                            </label>
                                            {draft.type === 'audio_question' && (
                                                <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-3">
                                                    <legend className="px-1 text-xs font-semibold text-gray-700 dark:text-gray-300">AI speaking assessment (optional)</legend>
                                                    <p className="sm:col-span-2 text-[11px] text-gray-500 dark:text-gray-400">
                                                        Used only by the AI evaluator. Students never see the reference answer or key concepts. Without them, answers are judged with general domain knowledge at lower confidence.
                                                    </p>
                                                    <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">Reference answer
                                                        <textarea maxLength={10000} rows={4} value={draft.expectedAnswer} onChange={e => setDraft({ ...draft, expectedAnswer: e.target.value })} className={inputCls} />
                                                    </label>
                                                    <label className="text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">Key concepts <span className="text-gray-400">(one per line)</span>
                                                        <textarea rows={3} value={draft.keyConcepts} onChange={e => setDraft({ ...draft, keyConcepts: e.target.value })} className={inputCls} />
                                                    </label>
                                                    <label className="text-xs text-gray-600 dark:text-gray-400">Answer language
                                                        <input maxLength={16} placeholder="e.g. en" value={draft.answerLanguage} onChange={e => setDraft({ ...draft, answerLanguage: e.target.value })} className={inputCls} />
                                                    </label>
                                                    <label className="text-xs text-gray-600 dark:text-gray-400">Max recording (minutes)
                                                        <input type="number" min={1} max={15} placeholder="10" value={draft.maxRecordingMinutes} onChange={e => setDraft({ ...draft, maxRecordingMinutes: e.target.value })} className={inputCls} />
                                                    </label>
                                                </fieldset>
                                            )}
                                            <div className="sm:col-span-2 flex justify-end gap-2">
                                                <button type="button" onClick={() => { setEditing(null); setDraft(null); }} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
                                                <button type="submit" disabled={savingId === question.id} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                                                    {savingId === question.id ? 'Saving…' : 'Save'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {reorderDisabled && questions.length > 0 && (
                    <p className="mt-2 text-xs text-gray-400">Clear search and filters to reorder questions.</p>
                )}
                <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} noun="questions" />
            </div>
        </section>
    );
}

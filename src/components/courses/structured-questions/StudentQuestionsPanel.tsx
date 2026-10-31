"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, ChevronDown, ClipboardList, Clock, ExternalLink, Mic, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorCode, apiErrorDetails, apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import {
    QUESTION_STATUS_LABELS,
    QUESTION_STATUSES,
    QUESTION_TYPE_LABELS,
    type MySummary,
    type QuestionProgress,
    type QuestionStatus,
    type QuestionType,
    type StudentQuestion,
} from '@/types/structured-questions';
import { formatDateTime, formatDueDate, isOverdue, percent, studentActions } from '@/lib/question-progress';
import { QuestionStatusBadge } from './QuestionStatusBadge';
import { AudioQuestionCard } from './AudioQuestionCard';
import { StatusStepper } from './StatusStepper';
import { Pagination } from './Pagination';
import { useDebouncedValue } from './useDebouncedValue';
import { speakingService } from '@/services/api/speaking.api';
import type { SpeakingSummary } from '@/types/speaking';
import { PracticeSummary } from '../speaking/PracticeSummary';
import { SpeakingPractice } from '../speaking/SpeakingPractice';

const PAGE_SIZE = 15;
const FILTER_KEY = (courseId: string) => `sq-filters:${courseId}`;
const SAVED_FLASH_MS = 2000;
const PRACTICE_KEY = (courseId: string) => `sq-practice:${courseId}`;

interface Filters { search: string; type: QuestionType | ''; topic: string; status: QuestionStatus | ''; sort: 'order' | 'title' | 'status' }
const DEFAULT_FILTERS: Filters = { search: '', type: '', topic: '', status: '', sort: 'order' };

function readFilters(courseId: string): Filters {
    try {
        const raw = sessionStorage.getItem(FILTER_KEY(courseId));
        return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
    } catch {
        return DEFAULT_FILTERS;
    }
}

// Stacked bar segments, in reading order. Colour is always paired with the legend text.
const BAR: { status: QuestionStatus; cls: string }[] = [
    { status: 'PASS', cls: 'bg-green-500' },
    { status: 'COMPLETED', cls: 'bg-blue-500' },
    { status: 'FAIL', cls: 'bg-red-500' },
    { status: 'IN_PROGRESS', cls: 'bg-amber-400' },
];

function ProgressOverview({ summary }: { summary: MySummary }) {
    const { overall } = summary;
    const total = overall.total;
    return (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Your progress</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {percent(overall.percentFinished)}
                        <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">{overall.finished} of {total} finished</span>
                    </p>
                </div>
                <div className="flex gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Mic className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                        Audio {summary.byType.audio_question.finished}/{summary.byType.audio_question.total}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <ClipboardList className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                        Assignments {summary.byType.assignment.finished}/{summary.byType.assignment.total}
                    </span>
                </div>
            </div>
            <div
                className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                role="progressbar"
                aria-valuenow={Math.round(overall.percentFinished)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Questions finished"
            >
                {total > 0 && BAR.map(({ status, cls }) => {
                    const n = overall.counts[status];
                    return n > 0 ? <div key={status} className={`${cls} h-full transition-all`} style={{ width: `${(n / total) * 100}%` }} /> : null;
                })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                {[...BAR, { status: 'NOT_STARTED' as QuestionStatus, cls: 'bg-gray-300 dark:bg-gray-600' }].map(({ status, cls }) => (
                    <li key={status} className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${cls}`} aria-hidden="true" />
                        {QUESTION_STATUS_LABELS[status]} <strong className="text-gray-700 dark:text-gray-200">{overall.counts[status]}</strong>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Student view of a Structured Course's questions and assignments.
 *
 * Status changes are confirmed by the server before the UI changes (no
 * optimistic updates). A per-question in-flight guard (a ref, so it blocks
 * synchronously) prevents double clicks from sending duplicate requests;
 * different questions can still be updated independently.
 */
export function StudentQuestionsPanel({ courseId, readOnly = false }: { courseId: string; readOnly?: boolean }) {
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<StudentQuestion[]>([]);
    const [topics, setTopics] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [summary, setSummary] = useState<MySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [pending, setPending] = useState<Set<string>>(new Set());
    const [savedFlash, setSavedFlash] = useState<Record<string, string>>({});
    const inFlight = useRef<Set<string>>(new Set());
    const hydrated = useRef(false);
    const q = useDebouncedValue(filters.search.trim());
    const [speaking, setSpeaking] = useState<SpeakingSummary | null>(null);
    // The audio question open in the practice view (restored after a refresh).
    const [practicing, setPracticing] = useState<StudentQuestion | null>(null);
    const [openLatest, setOpenLatest] = useState(false);

    useEffect(() => {
        setFilters(readFilters(courseId));
        hydrated.current = true;
    }, [courseId]);
    useEffect(() => {
        if (!hydrated.current) return;
        try { sessionStorage.setItem(FILTER_KEY(courseId), JSON.stringify(filters)); } catch { /* storage unavailable */ }
    }, [courseId, filters]);

    const loadSummary = useCallback(async () => {
        try {
            setSummary(await structuredCourseService.mySummary(courseId));
        } catch {
            // The list below surfaces access errors; the summary is supplementary.
        }
    }, [courseId]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await structuredCourseService.myQuestions(courseId, {
                q, type: filters.type, topic: filters.topic, status: filters.status, sort: filters.sort, page, limit: PAGE_SIZE,
            });
            setItems(res.data);
            setTotal(res.meta.total);
            setTotalPages(res.meta.totalPages);
            setTopics(res.topics || []);
        } catch (err) {
            setError(apiErrorMessage(err, 'Failed to load questions.'));
        } finally {
            setLoading(false);
        }
    }, [courseId, q, filters.type, filters.topic, filters.status, filters.sort, page]);

    const loadSpeaking = useCallback(async () => {
        try {
            setSpeaking(await speakingService.summary(courseId));
        } catch {
            // Supplementary: the question list still works without practice stats.
        }
    }, [courseId]);

    const openPractice = useCallback(async (questionId: string, latestReport = false) => {
        try {
            const found = items.find(x => x.id === questionId) ?? await structuredCourseService.myQuestion(courseId, questionId);
            setOpenLatest(latestReport);
            setPracticing(found);
            try { sessionStorage.setItem(PRACTICE_KEY(courseId), questionId); } catch { /* storage unavailable */ }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not open this question.'));
        }
    }, [courseId, items]);

    const closePractice = () => {
        setPracticing(null);
        try { sessionStorage.removeItem(PRACTICE_KEY(courseId)); } catch { /* storage unavailable */ }
        load();
        loadSummary();
        loadSpeaking();
    };

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { loadSpeaking(); }, [loadSpeaking]);
    useEffect(() => {
        let id: string | null = null;
        try { id = sessionStorage.getItem(PRACTICE_KEY(courseId)); } catch { /* storage unavailable */ }
        if (!id) return;
        structuredCourseService.myQuestion(courseId, id).then(setPracticing, () => {
            try { sessionStorage.removeItem(PRACTICE_KEY(courseId)); } catch { /* storage unavailable */ }
        });
    }, [courseId]);
    useEffect(() => { setPage(1); }, [q, filters.type, filters.topic, filters.status, filters.sort]);

    const applyProgress = (questionId: string, progress: Partial<QuestionProgress>) =>
        setItems(prev => prev.map(x => (x.id === questionId ? { ...x, progress: { ...x.progress, ...progress } } : x)));

    const flashSaved = (questionId: string, text: string) => {
        setSavedFlash(prev => ({ ...prev, [questionId]: text }));
        setTimeout(() => setSavedFlash(prev => {
            const next = { ...prev };
            delete next[questionId];
            return next;
        }), SAVED_FLASH_MS);
    };

    const updateStatus = async (question: StudentQuestion, status: QuestionStatus) => {
        if (readOnly || inFlight.current.has(question.id)) return;
        inFlight.current.add(question.id);
        setPending(prev => new Set(prev).add(question.id));
        try {
            const res = await structuredCourseService.setMyStatus(courseId, question.id, status, question.progress.version);
            applyProgress(question.id, res);
            flashSaved(question.id, `Saved as ${QUESTION_STATUS_LABELS[res.status].toLowerCase()}`);
            loadSummary();
            if (filters.status && filters.status !== res.status) load();
        } catch (err) {
            const latest = apiErrorDetails<{ progress?: QuestionProgress }>(err)?.progress;
            if (apiErrorCode(err) === 'VERSION_CONFLICT' && latest) {
                applyProgress(question.id, latest);
                loadSummary();
                toast(apiErrorMessage(err, 'This question changed elsewhere. The latest status is now shown.'), { icon: 'ℹ️' });
            } else {
                if (latest) applyProgress(question.id, latest);
                toast.error(apiErrorMessage(err, 'Could not save the status. Nothing was changed — please try again.'));
            }
        } finally {
            inFlight.current.delete(question.id);
            setPending(prev => {
                const next = new Set(prev);
                next.delete(question.id);
                return next;
            });
        }
    };

    const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters(prev => ({ ...prev, [key]: value }));
    const toggle = (id: string) => setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const hasFilters = !!(q || filters.type || filters.topic || filters.status);

    const typeTabs: { id: QuestionType | ''; label: string; count?: number }[] = [
        { id: '', label: 'All', count: summary?.overall.total },
        { id: 'audio_question', label: 'Audio questions', count: summary?.byType.audio_question.total },
        { id: 'assignment', label: 'Assignments', count: summary?.byType.assignment.total },
    ];

    if (practicing) {
        return (
            <SpeakingPractice
                courseId={courseId}
                question={practicing}
                readOnly={readOnly}
                openLatest={openLatest}
                onBack={closePractice}
                onChanged={loadSpeaking}
            />
        );
    }

    return (
        <section aria-labelledby="sq-heading" className="space-y-6">
            <header>
                <h2 id="sq-heading" className="text-2xl font-bold text-gray-900 dark:text-white">Questions &amp; Assignments</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Record spoken answers to the audio questions and get instant AI feedback, then work through the assignments.
                    Move each one from <em>Not started</em> to <em>In progress</em> to <em>Completed</em> — your instructor records pass/fail.
                </p>
            </header>

            {summary && <ProgressOverview summary={summary} />}
            {speaking && <PracticeSummary summary={speaking} onOpenQuestion={id => void openPractice(id)} />}

            <div className="space-y-3">
                <div role="tablist" aria-label="Question type" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
                    {typeTabs.map(t => {
                        const active = filters.type === t.id;
                        return (
                            <button
                                key={t.id || 'all'}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => set('type', t.id)}
                                className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    active
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                {t.label}
                                {t.count !== undefined && (
                                    <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">{t.count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <label htmlFor="sq-search" className="sr-only">Search questions</label>
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input
                            id="sq-search"
                            value={filters.search}
                            onChange={e => set('search', e.target.value)}
                            placeholder="Search questions and assignments"
                            className="w-full pl-9 pr-9 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                        {filters.search && (
                            <button type="button" onClick={() => set('search', '')} aria-label="Clear search" className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:flex">
                        <div>
                            <label htmlFor="sq-topic" className="sr-only">Topic</label>
                            <select id="sq-topic" value={filters.topic} onChange={e => set('topic', e.target.value)} className="w-full lg:w-48 px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm">
                                <option value="">All topics</option>
                                {topics.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="sq-sort" className="sr-only">Sort</label>
                            <select id="sq-sort" value={filters.sort} onChange={e => set('sort', e.target.value as Filters['sort'])} className="w-full lg:w-44 px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm">
                                <option value="order">Sort: course order</option>
                                <option value="title">Sort: title</option>
                                <option value="status">Sort: status</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
                    {(['', ...QUESTION_STATUSES] as (QuestionStatus | '')[]).map(s => {
                        const active = filters.status === s;
                        return (
                            <button
                                key={s || 'any'}
                                type="button"
                                aria-pressed={active}
                                onClick={() => set('status', s)}
                                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                                    active
                                        ? 'bg-blue-600 text-white ring-blue-600'
                                        : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800'
                                }`}
                            >
                                {s ? QUESTION_STATUS_LABELS[s] : 'Any status'}
                                {s && summary ? ` · ${summary.overall.counts[s]}` : ''}
                            </button>
                        );
                    })}
                    {hasFilters && (
                        <button type="button" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })} className="px-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {error ? (
                <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300">
                    {error} <button type="button" onClick={load} className="underline font-medium">Retry</button>
                </div>
            ) : loading && items.length === 0 ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading questions">
                    {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters ? (
                        <>No questions match these filters. <button type="button" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })} className="font-medium text-blue-600 dark:text-blue-400 underline">Clear filters</button></>
                    ) : 'This course has no questions or assignments yet.'}
                </div>
            ) : (
                <ul className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                    {items.map((question, idx) => {
                        const number = (page - 1) * PAGE_SIZE + idx + 1;
                        // Audio questions are practice-first: status and score come from the
                        // student's AI practice, so there is nothing to tick or type.
                        if (question.type === 'audio_question') {
                            return (
                                <AudioQuestionCard
                                    key={question.id}
                                    question={question}
                                    number={number}
                                    practice={speaking?.byQuestion[question.id]}
                                    readOnly={readOnly}
                                    onOpen={latest => void openPractice(question.id, latest)}
                                />
                            );
                        }
                        const isOpen = expanded.has(question.id);
                        const isPending = pending.has(question.id);
                        const allowed = studentActions(question.progress.status, question.progress.allowedStudentStatuses).map(a => a.status);
                        const done = ['COMPLETED', 'PASS', 'FAIL'].includes(question.progress.status);
                        const overdue = isOverdue(question.dueDate) && !done;
                        const detailId = `sq-detail-${question.id}`;
                        return (
                            <li
                                key={question.id}
                                className={`rounded-xl border bg-white dark:bg-gray-900 transition-colors ${
                                    question.progress.status === 'PASS'
                                        ? 'border-green-200 dark:border-green-900/60'
                                        : question.progress.status === 'FAIL'
                                        ? 'border-red-200 dark:border-red-900/60'
                                        : 'border-gray-100 dark:border-gray-800'
                                }`}
                            >
                                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                                    <button
                                        type="button"
                                        onClick={() => toggle(question.id)}
                                        aria-expanded={isOpen}
                                        aria-controls={detailId}
                                        className="flex flex-1 min-w-0 items-start gap-3 text-left"
                                    >
                                        <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${done ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300'}`}>
                                            {done ? <Check className="h-5 w-5" aria-hidden="true" /> : <ClipboardList className="h-5 w-5" aria-hidden="true" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                {number}. {QUESTION_TYPE_LABELS[question.type]}{question.topic ? ` · ${question.topic}` : ''}{question.difficulty ? ` · ${question.difficulty}` : ''}
                                            </span>
                                            <span className="block font-semibold text-gray-900 dark:text-white">{question.title}</span>
                                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                {question.expectedDurationMinutes && (
                                                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{question.expectedDurationMinutes} min</span>
                                                )}
                                                {question.dueDate && (
                                                    <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                                                        <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />Due {formatDueDate(question.dueDate)}{overdue ? ' (overdue)' : ''}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                    {isOpen ? 'Hide details' : 'View details'}
                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                                </span>
                                            </span>
                                        </span>
                                    </button>

                                    <div className="flex flex-col items-stretch gap-1 md:items-end">
                                        {readOnly ? (
                                            <QuestionStatusBadge status={question.progress.status} />
                                        ) : (
                                            <StatusStepper
                                                status={question.progress.status}
                                                allowed={allowed}
                                                busy={isPending}
                                                onChange={s => updateStatus(question, s)}
                                                label={`Status of “${question.title}”`}
                                            />
                                        )}
                                        <span className="min-h-[1rem] text-[11px] text-gray-400" aria-live="polite">
                                            {isPending ? 'Saving…' : savedFlash[question.id] ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"><Check className="w-3 h-3" aria-hidden="true" />{savedFlash[question.id]}</span>
                                            ) : question.progress.updatedAt ? `Updated ${formatDateTime(question.progress.updatedAt)}` : ''}
                                        </span>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div id={detailId} className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 md:pl-16 space-y-4 text-sm text-gray-700 dark:text-gray-300">
                                        <div>
                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Instructions</h3>
                                            <p className="whitespace-pre-wrap leading-relaxed">{question.prompt}</p>
                                        </div>
                                        {question.evaluationCriteria && (
                                            <div>
                                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Requirements &amp; acceptance criteria</h3>
                                                <p className="whitespace-pre-wrap leading-relaxed">{question.evaluationCriteria}</p>
                                            </div>
                                        )}
                                        {question.resourceUrl && (
                                            <a href={question.resourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-blue-600 dark:text-blue-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <ExternalLink className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> Open resource
                                            </a>
                                        )}
                                        {question.progress.assessmentNotes && (
                                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Instructor feedback</h3>
                                                <p className="whitespace-pre-wrap">{question.progress.assessmentNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <Pagination page={page} totalPages={totalPages} total={total} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} noun="questions" />
        </section>
    );
}

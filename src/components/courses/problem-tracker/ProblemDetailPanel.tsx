"use client";

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Code2, ExternalLink, FileText, Lock, Mic, PlayCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { problemCourseService } from '@/services/api/problem-course.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { ProblemDetail, ProblemPanelTab, TrackerProblem } from '@/types/problem-course';
import { DifficultyBadge } from './DifficultyBadge';
import { VideoSolutionPlayer } from './VideoSolutionPlayer';
import { ProblemLogicPractice } from './ProblemLogicPractice';

const TABS: { id: ProblemPanelTab; label: string; Icon: typeof FileText }[] = [
    { id: 'problem', label: 'Problem', Icon: FileText },
    { id: 'video', label: 'Video solution', Icon: PlayCircle },
    { id: 'explain', label: 'Explain your approach', Icon: Mic },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
            <div className="mt-1.5 text-sm text-gray-800 dark:text-gray-200">{children}</div>
        </section>
    );
}

/**
 * One problem in a dialog over the tracker: statement, multilingual video
 * solutions and the AI logic assessment, in tabs so nothing is crowded.
 * Previous/next move through the visible problems without leaving the page.
 */
export function ProblemDetailPanel({
    courseId,
    problem,
    tab,
    onTabChange,
    onClose,
    onPrev,
    onNext,
}: {
    courseId: string;
    problem: TrackerProblem;
    tab: ProblemPanelTab;
    onTabChange: (tab: ProblemPanelTab) => void;
    onClose: () => void;
    onPrev: (() => void) | null;
    onNext: (() => void) | null;
}) {
    const [detail, setDetail] = useState<ProblemDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [denied, setDenied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setDetail(null);
        setError(null);
        setDenied(false);
        problemCourseService.getProblem(courseId, problem.id)
            .then(d => { if (!cancelled) setDetail(d); })
            .catch(err => {
                if (cancelled) return;
                if (err?.response?.status === 404) setDenied(true);
                else setError(apiErrorMessage(err, 'Could not load this problem.'));
            });
        return () => { cancelled = true; };
    }, [courseId, problem.id]);

    const st = detail?.statement;
    const hasStatement = !!(st && (st.description || st.constraints || st.examples.length));
    const videoCount = detail ? detail.videoSolutions.length || (detail.legacyVideoUrl ? 1 : 0) : problem.videoLanguages?.length ?? 0;

    return (
        <Modal
            open
            onClose={onClose}
            size="2xl"
            bodyClassName="p-0"
            title={problem.title}
            description={
                <span className="flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    {detail?.section.title && <span>{detail.section.title}</span>}
                    {problem.tags.slice(0, 3).map(t => <span key={t} className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[11px]">{t}</span>)}
                </span>
            }
            footer={
                <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                    </button>
                    {problem.problemUrl && (
                        <a href={problem.problemUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                            <Code2 className="h-4 w-4" aria-hidden="true" /> Solve
                        </a>
                    )}
                    <button type="button" onClick={onNext ?? undefined} disabled={!onNext} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
                        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            }
        >
            <div role="tablist" aria-label="Problem sections" className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 pt-2">
                {TABS.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        id={`ptab-${id}`}
                        role="tab"
                        type="button"
                        aria-selected={tab === id}
                        aria-controls={`ppanel-${id}`}
                        onClick={() => onTabChange(id)}
                        className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${tab === id ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />{label}
                        {id === 'video' && videoCount > 1 && <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 text-[10px]">{videoCount}</span>}
                    </button>
                ))}
            </div>

            <div id={`ppanel-${tab}`} role="tabpanel" aria-labelledby={`ptab-${tab}`} className="p-5">
                {denied ? (
                    <div className="flex flex-col items-center py-10 text-center">
                        <Lock className="h-8 w-8 text-gray-300" aria-hidden="true" />
                        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enroll in this course to see problem details, video solutions and AI feedback.</p>
                    </div>
                ) : error ? (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : !detail ? (
                    <div className="space-y-3" aria-busy="true" aria-label="Loading">
                        <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                ) : tab === 'problem' ? (
                    <div className="space-y-5">
                        {hasStatement ? (
                            <>
                                {st!.description && <Block title="Problem"><p className="whitespace-pre-wrap leading-relaxed">{st!.description}</p></Block>}
                                {st!.examples.map((ex, i) => (
                                    <Block key={i} title={`Example ${i + 1}`}>
                                        <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3 font-mono text-[13px]">
                                            {ex.input && <><strong>Input:</strong> {ex.input}{'\n'}</>}
                                            {ex.output && <><strong>Output:</strong> {ex.output}</>}
                                        </pre>
                                        {ex.explanation && <p className="mt-1.5 text-gray-600 dark:text-gray-400">{ex.explanation}</p>}
                                    </Block>
                                ))}
                                {st!.constraints && <Block title="Constraints"><p className="whitespace-pre-wrap font-mono text-[13px]">{st!.constraints}</p></Block>}
                            </>
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                The full statement for this problem is on its practice page.
                                {problem.problemUrl && <> <a href={problem.problemUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Open the problem <ExternalLink className="inline h-3.5 w-3.5" aria-hidden="true" /></a></>}
                            </p>
                        )}
                        {(st?.solution_approach || st?.time_complexity || st?.space_complexity || detail.solutionUrl) && (
                            <details className="group rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                                <summary className="cursor-pointer list-none text-sm font-semibold text-gray-700 dark:text-gray-300">Show the solution approach <span className="text-xs font-normal text-gray-400">(try explaining yours first)</span></summary>
                                {st?.solution_approach && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{st.solution_approach}</p>}
                                {(st?.time_complexity || st?.space_complexity) && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Time: <strong>{st.time_complexity || '—'}</strong> · Space: <strong>{st.space_complexity || '—'}</strong></p>
                                )}
                                {detail.solutionUrl && <a href={detail.solutionUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Written solution <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
                            </details>
                        )}
                    </div>
                ) : tab === 'video' ? (
                    <VideoSolutionPlayer key={detail.id} videos={detail.videoSolutions} legacyUrl={detail.legacyVideoUrl} problemTitle={detail.title} />
                ) : (
                    <ProblemLogicPractice key={detail.id} courseId={courseId} problemId={detail.id} problemTitle={detail.title} />
                )}
            </div>
        </Modal>
    );
}

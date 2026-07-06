import { memo } from 'react';
import { CheckCircle2, XCircle, CircleDot, Circle, BookOpen, Youtube, Code2 } from 'lucide-react';
import type { TrackerProblem, ProblemStatus } from '@/types/problem-course';
import { DifficultyBadge } from './DifficultyBadge';
import { StatusDropdown } from './StatusDropdown';

/** Fixed row height — shared with the virtualizer so windowing math stays exact. */
export const ROW_HEIGHT = 64;

function StatusIcon({ status }: { status: ProblemStatus }) {
    switch (status) {
        case 'pass':
            return <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />;
        case 'completed':
            return <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />;
        case 'fail':
            return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
        case 'try':
            return <CircleDot className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
        default:
            return <Circle className="h-5 w-5 text-gray-300 dark:text-slate-600" />;
    }
}

interface ProblemRowProps {
    problem: TrackerProblem;
    busy?: boolean;
    onStatusChange: (problemId: string, status: ProblemStatus) => void;
}

function ProblemRowInner({ problem, busy, onStatusChange }: ProblemRowProps) {
    const { title, difficulty, solutionUrl, videoUrl, problemUrl, tags, externalId, userStatus } = problem;

    return (
        <div
            style={{ height: ROW_HEIGHT }}
            className="group flex items-center gap-3 border-b border-gray-100 px-3 transition-colors hover:bg-gray-50 sm:px-4 dark:border-slate-800/70 dark:hover:bg-slate-800/30"
        >
            {/* completion state */}
            <div className="flex-shrink-0" title={userStatus}>
                <StatusIcon status={userStatus} />
            </div>

            {/* optional sheet index */}
            {externalId && (
                <span className="hidden w-8 flex-shrink-0 text-right text-xs tabular-nums text-gray-400 sm:block dark:text-slate-500">
                    {externalId}
                </span>
            )}

            {/* title + tags */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100" title={title}>
                    {title}
                </p>
                {tags.length > 0 && (
                    <div className="mt-0.5 hidden items-center gap-1 lg:flex">
                        {tags.slice(0, 3).map(tag => (
                            <span
                                key={tag}
                                className="truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                            >
                                {tag}
                            </span>
                        ))}
                        {tags.length > 3 && <span className="text-[10px] text-gray-400 dark:text-slate-500">+{tags.length - 3}</span>}
                    </div>
                )}
            </div>

            {/* difficulty */}
            <div className="hidden w-16 flex-shrink-0 sm:flex sm:justify-center">
                <DifficultyBadge difficulty={difficulty} />
            </div>

            {/* status */}
            <div className="flex w-28 flex-shrink-0 justify-center">
                <StatusDropdown value={userStatus} onChange={s => onStatusChange(problem.id, s)} busy={busy} />
            </div>

            {/* actions */}
            <div className="flex flex-shrink-0 items-center gap-1">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
                    {solutionUrl && (
                        <a
                            href={solutionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open solution"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-500/10 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/15 dark:hover:text-blue-400"
                        >
                            <BookOpen className="h-4 w-4" />
                        </a>
                    )}
                </span>
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
                    {videoUrl && (
                        <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Watch video"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                        >
                            <Youtube className="h-4 w-4" />
                        </a>
                    )}
                </span>
                {problemUrl ? (
                    <a
                        href={problemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Solve problem"
                        className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                        <Code2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Solve</span>
                    </a>
                ) : (
                    <button
                        disabled
                        title="No problem link available"
                        className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 text-xs font-semibold text-gray-400 dark:bg-slate-800 dark:text-slate-600"
                    >
                        <Code2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Solve</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// Re-render only when the problem's identity/status or busy flag changes.
export const ProblemRow = memo(ProblemRowInner, (prev, next) =>
    prev.problem === next.problem && prev.busy === next.busy && prev.onStatusChange === next.onStatusChange
);

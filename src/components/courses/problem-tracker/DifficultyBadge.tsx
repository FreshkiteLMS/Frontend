import { memo } from 'react';
import type { Difficulty } from '@/types/problem-course';

// Easy = green, Medium = yellow/amber, Hard = red (per spec). Readable on both themes.
const STYLES: Record<Difficulty, string> = {
    Easy: 'bg-green-500/10 dark:bg-green-500/15 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-500/30',
    Medium: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30',
    Hard: 'bg-red-500/10 dark:bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-500/30',
};

export const DifficultyBadge = memo(function DifficultyBadge({
    difficulty,
    className = '',
}: {
    difficulty: Difficulty;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${STYLES[difficulty] ?? STYLES.Easy} ${className}`}
        >
            {difficulty}
        </span>
    );
});

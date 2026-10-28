import type { QuestionStatus } from '@/types/structured-questions';

/**
 * Display-side helpers for Structured Course question progress. The server is
 * the authority on allowed transitions; these only decide which controls to
 * offer, using the `allowedStudentStatuses` the server returns when present.
 */

const STUDENT_NEXT: Record<QuestionStatus, QuestionStatus[]> = {
    NOT_STARTED: ['IN_PROGRESS', 'COMPLETED'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: ['IN_PROGRESS'],
    FAIL: ['IN_PROGRESS'],
    PASS: [],
};

export interface StudentAction {
    status: QuestionStatus;
    label: string;
}

/** Buttons a student sees for a question in `current` status. */
export function studentActions(current: QuestionStatus, allowed?: QuestionStatus[]): StudentAction[] {
    const next = allowed ?? STUDENT_NEXT[current] ?? [];
    return next.map(status => ({
        status,
        label:
            status === 'IN_PROGRESS'
                ? current === 'NOT_STARTED' ? 'Start' : current === 'FAIL' ? 'Try again' : 'Resume'
                : 'Mark completed',
    }));
}

/** Tailwind classes per status. Always paired with a text label and icon (never colour alone). */
export const STATUS_STYLES: Record<QuestionStatus, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-700/50 dark:text-gray-200 dark:ring-gray-600',
    IN_PROGRESS: 'bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40',
    COMPLETED: 'bg-blue-50 text-blue-800 ring-blue-300 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/40',
    PASS: 'bg-green-50 text-green-800 ring-green-300 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-500/40',
    FAIL: 'bg-red-50 text-red-800 ring-red-300 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/40',
};

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

/** 'YYYY-MM-DD' → localized date without timezone drift. */
export function formatDueDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return new Date(y, m - 1, d).toLocaleDateString();
}

/** True when a due date (YYYY-MM-DD) is before today. */
export function isOverdue(iso: string | null | undefined, now = new Date()): boolean {
    if (!iso) return false;
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return iso < today;
}

export function percent(n: number): string {
    return `${Number.isFinite(n) ? Math.round(n) : 0}%`;
}

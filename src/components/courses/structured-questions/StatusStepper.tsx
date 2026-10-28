import { Award, Check, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { QUESTION_STATUS_LABELS, type QuestionStatus } from '@/types/structured-questions';

const STEPS: QuestionStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

interface StatusStepperProps {
    status: QuestionStatus;
    /** Statuses the student may move to from `status` (server-provided). */
    allowed: QuestionStatus[];
    busy?: boolean;
    readOnly?: boolean;
    onChange: (status: QuestionStatus) => void;
    label: string;
}

/**
 * Student status control: a three-step segmented selector
 * (Not started → In progress → Completed). Steps the student can't move to are
 * disabled. Assessed results (PASS / FAIL) are shown as an outcome instead,
 * because only an instructor can set them.
 */
export function StatusStepper({ status, allowed, busy = false, readOnly = false, onChange, label }: StatusStepperProps) {
    if (status === 'PASS' || status === 'FAIL') {
        const passed = status === 'PASS';
        const canRetry = !readOnly && allowed.includes('IN_PROGRESS');
        return (
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                        passed
                            ? 'bg-green-50 text-green-800 ring-green-300 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-500/40'
                            : 'bg-red-50 text-red-800 ring-red-300 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/40'
                    }`}
                >
                    {passed ? <Award className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    {passed ? 'Passed — assessed by instructor' : 'Not passed — assessed by instructor'}
                </span>
                {canRetry && (
                    <button
                        type="button"
                        onClick={() => onChange('IN_PROGRESS')}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                        Try again
                    </button>
                )}
            </div>
        );
    }

    const currentIndex = STEPS.indexOf(status);
    return (
        <div role="radiogroup" aria-label={label} aria-busy={busy} className="inline-flex w-full sm:w-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            {STEPS.map((step, i) => {
                const isCurrent = step === status;
                const reached = i <= currentIndex;
                const enabled = !readOnly && !busy && (isCurrent || allowed.includes(step));
                const tone = isCurrent
                    ? step === 'COMPLETED'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : step === 'IN_PROGRESS'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : enabled
                    ? 'text-gray-700 hover:bg-white/70 dark:text-gray-200 dark:hover:bg-gray-700/60'
                    : 'text-gray-400 dark:text-gray-500';
                return (
                    <button
                        key={step}
                        type="button"
                        role="radio"
                        aria-checked={isCurrent}
                        disabled={!enabled}
                        onClick={() => !isCurrent && onChange(step)}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${tone}`}
                    >
                        {isCurrent && busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : reached && step !== 'NOT_STARTED' ? (
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : null}
                        {QUESTION_STATUS_LABELS[step]}
                    </button>
                );
            })}
        </div>
    );
}

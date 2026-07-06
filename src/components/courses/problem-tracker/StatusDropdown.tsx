import { memo } from 'react';
import { PROBLEM_STATUS_LABELS, PROBLEM_STATUS_ORDER, type ProblemStatus } from '@/types/problem-course';

// Trigger colour per status. A native <select> is used deliberately: its popup
// renders above everything (never clipped by the section card's overflow-hidden
// collapse animation) and is fully keyboard/touch accessible out of the box.
const TRIGGER_STYLES: Record<ProblemStatus, string> = {
    not_started: 'bg-gray-100 text-gray-600 ring-gray-300 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600/50',
    try: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
    completed: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
    pass: 'bg-green-500/10 text-green-700 ring-green-500/40 dark:bg-green-500/20 dark:text-green-300',
    fail: 'bg-red-500/10 text-red-700 ring-red-500/30 dark:bg-red-500/15 dark:text-red-300',
};

export const StatusDropdown = memo(function StatusDropdown({
    value,
    onChange,
    disabled = false,
    busy = false,
}: {
    value: ProblemStatus;
    onChange: (status: ProblemStatus) => void;
    disabled?: boolean;
    busy?: boolean;
}) {
    return (
        <div className="relative inline-flex items-center">
            <select
                aria-label="Problem status"
                value={value}
                disabled={disabled || busy}
                onChange={e => onChange(e.target.value as ProblemStatus)}
                onClick={e => e.stopPropagation()}
                className={`appearance-none cursor-pointer rounded-lg py-1.5 pl-2.5 pr-7 text-xs font-semibold ring-1 ring-inset outline-none transition-colors focus:ring-2 focus:ring-blue-500/60 disabled:opacity-60 disabled:cursor-not-allowed ${TRIGGER_STYLES[value] ?? TRIGGER_STYLES.not_started}`}
            >
                {PROBLEM_STATUS_ORDER.map(s => (
                    <option key={s} value={s} className="bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-200">
                        {PROBLEM_STATUS_LABELS[s]}
                    </option>
                ))}
            </select>
            {/* caret */}
            <svg
                className="pointer-events-none absolute right-2 h-3.5 w-3.5 opacity-70"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
            >
                <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                />
            </svg>
        </div>
    );
});

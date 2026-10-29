"use client";

import { useEffect, useId, useState } from 'react';
import { Check, Loader2, Star } from 'lucide-react';
import { formatMarks, parseMarksInput } from '@/lib/question-progress';

interface MarksInputProps {
    /** The question's current maximum. */
    maxMarks: number;
    /** Saved score, or null when none is recorded. */
    marksObtained: number | null;
    /** The maximum the saved score was recorded against. */
    marksMax: number | null;
    busy?: boolean;
    readOnly?: boolean;
    /** Why editing is locked (shown when readOnly). */
    lockedReason?: string;
    onSave: (marks: number | null) => void;
    label: string;
}

/**
 * Self-assessed score for an audio question: "[ 8 ] / 10". The value is only
 * shown as saved after the server confirms it (the parent passes the saved
 * value back in). Invalid input is explained inline and never sent.
 */
export function MarksInput({ maxMarks, marksObtained, marksMax, busy = false, readOnly = false, lockedReason, onSave, label }: MarksInputProps) {
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const [draft, setDraft] = useState(marksObtained === null ? '' : String(marksObtained));

    // Server-confirmed value (save, conflict refresh, reload) replaces the draft.
    useEffect(() => {
        setDraft(marksObtained === null ? '' : String(marksObtained));
    }, [marksObtained]);

    const parsed = parseMarksInput(draft, maxMarks);
    const canSave = !readOnly && !busy && !parsed.error && parsed.value !== null && parsed.value !== marksObtained;
    const recordedAgainstOtherMax = marksObtained !== null && marksMax !== null && marksMax !== maxMarks;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canSave) onSave(parsed.value);
    };

    if (readOnly) {
        return (
            <p className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                {marksObtained === null ? (
                    <span>Not scored · out of {formatMarks(maxMarks, null)}</span>
                ) : (
                    <span>Score <strong className="text-gray-900 dark:text-white">{formatMarks(marksObtained, marksMax ?? maxMarks)}</strong></span>
                )}
                {lockedReason && <span className="text-gray-400">· {lockedReason}</span>}
            </p>
        );
    }

    return (
        <form onSubmit={submit} className="flex flex-col items-stretch gap-1 sm:items-end" noValidate>
            <div className="flex items-center gap-2">
                <label htmlFor={inputId} className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Your score
                </label>
                <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-blue-500">
                    <input
                        id={inputId}
                        inputMode="decimal"
                        autoComplete="off"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        disabled={busy}
                        aria-label={label}
                        aria-invalid={!!parsed.error}
                        aria-describedby={parsed.error ? errorId : undefined}
                        placeholder="–"
                        className="w-14 rounded-l-lg bg-transparent px-2 py-1.5 text-right text-sm font-semibold text-gray-900 dark:text-white outline-none disabled:opacity-60"
                    />
                    <span className="pr-2.5 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true">/ {formatMarks(maxMarks, null)}</span>
                </div>
                <button
                    type="submit"
                    disabled={!canSave}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    Save
                </button>
                {marksObtained !== null && !busy && (
                    <button type="button" onClick={() => onSave(null)} className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline-offset-2 hover:underline">
                        Clear
                    </button>
                )}
            </div>
            {parsed.error ? (
                <p id={errorId} role="alert" className="text-[11px] font-medium text-red-600 dark:text-red-400">{parsed.error}</p>
            ) : recordedAgainstOtherMax ? (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Saved as {formatMarks(marksObtained!, marksMax)} before the maximum changed.</p>
            ) : null}
        </form>
    );
}

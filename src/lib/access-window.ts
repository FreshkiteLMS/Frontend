import type { DurationInput, DurationPreset } from '@/types/enrollment';

/**
 * Client-side PREVIEW of an access window. The server computes the real dates
 * from the same preset (services/enrollments/accessWindow.ts); this only shows
 * the admin what "3 months" will mean before they confirm.
 */

export const DURATION_OPTIONS: { value: DurationPreset; label: string }[] = [
    { value: '30_DAYS', label: '30 days' },
    { value: '3_MONTHS', label: '3 months' },
    { value: '6_MONTHS', label: '6 months' },
    { value: '1_YEAR', label: '1 year' },
    { value: 'LIFETIME', label: 'Lifetime' },
    { value: 'CUSTOM', label: 'Custom' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
    return d;
}

/** `yyyy-mm-dd` (from <input type="date">) → that local day's start, or now when it is today/empty. */
export function startFromDateInput(value: string | undefined, now: Date = new Date()): Date {
    if (!value) return now;
    const [y, m, d] = value.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    return start.toDateString() === now.toDateString() ? now : start;
}

/** `yyyy-mm-dd` → the end of that local day (access lasts through the chosen date). */
export function endFromDateInput(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 0);
}

export function toDateInput(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Form state for the duration picker. */
export interface DurationDraft {
    preset: DurationPreset;
    startDate: string;   // yyyy-mm-dd, '' = now
    expiryDate: string;  // yyyy-mm-dd, CUSTOM only
}

export const defaultDraft = (preset: DurationPreset = 'LIFETIME'): DurationDraft => ({ preset, startDate: '', expiryDate: '' });

/** Turn the picker state into the API payload (or an error message to show). */
export function draftToDuration(draft: DurationDraft, now: Date = new Date(), baseStart?: Date): { duration?: DurationInput; error?: string; startsAt: Date; expiresAt: Date | null } {
    // An empty start means "now" for new grants, or the existing start (`baseStart`) when editing.
    const startsAt = draft.startDate ? startFromDateInput(draft.startDate, now) : (baseStart ?? now);
    let expiresAt: Date | null;
    switch (draft.preset) {
        case '30_DAYS': expiresAt = new Date(startsAt.getTime() + 30 * DAY_MS); break;
        case '3_MONTHS': expiresAt = addMonths(startsAt, 3); break;
        case '6_MONTHS': expiresAt = addMonths(startsAt, 6); break;
        case '1_YEAR': expiresAt = addMonths(startsAt, 12); break;
        case 'LIFETIME': expiresAt = null; break;
        case 'CUSTOM':
            if (!draft.expiryDate) return { error: 'Choose an expiry date', startsAt, expiresAt: null };
            expiresAt = endFromDateInput(draft.expiryDate);
            break;
    }
    if (expiresAt && expiresAt <= startsAt) return { error: 'Expiry must be after the start date', startsAt, expiresAt };
    if (expiresAt && expiresAt <= now) return { error: 'Expiry must be in the future', startsAt, expiresAt };
    const duration: DurationInput = { preset: draft.preset };
    if (draft.startDate) duration.startsAt = startsAt.toISOString();
    if (draft.preset === 'CUSTOM' && expiresAt) duration.expiresAt = expiresAt.toISOString();
    return { duration, startsAt, expiresAt };
}

export const fmtDate = (iso: string | Date | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (iso: string | Date | null | undefined) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

/** "Lifetime" / "Ends 3 Mar 2027" style label. */
export const accessEndLabel = (expiresAt: string | Date | null | undefined) => (expiresAt ? `Until ${fmtDate(expiresAt)}` : 'Lifetime');

/** Whole days until `iso` (negative once passed). */
export const daysUntil = (iso: string | Date, now: Date = new Date()) => Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);

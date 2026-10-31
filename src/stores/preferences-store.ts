import { create } from 'zustand';
import type { Preferences } from '@/types/profile';

/**
 * The signed-in user's display preferences (synced from /account). Display
 * only: changing the timezone changes how instants are SHOWN, never the
 * instants themselves (meetings etc. are stored as absolute times).
 */
interface PreferencesState {
    prefs: Preferences | null;
    setPrefs: (p: Preferences | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()((set) => ({
    prefs: null,
    setPrefs: (prefs) => set({ prefs }),
}));

function current(): Preferences | null {
    return usePreferencesStore.getState().prefs;
}

/** The zone to display times in: the user's choice, else the device's. */
export function displayTimeZone(prefs: Preferences | null = current()): string | undefined {
    return prefs?.timezone || undefined;
}

function dateParts(d: Date, prefs: Preferences | null, opts: Intl.DateTimeFormatOptions) {
    const parts = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: displayTimeZone(prefs) }).formatToParts(d);
    return Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>;
}

/** "31 Oct 2026" / "Oct 31, 2026" / "2026-10-31" per the user's date format. */
export function formatDate(value: string | number | Date, prefs: Preferences | null = current()): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const p = dateParts(d, prefs, { day: 'numeric', month: 'short', year: 'numeric' });
    switch (prefs?.date_format) {
        case 'MDY': return `${p.month} ${p.day}, ${p.year}`;
        case 'YMD': {
            const n = dateParts(d, prefs, { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `${n.year}-${n.month}-${n.day}`;
        }
        default: return `${p.day} ${p.month} ${p.year}`;
    }
}

/** "6:30 pm" or "18:30" per the user's time format. */
export function formatTime(value: string | number | Date, prefs: Preferences | null = current()): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: prefs?.time_format !== '24h',
        timeZone: displayTimeZone(prefs),
    }).format(d);
}

export function formatDateTime(value: string | number | Date, prefs: Preferences | null = current()): string {
    return `${formatDate(value, prefs)}, ${formatTime(value, prefs)}`;
}

/** Short weekday + day + month ("Mon, 2 Nov") in the display zone. */
export function formatDayLabel(value: string | number | Date, prefs: Preferences | null = current()): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(prefs?.date_format === 'MDY' ? 'en-US' : 'en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: displayTimeZone(prefs),
    }).format(d);
}

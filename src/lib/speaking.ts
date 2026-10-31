import type { PerformanceLevel, QuestionPracticeStats, SpeakingAttemptStatus } from '@/types/speaking';

/** Display helpers for the AI speaking assessment. The server is the authority on every value. */

export const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
    EXCELLENT: 'Excellent',
    VERY_GOOD: 'Very good',
    GOOD: 'Good',
    FAIR: 'Fair',
    NEEDS_IMPROVEMENT: 'Needs improvement',
};

/** Paired with a text label everywhere — never colour alone. */
export const PERFORMANCE_STYLES: Record<PerformanceLevel, string> = {
    EXCELLENT: 'bg-green-50 text-green-800 ring-green-300 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-500/40',
    VERY_GOOD: 'bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40',
    GOOD: 'bg-blue-50 text-blue-800 ring-blue-300 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/40',
    FAIR: 'bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40',
    NEEDS_IMPROVEMENT: 'bg-red-50 text-red-800 ring-red-300 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/40',
};

export function scoreTone(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 7.5) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-blue-600 dark:text-blue-400';
    if (score >= 4) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

export function formatScore(score: number | null | undefined): string {
    return score === null || score === undefined ? '—' : String(Math.round(score * 10) / 10);
}

export const ATTEMPT_STATUS_LABELS: Record<SpeakingAttemptStatus, string> = {
    UPLOADING: 'Uploading',
    UPLOADED: 'Queued',
    TRANSCRIBING: 'Transcribing',
    EVALUATING: 'Evaluating',
    COMPLETED: 'Assessed',
    FAILED: 'Failed',
};

/** Practice state shown on a question card (combines progress status and attempts). */
export type PracticeState = 'NOT_STARTED' | 'IN_PROGRESS' | 'PRACTICED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export const PRACTICE_STATE_LABELS: Record<PracticeState, string> = {
    NOT_STARTED: 'Not started',
    IN_PROGRESS: 'In progress',
    PRACTICED: 'Practiced',
    PROCESSING: 'Assessment processing',
    COMPLETED: 'Assessment completed',
    FAILED: 'Assessment failed',
};

export const PRACTICE_STATE_STYLES: Record<PracticeState, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-700/50 dark:text-gray-200 dark:ring-gray-600',
    IN_PROGRESS: 'bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40',
    PRACTICED: 'bg-indigo-50 text-indigo-800 ring-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/40',
    PROCESSING: 'bg-sky-50 text-sky-800 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/40',
    COMPLETED: 'bg-green-50 text-green-800 ring-green-300 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-500/40',
    FAILED: 'bg-red-50 text-red-800 ring-red-300 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/40',
};

const PROCESSING: SpeakingAttemptStatus[] = ['UPLOADED', 'TRANSCRIBING', 'EVALUATING'];

/**
 * The latest attempt decides processing/failed/completed; otherwise the
 * self-reported progress status applies. A question with earlier completed
 * attempts whose latest failed still counts as practiced.
 */
export function practiceState(progressStatus: string, stats: QuestionPracticeStats | undefined): PracticeState {
    if (stats) {
        if (PROCESSING.includes(stats.latestStatus)) return 'PROCESSING';
        if (stats.latestStatus === 'COMPLETED') return 'COMPLETED';
        if (stats.latestStatus === 'FAILED') return stats.completedAttempts > 0 ? 'PRACTICED' : 'FAILED';
    }
    if (progressStatus === 'NOT_STARTED') return 'NOT_STARTED';
    if (progressStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
    return 'PRACTICED';
}

export function formatClock(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '—';
    const mins = Math.round((now - t) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString();
}

/** Best audio format this browser can record that the server accepts. */
export function pickRecordingMimeType(isSupported: (t: string) => boolean): string | null {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    return candidates.find(t => { try { return isSupported(t); } catch { return false; } }) ?? null;
}

/** Random idempotency key for one submission. */
export function newRequestId(): string {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c?.randomUUID) return c.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const CONSENT_STORAGE_KEY = (version: string) => `speaking-consent:${version}`;

/**
 * Split prose into short points so long feedback can be shown as bullets.
 * Splits on sentence ends followed by a capital letter or digit, and keeps
 * abbreviations like "e.g." and "i.e." intact.
 */
export function splitSentences(text: string | null | undefined): string[] {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    const protectedText = t.replace(/\b(e\.g|i\.e|vs|etc)\./gi, m => m.replace(/\./g, '\u0000'));
    return protectedText
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"“‘(])/)
        .map(s => s.replace(/\u0000/g, '.').trim())
        .filter(Boolean);
}

/** Group sentences into short paragraphs (for the spoken ideal answer). */
export function toParagraphs(text: string | null | undefined, perParagraph = 3): string[] {
    const blocks = String(text ?? '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
    if (blocks.length > 1) return blocks;
    const sentences = splitSentences(text);
    const out: string[] = [];
    for (let i = 0; i < sentences.length; i += perParagraph) out.push(sentences.slice(i, i + perParagraph).join(' '));
    return out;
}

export type Tone = 'green' | 'amber' | 'red' | 'sky' | 'indigo' | 'teal' | 'gray';

export const TONE_CHIP: Record<Tone, string> = {
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40',
    amber: 'bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40',
    red: 'bg-rose-50 text-rose-800 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/40',
    sky: 'bg-sky-50 text-sky-800 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/40',
    indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/40',
    teal: 'bg-teal-50 text-teal-800 ring-teal-300 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-500/40',
    gray: 'bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-700/50 dark:text-gray-200 dark:ring-gray-600',
};

/** Tone for the communication ratings (good → green, fair → amber, weak → red). */
export function ratingTone(value: string): Tone {
    if (['CLEAR', 'GOOD', 'NONE'].includes(value)) return 'green';
    if (['MOSTLY_CLEAR', 'FAIR', 'SOME'].includes(value)) return 'amber';
    return 'red';
}

export function importanceTone(importance: string): Tone {
    return importance === 'HIGH' ? 'red' : importance === 'MEDIUM' ? 'amber' : 'sky';
}

/** Pill classes for a score out of 10 (null → neutral). Always shown next to the number. */
export function scoreChip(score: number | null | undefined): string {
    if (score === null || score === undefined) return TONE_CHIP.gray;
    return TONE_CHIP[score >= 7.5 ? 'green' : score >= 6 ? 'sky' : score >= 4 ? 'amber' : 'red'];
}

/** Heat-map cell classes for a score ratio (0–1); null = no score. */
export function heatCell(ratio: number | null): string {
    if (ratio === null) return 'bg-transparent text-gray-300 dark:text-gray-600';
    if (ratio >= 0.75) return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100';
    if (ratio >= 0.6) return 'bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100';
    if (ratio >= 0.4) return 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100';
    return 'bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100';
}

export const SCORE_BUCKET_COLORS = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];

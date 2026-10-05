/**
 * Client-side rules for admin-supplied **source document links** (the original
 * Google Doc / PDF behind a course, or a course group's reference material).
 *
 * This mirrors `Backend/src/utils/documentUrl.ts` and exists purely for fast
 * feedback in the admin forms — the server validates every write again and is
 * the only authority. It is also the render-time guard for legacy rows that were
 * stored before validation existed: a malformed value is treated as "no link"
 * rather than rendered into an anchor.
 */

/** Only http(s) links may be stored or rendered. Blocks javascript:, data:, vbscript:, file:, … */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export const DOCUMENT_URL_MAX_LENGTH = 2048;

/** True when `value` is a string safe to persist and render as an external link. */
export function isValidDocumentUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > DOCUMENT_URL_MAX_LENGTH) return false;

    try {
        const parsed = new URL(trimmed);
        return ALLOWED_PROTOCOLS.includes(parsed.protocol) && !!parsed.hostname;
    } catch {
        return false;
    }
}

/**
 * Normalize a form field for submission: a trimmed URL, or `null` when the admin
 * left it empty (which the API reads as "remove the link"). Invalid input is
 * returned as-is so the caller can surface a validation message instead of
 * silently dropping what the admin typed.
 */
export function normalizeDocumentUrlInput(value: string): string | null {
    const trimmed = (value || '').trim();
    return trimmed ? trimmed : null;
}

/**
 * Render-time guard: the URL to link to, or `null` if there is nothing safe to
 * show. Callers hide their document UI entirely on `null` — never an empty card,
 * never a broken link, never a crash on a malformed stored value.
 */
export function safeDocumentUrl(value: unknown): string | null {
    if (!isValidDocumentUrl(value)) return null;
    return value.trim();
}

/**
 * Host shown next to a document link so students can see where they are being
 * sent before they leave the LMS. Returns null if the URL can't be parsed.
 */
export function documentUrlHost(value: unknown): string | null {
    const url = safeDocumentUrl(value);
    if (!url) return null;
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

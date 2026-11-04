/**
 * URL detection for course text. Mirrors the server's rules (Backend
 * services/courseProcessing/urls.ts), so links in courses processed before the
 * server stored them as structured data are recognized when they are shown.
 *
 * Understands `[label](url)`, which is how links are written in plain-string
 * fields such as list items and table cells, and bare http(s) URLs.
 */

export type LinkedTextPart = { kind: 'text'; text: string } | { kind: 'link'; text: string; url: string };

const LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+(?:\([^\s)]*\)[^\s)]*)*)\)|(?<![\w/@.-])https?:\/\/[^\s<>"'`]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?'"*_~]+$/;
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

const count = (s: string, ch: string) => s.split(ch).length - 1;

/** Drop punctuation that follows a URL in prose, keeping brackets the URL itself opened. */
function trimUrl(raw: string): string {
    let url = raw;
    for (;;) {
        const trimmed = url.replace(TRAILING_PUNCTUATION, '');
        const last = trimmed.at(-1) ?? '';
        const opener = CLOSERS[last];
        if (opener && count(trimmed, last) > count(trimmed, opener)) { url = trimmed.slice(0, -1); continue; }
        return trimmed;
    }
}

/** A real http(s) destination: parses, has a dotted host (or localhost), no embedded credentials. */
export function isValidHttpUrl(raw: string): boolean {
    if (!raw || raw.length > 2048 || /\s/.test(raw)) return false;
    let u: URL;
    try { u = new URL(raw); } catch { return false; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    const host = u.hostname.replace(/\.$/, '');
    return host === 'localhost' || /^[^.]+(\.[^.]+)+$/.test(host);
}

/** Split text into plain and link parts. Anything that fails validation stays plain text. */
export function splitLinkedText(text: string): LinkedTextPart[] {
    const parts: LinkedTextPart[] = [];
    let last = 0;
    const pushText = (s: string) => { if (s) parts.push({ kind: 'text', text: s }); };
    for (const m of text.matchAll(LINK_RE)) {
        const start = m.index;
        const label = m[1];
        const url = label ? m[2] : trimUrl(m[0]);
        if (!isValidHttpUrl(url)) continue;
        pushText(text.slice(last, start));
        parts.push({ kind: 'link', text: label ?? url, url });
        last = start + (label ? m[0].length : url.length);
    }
    pushText(text.slice(last));
    return parts;
}

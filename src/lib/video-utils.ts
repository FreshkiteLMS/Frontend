
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,20}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'];

function parseUrl(raw: string): URL | null {
    const s = raw.trim();
    if (!s || /\s/.test(s)) return null;
    try {
        // Pasted links often have no scheme: "youtu.be/abc", "www.youtube.com/watch?v=abc".
        return new URL(/^(?:www\.|m\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(s) ? `https://${s}` : s);
    } catch {
        return null;
    }
}

/**
 * Extract YouTube video ID from various URL formats: watch, youtu.be, embed,
 * shorts, live and youtube-nocookie.com. Null for anything else, including
 * look-alike hosts and malformed ids.
 */
export function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const u = parseUrl(url);
    if (!u || (u.protocol !== 'https:' && u.protocol !== 'http:')) return null;

    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    let id: string | null | undefined;
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (YOUTUBE_HOSTS.includes(host)) id = u.searchParams.get('v') || /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname)?.[1];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
}

/** The start offset a link asks for: t=90, t=1m30s or start=90. */
function startSeconds(u: URL): number {
    const raw = u.searchParams.get('t') ?? u.searchParams.get('start');
    const m = raw ? /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(raw) : null;
    return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/**
 * Player URL for an embedded YouTube video, or null when the link isn't a
 * YouTube video. `enablejsapi` lets the player report embedding restrictions.
 */
export function getYouTubePlayerUrl(url: string, origin?: string): string | null {
    const id = extractYouTubeId(url);
    if (!id) return null;
    const params = new URLSearchParams({ enablejsapi: '1', rel: '0' });
    if (origin) params.set('origin', origin);
    const start = startSeconds(parseUrl(url)!);
    if (start > 0) params.set('start', String(start));
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`;
}

/**
 * Convert any YouTube URL to embed format
 */
export function getYouTubeEmbedUrl(url: string): string | null {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return /(?:youtube\.com|youtube-nocookie\.com|youtu\.be)/.test(url);
}

/** An http(s) link that is safe to open in a new tab, or null (e.g. javascript: URLs). */
export function safeExternalUrl(url: string): string | null {
    const u = parseUrl(url);
    return u && (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : null;
}

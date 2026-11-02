/**
 * Video-solution helpers for the admin editor. They mirror the server rules
 * (Backend services/problemContent/videoSolutions.ts) for instant feedback;
 * the server validates again on save.
 */

export const VIDEO_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'ta', name: 'Tamil' },
    { code: 'hi', name: 'Hindi' },
    { code: 'te', name: 'Telugu' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'kn', name: 'Kannada' },
] as const;

export const OTHER_LANGUAGE = 'other';

export const VIDEO_URL_HINT = 'YouTube, Vimeo or Google Drive link, or a direct .mp4 / .webm / .ogg / .m3u8 file';

export function isSupportedVideoUrl(raw: string): boolean {
    const s = raw.trim();
    if (!s || /\s/.test(s) || s.length > 2048) return false;
    let u: URL;
    try { u = new URL(s); } catch { return false; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) {
        const id = host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || (/^\/(embed|shorts|live)\/([^/?#]+)/.exec(u.pathname)?.[2] ?? '');
        return /^[A-Za-z0-9_-]{6,20}$/.test(id);
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') return /\/\d{5,}/.test(u.pathname);
    if (host === 'drive.google.com') return /\/file\/d\/[A-Za-z0-9_-]{10,}/.test(u.pathname) || !!u.searchParams.get('id');
    return /\.(mp4|webm|ogg|ogv|m3u8)$/i.test(u.pathname);
}

/** A custom language name the server will accept for "Other". */
export const isValidLanguageName = (name: string) => /^\p{L}[\p{L}\p{M} ()'.-]{0,38}\p{L}$/u.test(name.trim());

/** Stable key for duplicate detection (matches the server's code for catalog languages). */
export function languageKey(code: string, name: string): string {
    if (code && code !== OTHER_LANGUAGE && !code.startsWith('x-')) return code;
    const known = VIDEO_LANGUAGES.find(l => l.name.toLowerCase() === name.trim().toLowerCase());
    return known ? known.code : `name:${name.trim().toLowerCase()}`;
}

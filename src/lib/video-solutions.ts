/**
 * Video-solution helpers for the admin editor. They mirror the server rules
 * (Backend services/problemContent/videoSolutions.ts) for instant feedback;
 * the server validates again on save.
 */

import { extractYouTubeId } from '@/lib/video-utils';

export const VIDEO_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'ta', name: 'Tamil' },
    { code: 'hi', name: 'Hindi' },
    { code: 'te', name: 'Telugu' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'kn', name: 'Kannada' },
] as const;

export const OTHER_LANGUAGE = 'other';

/** A video whose source didn't say which language it is in. Never guessed. */
export const UNSPECIFIED_LANGUAGE = 'und';
export const UNSPECIFIED_LANGUAGE_NAME = 'Not specified';

export const VIDEO_URL_HINT = 'YouTube, Vimeo or Google Drive link, or a direct .mp4 / .webm / .ogg / .m3u8 file';

export function isSupportedVideoUrl(raw: string): boolean {
    const s = raw.trim();
    if (!s || /\s/.test(s) || s.length > 2048) return false;
    let u: URL;
    try { u = new URL(s); } catch { return false; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return !!extractYouTubeId(s);
    if (host === 'vimeo.com' || host === 'player.vimeo.com') return /\/\d{5,}/.test(u.pathname);
    if (host === 'drive.google.com') return /\/file\/d\/[A-Za-z0-9_-]{10,}/.test(u.pathname) || !!u.searchParams.get('id');
    return /\.(mp4|webm|ogg|ogv|m3u8)$/i.test(u.pathname);
}

/** A custom language name the server will accept for "Other". */
export const isValidLanguageName = (name: string) => /^\p{L}[\p{L}\p{M} ()'.-]{0,38}\p{L}$/u.test(name.trim());

/** Identity of a video for duplicate detection: every form of one YouTube link is the same video. */
export function videoKey(url: string): string {
    const yt = extractYouTubeId(url);
    return yt ? `youtube:${yt}` : url.trim();
}

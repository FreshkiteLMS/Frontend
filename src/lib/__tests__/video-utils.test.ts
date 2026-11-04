import { describe, expect, test } from 'vitest';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubePlayerUrl, safeExternalUrl } from '../video-utils';
import { isSupportedVideoUrl } from '../video-solutions';

const ID = 'KLlXCFG5TnA';

describe('extractYouTubeId', () => {
    test.each([
        `https://www.youtube.com/watch?v=${ID}`,
        `https://youtube.com/watch?list=PL123&v=${ID}&t=30`,
        `https://m.youtube.com/watch?v=${ID}`,
        `https://music.youtube.com/watch?v=${ID}`,
        `http://youtu.be/${ID}`,
        `https://youtu.be/${ID}?si=abc`,
        `https://www.youtube.com/embed/${ID}`,
        `https://www.youtube.com/embed/${ID}?start=10`,
        `https://www.youtube.com/shorts/${ID}`,
        `https://www.youtube.com/shorts/${ID}?feature=share`,
        `https://www.youtube.com/live/${ID}`,
        `https://www.youtube-nocookie.com/embed/${ID}`,
        `youtu.be/${ID}`,
        `www.youtube.com/watch?v=${ID}`,
        `  https://youtu.be/${ID}  `,
    ])('reads %s', url => {
        expect(extractYouTubeId(url)).toBe(ID);
    });

    test.each([
        '',
        'not a url',
        'https://www.youtube.com/',
        'https://www.youtube.com/watch',
        'https://www.youtube.com/playlist?list=PL123',
        'https://youtu.be/',
        'https://www.youtube.com/watch?v=<script>',
        `https://notyoutube.com/watch?v=${ID}`,
        `https://youtube.com.evil.dev/watch?v=${ID}`,
        `https://example.com/youtube.com/embed/${ID}`,
        `javascript:alert('https://youtu.be/${ID}')`,
    ])('rejects %s', url => {
        expect(extractYouTubeId(url)).toBeNull();
    });
});

describe('player URLs', () => {
    test('uses the privacy-enhanced host and enables error reporting', () => {
        const u = new URL(getYouTubePlayerUrl(`https://youtu.be/${ID}`, 'https://lms.dev')!);
        expect(u.origin + u.pathname).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
        expect(u.searchParams.get('enablejsapi')).toBe('1');
        expect(u.searchParams.get('origin')).toBe('https://lms.dev');
    });

    test.each([['t=90', '90'], ['t=1m30s', '90'], ['start=90', '90']])('keeps the start time from %s', (query, seconds) => {
        expect(new URL(getYouTubePlayerUrl(`https://www.youtube.com/watch?v=${ID}&${query}`)!).searchParams.get('start')).toBe(seconds);
    });

    test('returns null for anything that is not a YouTube video', () => {
        expect(getYouTubePlayerUrl('https://example.com/a.mp4')).toBeNull();
        expect(getYouTubeEmbedUrl('https://example.com/a.mp4')).toBeNull();
    });

    test('Shorts embed like any other video in content blocks', () => {
        expect(getYouTubeEmbedUrl(`https://www.youtube.com/shorts/${ID}`)).toBe(`https://www.youtube.com/embed/${ID}`);
    });
});

describe('safeExternalUrl', () => {
    test('only allows http(s)', () => {
        expect(safeExternalUrl(`https://youtu.be/${ID}`)).toBe(`https://youtu.be/${ID}`);
        expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
        expect(safeExternalUrl('data:text/html,x')).toBeNull();
        expect(safeExternalUrl('garbage')).toBeNull();
    });
});

describe('isSupportedVideoUrl', () => {
    test('accepts the same YouTube forms as the player', () => {
        expect(isSupportedVideoUrl(`https://www.youtube.com/shorts/${ID}`)).toBe(true);
        expect(isSupportedVideoUrl(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(true);
        expect(isSupportedVideoUrl('https://www.youtube.com/playlist?list=PL1')).toBe(false);
    });
});

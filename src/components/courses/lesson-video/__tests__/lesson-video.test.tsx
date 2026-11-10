import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/youtube-player-api', async importOriginal => ({
    ...(await importOriginal<typeof import('@/lib/youtube-player-api')>()),
    loadYouTubePlayerApi: () => Promise.reject(new Error('not in tests')),
}));

import { isInLmsVideoUrl } from '@/lib/video-utils';
import { VideoLink } from '../VideoLink';
import { VideoView, LinkBlockView } from '../../structured/blocks/media';
import { LinkedText } from '../../structured/blocks/linked-text';

afterEach(() => { cleanup(); document.body.innerHTML = ''; });

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const iframeSrc = () => document.querySelector('iframe')?.getAttribute('src') ?? null;

describe('isInLmsVideoUrl', () => {
    test.each([
        YT,
        'https://youtu.be/dQw4w9WgXcQ?t=90',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'https://vimeo.com/123456789',
        'https://cdn.example.com/lessons/intro.mp4',
    ])('plays %s in the LMS', url => expect(isInLmsVideoUrl(url)).toBe(true));

    test.each([
        'https://www.youtube.com/@somechannel',
        'https://www.youtube.com/playlist?list=PL123',
        'https://drive.google.com/file/d/abc/view',
        'https://leetcode.com/problems/two-sum/',
        'https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ',
        'javascript:alert(1)',
        '',
        null,
    ])('leaves %s as a normal link', url => expect(isInLmsVideoUrl(url)).toBe(false));
});

describe('VideoLink', () => {
    test('a YouTube link opens the LMS player instead of navigating', () => {
        render(<VideoLink href={YT} videoTitle="Recursion intro">watch this</VideoLink>);
        const link = screen.getByRole('link', { name: 'watch this' });
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        act(() => { link.dispatchEvent(click); });
        expect(click.defaultPrevented).toBe(true);
        expect(screen.getByRole('dialog', { name: 'Recursion intro' })).toBeTruthy();
        expect(iframeSrc()).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
        // The explicit way out is still there, as in problem-solving videos.
        expect(screen.getByRole('link', { name: /Watch on YouTube/ }).getAttribute('href')).toBe(YT);
    });

    test('closing the dialog removes the player', () => {
        render(<VideoLink href={YT}>watch</VideoLink>);
        fireEvent.click(screen.getByRole('link', { name: 'watch' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.querySelector('iframe')).toBeNull();
    });

    test('Ctrl/⌘-click keeps the browser behaviour', () => {
        render(<VideoLink href={YT}>watch</VideoLink>);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
        act(() => { screen.getByRole('link', { name: 'watch' }).dispatchEvent(click); });
        expect(click.defaultPrevented).toBe(false);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('non-video links still open in a new tab', () => {
        render(<VideoLink href="https://leetcode.com/problems/two-sum/">Two Sum</VideoLink>);
        const link = screen.getByRole('link', { name: 'Two Sum' });
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        act(() => { link.dispatchEvent(click); });
        expect(click.defaultPrevented).toBe(false);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('YouTube URLs inside course text open the player', () => {
        render(<p><LinkedText text={`Watch ${YT} first.`} /></p>);
        fireEvent.click(screen.getByRole('link', { name: YT }));
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    test('a link block pointing at a video opens the player', () => {
        render(<LinkBlockView block={{ id: 'b', type: 'link', url: YT, title: 'Big-O in 5 minutes', description: '' } as any} />);
        fireEvent.click(screen.getByRole('link', { name: /Big-O in 5 minutes/ }));
        expect(screen.getByRole('dialog', { name: 'Big-O in 5 minutes' })).toBeTruthy();
    });
});

describe('VideoView', () => {
    test('shows a poster, and plays in the LMS dialog only when clicked', () => {
        render(<VideoView url={YT} title="Variables explained" />);
        expect(document.querySelector('iframe')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Play video: Variables explained' }));
        expect(screen.getByRole('dialog', { name: 'Variables explained' })).toBeTruthy();
        expect(iframeSrc()).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    test('links the player cannot play stay outbound links', () => {
        render(<VideoView url="https://example.com/some-page" title="Elsewhere" />);
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByRole('link', { name: /Elsewhere/ }).getAttribute('target')).toBe('_blank');
    });
});

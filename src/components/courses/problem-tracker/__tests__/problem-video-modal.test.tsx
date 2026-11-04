import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProblemDetail, TrackerProblem, VideoSolution } from '@/types/problem-course';

const getProblem = vi.fn();
vi.mock('@/services/api/problem-course.api', () => ({ problemCourseService: { getProblem: (...a: unknown[]) => getProblem(...a) } }));
vi.mock('@/lib/youtube-player-api', async importOriginal => ({
    ...(await importOriginal<typeof import('@/lib/youtube-player-api')>()),
    loadYouTubePlayerApi: () => Promise.reject(new Error('not in tests')),
}));

import { ProblemVideoModal } from '../ProblemVideoModal';
import { ProblemRow } from '../ProblemRow';

afterEach(() => { cleanup(); vi.clearAllMocks(); document.body.innerHTML = ''; });
beforeEach(() => { localStorage.clear(); });

const problem: TrackerProblem = {
    id: 'p1', title: 'Two Sum', difficulty: 'Easy', solutionUrl: null, videoUrl: null, problemUrl: 'https://leetcode.com/problems/two-sum/', tags: [], order: 0, externalId: null,
    defaultStatus: 'not_started', userStatus: 'not_started', completed: false, attempts: 0, completedAt: null, lastViewed: null,
};
const video = (id: string, code: string, name: string, videoType?: VideoSolution['videoType'], extra: Partial<VideoSolution> = {}): VideoSolution => ({
    id, title: `${id} title`, languageCode: code, languageName: name, url: `https://www.youtube.com/watch?v=${id}aaaaaaaaa`, description: '', isDefault: false, videoType, ...extra,
});
const detail = (videoSolutions: VideoSolution[], legacyVideoUrl: string | null = null): ProblemDetail => ({
    id: 'p1', courseId: 'c1', title: 'Two Sum', difficulty: 'Easy', section: { id: 's', title: 'Arrays' }, tags: [], externalId: null, problemUrl: null, solutionUrl: null,
    statement: { description: 'THE PROBLEM STATEMENT', constraints: '', examples: [], solution_approach: '', time_complexity: '', space_complexity: '' },
    videoSolutions, legacyVideoUrl,
});
const iframeSrc = () => document.querySelector('iframe')?.getAttribute('src') ?? null;
const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(name) });

async function open(videos: VideoSolution[], legacy: string | null = null) {
    getProblem.mockResolvedValue(detail(videos, legacy));
    const onClose = vi.fn();
    render(<ProblemVideoModal courseId="c1" problem={problem} onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('tabpanel').getAttribute('aria-busy')).toBeNull());
    await waitFor(() => expect(screen.queryByLabelText('Loading videos')).toBeNull());
    return onClose;
}

describe('ProblemVideoModal', () => {
    test('has exactly the two tabs and no problem statement', async () => {
        await open([video('e1', 'en', 'English', 'explanation')]);
        expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['Video Explanation', 'Video Solution']);
        expect(screen.queryByText('THE PROBLEM STATEMENT')).toBeNull();
        expect(screen.getByRole('dialog').className).toContain('dark');
    });

    test('plays inside the LMS, and YouTube is only an explicit link', async () => {
        const opened = vi.spyOn(window, 'open');
        await open([video('e1', 'en', 'English', 'explanation')]);
        expect(iframeSrc()).toContain('youtube-nocookie.com/embed/e1aaaaaaaaa');
        expect(iframeSrc()).not.toContain('autoplay=1');
        expect(opened).not.toHaveBeenCalled();
        const external = screen.getByRole('link', { name: /Watch on YouTube/ });
        expect(external.getAttribute('href')).toContain('watch?v=e1aaaaaaaaa');
        expect(external.getAttribute('target')).toBe('_blank');
        expect(external.getAttribute('rel')).toBe('noopener noreferrer');
    });

    test('each tab shows its own videos; switching replaces the player', async () => {
        await open([video('e1', 'en', 'English', 'explanation'), video('s1', 'en', 'English', 'solution')]);
        expect(tab('Video Explanation').getAttribute('aria-selected')).toBe('true');
        expect(iframeSrc()).toContain('e1aaaaaaaaa');
        expect(screen.getByText('e1 title')).toBeTruthy();

        fireEvent.click(tab('Video Solution'));
        expect(tab('Video Solution').getAttribute('aria-selected')).toBe('true');
        expect(iframeSrc()).toContain('s1aaaaaaaaa');
        expect(document.querySelectorAll('iframe')).toHaveLength(1);
    });

    test('videos with no type, and the older single link, are solutions', async () => {
        await open([video('u1', 'en', 'English')]);
        expect(tab('Video Solution').getAttribute('aria-selected')).toBe('true');
        expect(iframeSrc()).toContain('u1aaaaaaaaa');
        cleanup();
        document.body.innerHTML = '';

        await open([], 'https://youtu.be/KLlXCFG5TnA');
        expect(tab('Video Solution').getAttribute('aria-selected')).toBe('true');
        expect(iframeSrc()).toContain('KLlXCFG5TnA');
    });

    test('a tab with no videos says so and offers nothing broken', async () => {
        await open([video('s1', 'en', 'English', 'solution')]);
        fireEvent.click(tab('Video Explanation'));
        expect(screen.getByText('No video explanation yet')).toBeTruthy();
        expect(iframeSrc()).toBeNull();
        expect(screen.queryByRole('link', { name: /YouTube/ })).toBeNull();
    });

    test('a problem with no videos at all has an empty state on both tabs', async () => {
        await open([]);
        expect(screen.getByText('No video explanation yet')).toBeTruthy();
        fireEvent.click(tab('Video Solution'));
        expect(screen.getByText('No video solution yet')).toBeTruthy();
    });

    test('changing language swaps the video in place and carries over to the other tab', async () => {
        await open([
            video('een', 'en', 'English', 'explanation', { isDefault: true }), video('eta', 'ta', 'Tamil', 'explanation'),
            video('sen', 'en', 'English', 'solution'), video('sta', 'ta', 'Tamil', 'solution'),
        ]);
        expect(iframeSrc()).toContain('eenaaaaaaaaa');
        fireEvent.click(screen.getByRole('radio', { name: /Tamil/ }));
        expect(iframeSrc()).toContain('etaaaaaaaaaa');
        expect(screen.getByRole('dialog')).toBeTruthy();

        fireEvent.click(tab('Video Solution'));
        expect(iframeSrc()).toContain('staaaaaaaaaa');
    });

    test('several videos in a language can be chosen between', async () => {
        await open([video('a1', 'en', 'English', 'solution', { title: 'Brute force' }), video('a2', 'en', 'English', 'solution', { title: 'Optimal' })]);
        expect(iframeSrc()).toContain('a1aaaaaaaaa');
        fireEvent.click(screen.getByRole('radio', { name: 'Optimal' }));
        expect(iframeSrc()).toContain('a2aaaaaaaaa');
    });

    test('closing calls back and removes the player', async () => {
        const onClose = await open([video('e1', 'en', 'English', 'explanation')]);
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
        cleanup();
        expect(document.querySelector('iframe')).toBeNull();
    });

    test('arrow keys move between tabs', async () => {
        await open([video('e1', 'en', 'English', 'explanation')]);
        fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
        expect(tab('Video Solution').getAttribute('aria-selected')).toBe('true');
    });

    test('a load failure is reported and can be retried', async () => {
        getProblem.mockRejectedValueOnce({ response: { status: 500, data: { error: { message: 'Server unavailable' } } } });
        getProblem.mockResolvedValue(detail([video('e1', 'en', 'English', 'explanation')]));
        render(<ProblemVideoModal courseId="c1" problem={problem} onClose={vi.fn()} />);
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('Server unavailable');
        fireEvent.click(within(alert).getByRole('button', { name: /Try again/ }));
        await waitFor(() => expect(iframeSrc()).toContain('e1aaaaaaaaa'));
    });

    test('a student without access is told to enroll', async () => {
        getProblem.mockRejectedValue({ response: { status: 404 } });
        render(<ProblemVideoModal courseId="c1" problem={problem} onClose={vi.fn()} />);
        expect(await screen.findByText(/Enroll in this course/)).toBeTruthy();
        expect(iframeSrc()).toBeNull();
    });
});

describe('ProblemRow navigation', () => {
    const row = (over: Partial<TrackerProblem> = {}) => {
        const onOpen = vi.fn();
        const p = { ...problem, ...over };
        render(<ProblemRow problem={p} onStatusChange={vi.fn()} onOpen={onOpen} />);
        return { onOpen, p };
    };

    test('the title opens the LeetCode Solutions tab in a new tab, not the popup', () => {
        const { onOpen } = row();
        const link = screen.getByRole('link', { name: 'Two Sum' });
        expect(link.getAttribute('href')).toBe('https://leetcode.com/problems/two-sum/solutions/');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        fireEvent.click(link);
        expect(onOpen).not.toHaveBeenCalled();
    });

    test('a problem with no usable link shows its title as plain text', () => {
        row({ problemUrl: null });
        expect(screen.queryByRole('link', { name: 'Two Sum' })).toBeNull();
        expect(screen.getByText('Two Sum')).toBeTruthy();
    });

    test('the video icon only opens the popup, never a link', () => {
        const { onOpen, p } = row({ videoUrl: 'https://youtu.be/KLlXCFG5TnA', videoCount: 1 });
        for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).not.toContain('youtu');
        fireEvent.click(screen.getByRole('button', { name: 'Watch the videos for Two Sum' }));
        expect(onOpen).toHaveBeenCalledWith(p, 'video');
    });

    test('with no videos the icon still opens the popup, which explains', () => {
        const { onOpen, p } = row();
        fireEvent.click(screen.getByRole('button', { name: 'Watch the videos for Two Sum' }));
        expect(onOpen).toHaveBeenCalledWith(p, 'video');
    });

    test('Explain still opens the panel', () => {
        const { onOpen, p } = row();
        fireEvent.click(screen.getByRole('button', { name: 'Explain your approach for Two Sum' }));
        expect(onOpen).toHaveBeenCalledWith(p, 'explain');
    });
});

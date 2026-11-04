import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { VideoSolution } from '@/types/problem-course';
import type { AttemptAllowance } from '@/types/assessment-attempts';

const request = vi.fn();
const logicHistory = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/services/api/assessment-attempts.api', () => ({ attemptsService: { request: (...a: unknown[]) => request(...a) } }));
vi.mock('@/services/api/problem-course.api', () => ({ problemCourseService: { logicHistory: (...a: unknown[]) => logicHistory(...a), logicAttempt: vi.fn() } }));

const youtubeApi = vi.hoisted(() => ({ onError: null as null | ((e: { data: number }) => void), load: vi.fn() }));
vi.mock('@/lib/youtube-player-api', async importOriginal => ({
    ...(await importOriginal<typeof import('@/lib/youtube-player-api')>()),
    loadYouTubePlayerApi: youtubeApi.load,
}));

import { VideoSolutionPlayer, VIDEO_LANGUAGE_KEY, embedUrl, groupByLanguage, pickInitialVideo } from '../VideoSolutionPlayer';
import { ProblemRow } from '../ProblemRow';
import type { TrackerProblem } from '@/types/problem-course';
import { AttemptAllowanceBanner } from '@/components/assessments/AttemptAllowanceBanner';
import { validateVideoDrafts, newVideoDraft } from '@/components/admin/problem-solving/VideoSolutionsEditor';
import { ProblemLogicPractice } from '../ProblemLogicPractice';

afterEach(() => { cleanup(); vi.clearAllMocks(); document.body.innerHTML = ''; });
beforeEach(() => {
    localStorage.clear();
    youtubeApi.onError = null;
    youtubeApi.load.mockResolvedValue({
        Player: class {
            constructor(_target: unknown, options: { events: { onError?: (e: { data: number }) => void } }) { youtubeApi.onError = options.events.onError ?? null; }
        },
    });
});

const v = (code: string, name: string, extra: Partial<VideoSolution> = {}): VideoSolution => ({
    id: `id-${code}`, title: `Two Sum – ${name}`, languageCode: code, languageName: name,
    url: `https://www.youtube.com/watch?v=${code}aaaaaaaaa`, description: '', isDefault: false, ...extra,
});
const en = v('en', 'English', { isDefault: true });
const ta = v('ta', 'Tamil');
const hi = v('hi', 'Hindi', { url: 'https://cdn.example.com/two-sum-hindi.mp4' });
const iframeSrc = () => document.querySelector('iframe')?.getAttribute('src');

describe('VideoSolutionPlayer', () => {
    test('one video: plays it without a language selector', () => {
        render(<VideoSolutionPlayer videos={[en]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.queryByRole('radiogroup')).toBeNull();
        expect(iframeSrc()).toContain('https://www.youtube-nocookie.com/embed/enaaaaaaaaa?');
        expect(iframeSrc()).toContain('enablejsapi=1');
        expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    });

    test('plays inside the LMS; Watch on YouTube is a separate link to the original video', () => {
        render(<VideoSolutionPlayer videos={[v('en', 'English', { url: 'https://www.youtube.com/watch?v=enaaaaaaaaa&t=30' })]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(document.querySelector('iframe')).toBeTruthy();
        const link = screen.getByRole('link', { name: /Watch on YouTube/ });
        expect(link.getAttribute('href')).toBe('https://www.youtube.com/watch?v=enaaaaaaaaa&t=30');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        expect(screen.getAllByRole('link')).toHaveLength(1); // the player itself never links out
    });

    test('three and more languages are all selectable; only languages with a video appear', () => {
        render(<VideoSolutionPlayer videos={[en, ta, hi]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getAllByRole('radio').map(r => r.textContent?.replace('(default)', ''))).toEqual(['English', 'Tamil', 'Hindi']);
    });

    test('many languages become a dropdown that swaps the player', () => {
        const many = ['en', 'ta', 'hi', 'te', 'ml'].map(code => v(code, code.toUpperCase()));
        render(<VideoSolutionPlayer videos={many} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.queryByRole('radio')).toBeNull();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'te' } });
        expect(iframeSrc()).toContain('teaaaaaaaaa');
        expect(localStorage.getItem(VIDEO_LANGUAGE_KEY)).toBe('te');
    });

    test('several videos in one language add a second selector', () => {
        const en2 = v('en', 'English', { id: 'id-en2', title: 'Two pointers', url: 'https://www.youtube.com/watch?v=en2aaaaaaaa' });
        const en1 = v('en', 'English', { title: 'Brute force' });
        render(<VideoSolutionPlayer videos={[en1, en2, ta]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getByRole('radiogroup', { name: 'Choose a English video' })).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: 'Two pointers' }));
        expect(iframeSrc()).toContain('en2aaaaaaaa');
        expect(screen.getAllByRole('radio', { name: /English/ })).toHaveLength(1);
        // Tamil has one video: its selector goes away.
        fireEvent.click(screen.getByRole('radio', { name: 'Tamil' }));
        expect(screen.queryByRole('radiogroup', { name: /Choose a/ })).toBeNull();
    });

    test('videos with identical titles are told apart by number', () => {
        const a = v('en', 'English'), b = v('en', 'English', { id: 'id-b', url: 'https://www.youtube.com/watch?v=en2aaaaaaaa' });
        render(<VideoSolutionPlayer videos={[a, b]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getByRole('radio', { name: 'Video 2' })).toBeTruthy();
    });

    test('videos with no language: no language selector or badge, and no invented language', () => {
        const a = v('und', 'Not specified', { title: 'Two Sum – Video' });
        const b = v('und', 'Not specified', { id: 'id-b', title: 'Two Sum – Video', url: 'https://www.youtube.com/watch?v=en2aaaaaaaa' });
        render(<VideoSolutionPlayer videos={[a, b]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.queryByText('Language')).toBeNull();
        expect(screen.queryByText('Not specified')).toBeNull();
        expect(screen.getByRole('radiogroup', { name: 'Choose a video' })).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: 'Video 2' }));
        expect(localStorage.getItem(VIDEO_LANGUAGE_KEY)).toBeNull();
    });

    test('groupByLanguage keeps first-seen order and merges a language', () => {
        expect(groupByLanguage([ta, en, v('ta', 'Tamil', { id: 'x' })]).map(g => [g.name, g.videos.length])).toEqual([['Tamil', 2], ['English', 1]]);
    });

    test('a video that blocks embedding shows a message and keeps the YouTube link; the next video still plays', async () => {
        render(<VideoSolutionPlayer videos={[en, ta]} legacyUrl={null} problemTitle="Two Sum" />);
        await waitFor(() => expect(youtubeApi.onError).toBeTruthy());
        act(() => youtubeApi.onError!({ data: 150 }));
        expect(screen.getByText('This video cannot be played directly inside the LMS. You can watch it on YouTube instead.')).toBeTruthy();
        expect(document.querySelector('iframe')).toBeNull();
        expect(screen.getByRole('link', { name: /Watch on YouTube/ })).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: 'Tamil' }));
        expect(iframeSrc()).toContain('taaaaaaaaaa');
    });

    test('a private or removed video says so', async () => {
        render(<VideoSolutionPlayer videos={[en]} legacyUrl={null} problemTitle="Two Sum" />);
        await waitFor(() => expect(youtubeApi.onError).toBeTruthy());
        act(() => youtubeApi.onError!({ data: 100 }));
        expect(screen.getByText(/unavailable/)).toBeTruthy();
    });

    test('still plays when the YouTube script cannot load', async () => {
        youtubeApi.load.mockRejectedValue(new Error('blocked'));
        render(<VideoSolutionPlayer videos={[en]} legacyUrl={null} problemTitle="Two Sum" />);
        await waitFor(() => expect(youtubeApi.load).toHaveBeenCalled());
        await act(async () => { await Promise.resolve(); });
        expect(iframeSrc()).toContain('enaaaaaaaaa');
    });

    test('an invalid link shows a fallback rather than a broken player, and never an unsafe link', () => {
        render(<VideoSolutionPlayer videos={[v('en', 'English', { url: 'https://example.com/page' })]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getByText(/can’t be played inside the LMS/)).toBeTruthy();
        expect(document.querySelector('iframe')).toBeNull();
        expect(screen.getByRole('link', { name: /Open video/ }).getAttribute('href')).toBe('https://example.com/page');
        cleanup();
        render(<VideoSolutionPlayer videos={[v('en', 'English', { url: 'javascript:alert(1)' })]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.queryByRole('link')).toBeNull();
    });

    test('several videos: default selected, switching swaps the player and is remembered', () => {
        render(<VideoSolutionPlayer videos={[en, ta, hi]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getByRole('radio', { name: /English/ }).getAttribute('aria-checked')).toBe('true');
        fireEvent.click(screen.getByRole('radio', { name: 'Tamil' }));
        expect(iframeSrc()).toContain('taaaaaaaaaa');
        expect(screen.getByRole('radio', { name: 'Tamil' }).getAttribute('aria-checked')).toBe('true');
        expect(localStorage.getItem(VIDEO_LANGUAGE_KEY)).toBe('ta');
        fireEvent.click(screen.getByRole('radio', { name: 'Hindi' }));
        expect(document.querySelector('video')?.getAttribute('src')).toBe('https://cdn.example.com/two-sum-hindi.mp4');
    });

    test('uses the remembered language when available, otherwise falls back to the default', () => {
        localStorage.setItem(VIDEO_LANGUAGE_KEY, 'ta');
        render(<VideoSolutionPlayer videos={[en, ta]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getByRole('radio', { name: 'Tamil' }).getAttribute('aria-checked')).toBe('true');
        cleanup();
        localStorage.setItem(VIDEO_LANGUAGE_KEY, 'te');
        render(<VideoSolutionPlayer videos={[ta, en]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getByRole('radio', { name: /English/ }).getAttribute('aria-checked')).toBe('true');
        expect(pickInitialVideo([ta], 'te')?.languageCode).toBe('ta'); // no default → first
    });

    test('no videos: empty state; a legacy sheet link still plays', () => {
        render(<VideoSolutionPlayer videos={[]} legacyUrl={null} problemTitle="Two Sum" />);
        expect(screen.getByText('No video solution yet')).toBeTruthy();
        cleanup();
        render(<VideoSolutionPlayer videos={[]} legacyUrl="https://youtu.be/KLlXCFG5TnA" problemTitle="Two Sum" />);
        expect(iframeSrc()).toContain('https://www.youtube-nocookie.com/embed/KLlXCFG5TnA?');
    });

    test('embeds supported hosts', () => {
        expect(embedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789');
        expect(embedUrl('https://drive.google.com/file/d/1AbCdEfGhIjK/view?usp=sharing')).toBe('https://drive.google.com/file/d/1AbCdEfGhIjK/preview');
        expect(embedUrl('https://cdn.example.com/a.mp4')).toBeNull();
    });
});

describe('ProblemRow video button', () => {
    const problem = (over: Partial<TrackerProblem>): TrackerProblem => ({
        id: 'p1', title: 'Two Sum', difficulty: 'Easy', solutionUrl: null, videoUrl: null, problemUrl: null, tags: [], order: 0, externalId: null,
        defaultStatus: 'not_started', userStatus: 'not_started', completed: false, attempts: 0, completedAt: null, lastViewed: null, ...over,
    });
    const renderRow = (p: TrackerProblem, onOpen = vi.fn()) => { render(<ProblemRow problem={p} onStatusChange={vi.fn()} onOpen={onOpen} />); return onOpen; };

    test('a problem with only the older single link opens the player instead of YouTube', () => {
        const p = problem({ videoUrl: 'https://youtu.be/KLlXCFG5TnA' });
        const onOpen = renderRow(p);
        expect(screen.queryByRole('link')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Watch the videos for Two Sum' }));
        expect(onOpen).toHaveBeenCalledWith(p, 'video');
    });

    test('videos with no named language still open the player', () => {
        renderRow(problem({ videoCount: 2, videoLanguages: [], videoUrl: 'https://youtu.be/KLlXCFG5TnA' }));
        expect(screen.getByRole('button', { name: 'Watch the videos for Two Sum' })).toBeTruthy();
    });
});

describe('VideoSolutionsEditor validation', () => {
    test('several videos per language are fine; the same video twice, bad URLs, bad names and a draft default are not', () => {
        const a = newVideoDraft({ language: 'en', url: 'https://youtu.be/KLlXCFG5TnA', isDefault: true });
        const b = newVideoDraft({ language: 'ta', url: 'https://www.youtube.com/shorts/KLlXCFG5TnA' }); // same video as a
        const c = newVideoDraft({ language: 'ta', url: 'https://example.com/page' });
        const d = newVideoDraft({ language: 'other', customName: '123', url: 'https://x.dev/b.mp4' });
        const e = newVideoDraft({ language: 'hi', url: 'https://x.dev/c.mp4', isDefault: true, status: 'draft' });
        const sameLanguage = newVideoDraft({ language: 'en', url: 'https://youtu.be/KLlXCFG5TnB' });
        const errors = validateVideoDrafts([a, b, c, d, e, sameLanguage]);
        expect(errors[`${b.key}.url`]).toMatch(/Video #1 is already this video/);
        expect(errors[`${sameLanguage.key}.url`]).toBeUndefined();
        expect(errors[`${sameLanguage.key}.language`]).toBeUndefined();
        expect(errors[`${c.key}.url`]).toBeTruthy();
        expect(errors[`${d.key}.language`]).toMatch(/Type the language name/);
        expect(errors[`${e.key}.isDefault`]).toMatch(/must be published/);
        expect(errors[`${a.key}.url`]).toBeUndefined();
    });
});

const allowance = (over: Partial<AttemptAllowance> = {}): AttemptAllowance => ({
    exempt: false, used: 1, allowed: 3, defaultAllowed: 3, additionalGranted: 0, remaining: 2, limitReached: false,
    pendingRequest: null, latestRequest: null, ...over,
});
const item = { kind: 'PROBLEM_LOGIC' as const, courseId: 'c1', itemId: 'p1' };

describe('AttemptAllowanceBanner', () => {
    test('shows remaining attempts', () => {
        render(<AttemptAllowanceBanner allowance={allowance()} item={item} itemTitle="Two Sum" onRequested={vi.fn()} />);
        expect(screen.getByRole('status').textContent).toContain('Attempts remaining: 2 / 3');
    });

    test('at the limit: explains and sends a request', async () => {
        request.mockResolvedValue({});
        const onRequested = vi.fn();
        render(<AttemptAllowanceBanner allowance={allowance({ used: 3, remaining: 0, limitReached: true })} item={item} itemTitle="Two Sum" onRequested={onRequested} />);
        expect(screen.getByText('You have reached your maximum of 3 attempts.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Request Additional Attempts/ }));
        fireEvent.change(screen.getByLabelText('Additional attempts'), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Mic stopped working' } });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send request' })); });
        expect(request).toHaveBeenCalledWith(item, { reason: 'Mic stopped working', requestedCount: 2 });
        expect(onRequested).toHaveBeenCalled();
    });

    test('pending and rejected states; instructors see nothing', () => {
        const pending = { id: 'r1', status: 'PENDING' as const, requestedCount: 2 } as any;
        render(<AttemptAllowanceBanner allowance={allowance({ used: 3, remaining: 0, limitReached: true, pendingRequest: pending, latestRequest: pending })} item={item} itemTitle="T" onRequested={vi.fn()} />);
        expect(screen.getByText('Pending approval')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Request Additional Attempts/ })).toBeNull();
        cleanup();
        const rejected = { id: 'r2', status: 'REJECTED' as const, rejectionReason: 'Already scored well', requestedCount: 1 } as any;
        render(<AttemptAllowanceBanner allowance={allowance({ used: 3, remaining: 0, limitReached: true, latestRequest: rejected })} item={item} itemTitle="T" onRequested={vi.fn()} />);
        expect(screen.getByRole('alert').textContent).toContain('Already scored well');
        cleanup();
        const { container } = render(<AttemptAllowanceBanner allowance={allowance({ exempt: true })} item={item} itemTitle="T" onRequested={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });
});

describe('ProblemLogicPractice', () => {
    const settings = { maxRecordingSeconds: 300, minRecordingSeconds: 3, maxAudioBytes: 1e7, consentNoticeVersion: 'v1', audioRetentionMinutes: 30 };
    const base = { data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 }, stats: { totalAttempts: 0, completedAttempts: 0, latestScore: null, bestScore: null, averageScore: null, firstScore: null, improvement: null, lastPracticedAt: null }, activeAttemptId: null, settings, scoreHistory: [] };

    test('offers the recorder while attempts remain', async () => {
        logicHistory.mockResolvedValue({ ...base, allowance: allowance() });
        render(<ProblemLogicPractice courseId="c1" problemId="p1" problemTitle="Two Sum" />);
        await waitFor(() => expect(screen.getByText(/Attempts remaining/)).toBeTruthy());
        expect(screen.getByText('Explain Your Approach')).toBeTruthy();
        expect(screen.getByText(/I understand and agree to AI processing/)).toBeTruthy();
    });

    test('at the limit the recorder is replaced by the request option', async () => {
        logicHistory.mockResolvedValue({ ...base, allowance: allowance({ used: 3, remaining: 0, limitReached: true }) });
        render(<ProblemLogicPractice courseId="c1" problemId="p1" problemTitle="Two Sum" />);
        await waitFor(() => expect(screen.getByRole('button', { name: /Request Additional Attempts/ })).toBeTruthy());
        expect(screen.queryByText(/I understand and agree/)).toBeNull();
        expect(screen.queryByRole('button', { name: /record/i })).toBeNull();
    });
});

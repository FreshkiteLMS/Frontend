import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { VideoSolution } from '@/types/problem-course';
import type { AttemptAllowance } from '@/types/assessment-attempts';

const request = vi.fn();
const logicHistory = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/services/api/assessment-attempts.api', () => ({ attemptsService: { request: (...a: unknown[]) => request(...a) } }));
vi.mock('@/services/api/problem-course.api', () => ({ problemCourseService: { logicHistory: (...a: unknown[]) => logicHistory(...a), logicAttempt: vi.fn() } }));

import { VideoSolutionPlayer, VIDEO_LANGUAGE_KEY, embedUrl, pickInitialVideo } from '../VideoSolutionPlayer';
import { AttemptAllowanceBanner } from '@/components/assessments/AttemptAllowanceBanner';
import { validateVideoDrafts, newVideoDraft } from '@/components/admin/problem-solving/VideoSolutionsEditor';
import { ProblemLogicPractice } from '../ProblemLogicPractice';

afterEach(() => { cleanup(); vi.clearAllMocks(); document.body.innerHTML = ''; });
beforeEach(() => { localStorage.clear(); });

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
        expect(iframeSrc()).toBe('https://www.youtube-nocookie.com/embed/enaaaaaaaaa');
        expect(screen.getAllByText('English').length).toBeGreaterThan(0);
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
        expect(iframeSrc()).toBe('https://www.youtube-nocookie.com/embed/KLlXCFG5TnA');
    });

    test('embeds supported hosts', () => {
        expect(embedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789');
        expect(embedUrl('https://drive.google.com/file/d/1AbCdEfGhIjK/view?usp=sharing')).toBe('https://drive.google.com/file/d/1AbCdEfGhIjK/preview');
        expect(embedUrl('https://cdn.example.com/a.mp4')).toBeNull();
    });
});

describe('VideoSolutionsEditor validation', () => {
    test('one per language, valid URLs, custom names, published default', () => {
        const a = newVideoDraft({ language: 'en', url: 'https://youtu.be/KLlXCFG5TnA', isDefault: true });
        const b = newVideoDraft({ language: 'other', customName: 'English', url: 'https://x.dev/a.mp4' }); // same as English
        const c = newVideoDraft({ language: 'ta', url: 'https://example.com/page' });
        const d = newVideoDraft({ language: 'other', customName: '123', url: 'https://x.dev/b.mp4' });
        const e = newVideoDraft({ language: 'hi', url: 'https://x.dev/c.mp4', isDefault: true, status: 'draft' });
        const errors = validateVideoDrafts([a, b, c, d, e]);
        expect(errors[`${b.key}.language`]).toMatch(/already uses this language/);
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

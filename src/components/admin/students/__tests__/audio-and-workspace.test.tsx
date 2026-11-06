import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

const insights = vi.hoisted(() => ({
    audio: vi.fn(),
    audioCourse: vi.fn(),
    audioRecent: vi.fn(),
    batchList: vi.fn(),
    courseList: vi.fn(),
    directory: vi.fn(),
}));
const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: '', path: '/admin/students/u1' }));

vi.mock('@/services/api/admin-insights.api', () => ({
    adminInsightsService: insights,
    httpStatus: (err: { response?: { status?: number } }) => err?.response?.status,
}));
vi.mock('@/services/api/batch.api', () => ({ batchService: { getAll: vi.fn().mockResolvedValue({ data: [] }), delete: vi.fn() } }));
vi.mock('@/services/api/course.api', () => ({ courseService: { getAllCourses: vi.fn().mockResolvedValue([]), delete: vi.fn(), publish: vi.fn(), unpublish: vi.fn() } }));
vi.mock('@/components/courses/speaking/SpeakingAnalytics', () => ({
    ScorePill: ({ score }: { score: number | null }) => <span>{score ?? '—'}</span>,
    AttemptDetailView: ({ attemptId }: { attemptId: string }) => <div>attempt {attemptId}</div>,
}));
vi.mock('@/components/admin/problem-solving/LogicAssessmentsTab', () => ({ LogicAttemptDetail: () => <div>logic detail</div> }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: nav.push, replace: nav.replace }),
    usePathname: () => nav.path,
    useSearchParams: () => new URLSearchParams(nav.search),
}));

import { AudioTab } from '../student-360-audio';
import { AdminWorkspace } from '@/components/dashboard/admin-workspace';

const card = (id: string, title: string, over = {}) => ({
    courseId: id, kind: 'COURSE_QUESTION', title, thumbnailUrl: null, activities: 3, completed: 1, pending: 2, recordings: 3, evaluated: 2,
    awaitingEvaluation: 1, failed: 0, completion: 33, limitReached: 0, pendingRequests: 0, lastRecordingAt: new Date().toISOString(), ...over,
});
const attempt = (id: string, n: number, status = 'COMPLETED', score: number | null = 6) => ({
    id, kind: 'COURSE_QUESTION', attemptNumber: n, status, submittedAt: new Date(Date.now() - n * 1000).toISOString(), completedAt: null,
    score, performanceLevel: null, reviewedScore: null, reviewDecision: null, refunded: false, errorCode: null,
});
const limit = { used: 1, allowed: 3, remaining: 2, additionalGranted: 0, limitReached: false, latestRequest: null };

beforeEach(() => {
    nav.search = '';
    nav.path = '/admin/students/u1';
    Object.values(insights).forEach(f => f.mockReset());
    nav.push.mockReset();
    nav.replace.mockReset();
    insights.audio.mockResolvedValue({
        metrics: { activities: 4, completed: 2, pending: 2, recordings: 4, evaluated: 3, awaitingEvaluation: 1, failed: 0, reviewedByAdmin: 0, averageBest: 8, logicAttempts: 0, logicAverage: null, limitReached: 0, pendingRequests: 0 },
        evaluation: [{ label: 'Scored by AI', value: 3 }, { label: 'Reviewed by admin', value: 0 }, { label: 'Being evaluated', value: 1 }, { label: 'Failed', value: 0 }],
        weeks: Array.from({ length: 12 }, (_, i) => ({ start: `2026-08-${String(i + 1).padStart(2, '0')}`, recordings: i === 11 ? 4 : 0, averageScore: null })),
        courses: [card('c1', 'Speaking'), card('c2', 'Interviews', { activities: 1, completed: 1, pending: 0, completion: 100 })],
        recent: { data: [{ ...attempt('a9', 1), courseId: 'c2', courseTitle: 'Interviews', group: 'HR', questionId: 'q9', questionTitle: 'Tell me about yourself', allowed: 3 }], total: 4, page: 1, limit: 8 },
        playback: { available: false, reason: 'deleted after transcription' },
    });
    insights.audioCourse.mockResolvedValue({
        courseId: 'c1', kind: 'COURSE_QUESTION', title: 'Speaking', questions: 3, practised: 1, attempts: 3, limitations: [],
        groups: [
            { title: 'Basics', items: [
                { questionId: 'q1', title: 'Closures', isActive: true, best: 7, latest: 7, attempts: [attempt('a1', 1, 'COMPLETED', 4), attempt('a2', 2, 'COMPLETED', 7)], limit },
                { questionId: 'q2', title: 'Promises', isActive: true, best: null, latest: null, attempts: [attempt('a3', 1, 'EVALUATING', null)], limit },
            ] },
            { title: 'Advanced', items: [{ questionId: 'q3', title: 'Event loop', isActive: true, best: null, latest: null, attempts: [], limit: { ...limit, used: 0 } }] },
        ],
    });
});
afterEach(cleanup);

describe('AudioTab', () => {
    test('opens on the overview and never loads per-course records', async () => {
        render(<AudioTab studentId="u1" />);
        expect(await screen.findByText('Audio practice at a glance')).toBeTruthy();
        expect(screen.getByText('2/4')).toBeTruthy();
        expect(screen.getByText('Tell me about yourself')).toBeTruthy(); // recent recording
        expect(screen.getAllByRole('button', { name: /View course audio/ })).toHaveLength(2);
        expect(insights.audioCourse).not.toHaveBeenCalled();
        fireEvent.click(screen.getAllByRole('button', { name: /View course audio/ })[0]);
        expect(nav.replace).toHaveBeenCalledWith('/admin/students/u1?audioCourse=c1', { scroll: false });
    });

    test('a selected course shows only that course, with working filters', async () => {
        nav.search = 'tab=audio&audioCourse=c1';
        render(<AudioTab studentId="u1" />);
        expect(await screen.findByText('Closures')).toBeTruthy();
        expect(insights.audioCourse).toHaveBeenCalledWith('u1', 'c1');
        expect(screen.queryByText('Tell me about yourself')).toBeNull(); // other course's recording
        fireEvent.click(screen.getByRole('button', { name: /Awaiting evaluation/ }));
        expect(screen.getByText('Promises')).toBeTruthy();
        expect(screen.queryByText('Closures')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Multiple attempts/ }));
        expect(screen.getByText('Closures')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /^Closures/ }));
        expect(screen.getByText('Attempt 2')).toBeTruthy();
        fireEvent.click(screen.getAllByRole('button', { name: /Transcript & report/ })[0]);
        expect(await screen.findByText('attempt a2')).toBeTruthy();
    });
});

describe('AdminWorkspace', () => {
    test('tabs switch views and batch cards open the existing batch page', async () => {
        nav.path = '/admin';
        insights.batchList.mockResolvedValue({
            data: [{ id: 'b1', name: 'Evening Batch', description: '', students: 12, activeStudents: 5, courses: 2, courseTitles: ['Web'], progress: 40, completedAll: 0, completionRate: 0,
                meetingsScheduled: 0, recurringMeetings: 0, status: 'active', batchType: 'Practice group', capabilities: { meetings: false, courses: true, assignments: true, audio_practice: true, problem_solving: true }, groupCount: 2 }],
            meta: { page: 1, limit: 12, total: 1, totalPages: 1 }, facets: { types: ['Practice group'] },
        });
        nav.search = 'view=batches';
        render(<AdminWorkspace stats={null} />);
        const name = await screen.findByText('Evening Batch');
        expect(within(name.closest('li')!).getByText('Meetings off')).toBeTruthy();
        fireEvent.click(name);
        expect(nav.push).toHaveBeenCalledWith('/admin/batches/b1');
        fireEvent.change(screen.getByLabelText('Meetings'), { target: { value: 'off' } });
        expect(nav.replace).toHaveBeenCalledWith('/admin?view=batches&meetings=off', { scroll: false });
        fireEvent.click(screen.getByRole('tab', { name: /Courses/ }));
        expect(nav.replace).toHaveBeenCalledWith('/admin?view=courses', { scroll: false });
    });
});

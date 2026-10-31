import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
    progressSummary: vi.fn(),
    progressStudents: vi.fn(),
    progressMatrix: vi.fn(),
    studentDetail: vi.fn(),
    assess: vi.fn(),
    exportCsv: vi.fn(),
}));
const speaking = vi.hoisted(() => ({
    overview: vi.fn(),
    questionAnalytics: vi.fn(),
    students: vi.fn(),
    studentDetail: vi.fn(),
    attempts: vi.fn(),
    attemptDetail: vi.fn(),
    review: vi.fn(),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));

type ApiErr = { response?: { data?: { error?: { message?: string; code?: string } } } };
vi.mock('@/services/api/structured-course.api', () => ({
    structuredCourseService: api,
    apiErrorMessage: (err: ApiErr, fallback: string) => err?.response?.data?.error?.message || fallback,
    apiErrorCode: (err: ApiErr) => err?.response?.data?.error?.code,
}));
vi.mock('@/services/api/speaking.api', () => ({ speakingService: speaking }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { ProgressDashboard } from '../ProgressDashboard';

const overview = (over: Record<string, unknown> = {}) => ({
    courseId: 'c1', courseTitle: 'React Prep', enrolledStudents: 4, studentsAttempted: 2, studentsNotAttempted: 2, activeStudents7d: 1,
    activity: [{ date: new Date().toISOString().slice(0, 10), attempts: 3, averageScore: 7.2 }],
    distribution: [{ range: '0–2', count: 0 }, { range: '2–4', count: 1 }, { range: '4–6', count: 0 }, { range: '6–8', count: 1 }, { range: '8–10', count: 1 }],
    notAttemptedSample: [{ userId: 'u9', name: 'Zed Idle', email: null }],
    audioQuestions: 2, questionsWithReferenceAnswer: 1, totalAttempts: 3, completedAttempts: 3, failedAttempts: 0,
    averageScore: 7.2, highestScore: 9, lastActivity: new Date().toISOString(),
    lowPerformingQuestions: [{ questionId: 'q2', title: 'Closures', averageScore: 4.5, attempts: 2, students: 1 }],
    recentActivity: [{ attemptId: 'at1', userId: 'u1', studentName: 'Alice', questionId: 'q1', questionTitle: 'What is React?', attemptNumber: 2, status: 'COMPLETED', overallScore: 9, at: new Date().toISOString() }],
    ...over,
});

const studentRow = (over: Record<string, unknown> = {}) => ({
    userId: 'u1', name: 'Alice', email: 'alice@test.dev', questionsAttempted: 1, totalQuestions: 2, totalAttempts: 2,
    averageScore: 8.1, highestScore: 9, latestScore: 9, improvement: 1.5, lastActivity: new Date().toISOString(), ...over,
});
const paged = <T,>(data: T[]) => ({ data, meta: { page: 1, limit: 25, total: data.length, totalPages: 1 } });

const attemptRow = (over: Record<string, unknown> = {}) => ({
    id: 'at1', courseId: 'c1', questionId: 'q1', attemptNumber: 1, status: 'COMPLETED', processing: false, overallScore: 7.3, performanceLevel: 'GOOD',
    error: null, nextRetryAt: null, audio: { received: true, durationSeconds: 40, deleted: true, deletedAt: '' }, transcriptLanguage: 'en',
    latestReview: null, submittedAt: '2026-10-30T10:00:00Z', completedAt: '2026-10-30T10:01:00Z', createdAt: '', updatedAt: '', ...over,
});

const metrics = { total: 1, counts: { NOT_STARTED: 1, IN_PROGRESS: 0, COMPLETED: 0, PASS: 0, FAIL: 0 }, attempted: 0, finished: 0, assessed: 0, percentAttempted: 0, percentFinished: 0, percentPassed: 0 };
const progressSummary = (assignments = 1) => ({
    courseId: 'c1', courseTitle: 'React Prep', totalStudents: 4, totalQuestions: 2 + assignments,
    questionsByType: { audio_question: 2, assignment: assignments },
    statusTotals: { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, PASS: 0, FAIL: 0 },
    studentsStarted: 1, studentsFinished: 0, averagePercentFinished: 0, percentPairsFinished: 0, percentPairsPassed: 0, lastActivity: null,
});

const speakingDetail = () => ({
    student: { userId: 'u1', name: 'Alice', email: 'alice@test.dev', enrolled: true },
    questions: [
        { questionId: 'q1', title: 'What is React?', topic: 'React', isActive: true, attempts: [attemptRow({ id: 'at2', attemptNumber: 2, overallScore: 9 }), attemptRow({ id: 'at1', attemptNumber: 1, overallScore: 6 })], latestScore: 9, bestScore: 9, latestMissedConcepts: ['Reconciliation'], latestImprovements: ['Explain rendering'] },
        { questionId: 'q2', title: 'Closures', topic: 'JS', isActive: true, attempts: [], latestScore: null, bestScore: null, latestMissedConcepts: [], latestImprovements: [] },
    ],
});
const progressDetail = () => ({
    student: { userId: 'u1', name: 'Alice', email: 'alice@test.dev' },
    metrics: { overall: metrics, audio: metrics, assignment: metrics, lastActivity: null, audioMarks: { scored: 1, unscored: 1, obtained: 9, max: 10, percent: 90 } },
    questions: [
        { id: 'a1', courseId: 'c1', externalId: 'a1', type: 'assignment', title: 'Build a form', prompt: '', topic: null, difficulty: null, expectedDurationMinutes: null, resourceUrl: null, evaluationCriteria: null, dueDate: null, maxMarks: null, displayOrder: 0, isActive: true, createdAt: '', updatedAt: '',
            progress: { status: 'COMPLETED', version: 2, updatedAt: null, updatedByRole: 'student', assessmentNotes: null, assessedAt: null, marksObtained: null, marksMax: null, marksUpdatedAt: null } },
        { id: 'q1', courseId: 'c1', externalId: 'q1', type: 'audio_question', title: 'What is React?', prompt: '', topic: null, difficulty: null, expectedDurationMinutes: null, resourceUrl: null, evaluationCriteria: null, dueDate: null, maxMarks: 10, displayOrder: 1, isActive: true, createdAt: '', updatedAt: '',
            progress: { status: 'COMPLETED', version: 3, updatedAt: null, updatedByRole: 'student', assessmentNotes: null, assessedAt: null, marksObtained: 9, marksMax: 10, marksUpdatedAt: null } },
    ],
    history: [],
});

beforeEach(() => {
    vi.clearAllMocks();
    api.progressSummary.mockResolvedValue(progressSummary());
    speaking.overview.mockResolvedValue(overview());
    speaking.questionAnalytics.mockResolvedValue([]);
    speaking.students.mockResolvedValue(paged([studentRow(), studentRow({ userId: 'u2', name: 'Bob', email: 'bob@test.dev', totalAttempts: 0, questionsAttempted: 0, averageScore: null, highestScore: null, latestScore: null, improvement: null, lastActivity: null })]));
    speaking.studentDetail.mockResolvedValue(speakingDetail());
    api.studentDetail.mockResolvedValue(progressDetail());
});
afterEach(cleanup);

describe('admin dashboard — AI speaking first', () => {
    test('opens on AI speaking analytics, not the old status table', async () => {
        render(<ProgressDashboard courseId="c1" />);
        expect(await screen.findByText('Students practising')).toBeTruthy();
        expect(screen.getByText('2/4')).toBeTruthy();
        expect(screen.getByText('Average AI score')).toBeTruthy();
        expect(screen.getByText('Assessments per day')).toBeTruthy();
        expect(screen.getByText('Score distribution')).toBeTruthy();
        // The old status columns are gone from the default view.
        await screen.findByRole('button', { name: 'Alice' });
        for (const old of ['Not started', 'In progress', 'Completed', 'Pass', 'Fail']) {
            expect(screen.queryByRole('columnheader', { name: old })).toBeNull();
        }
        expect(screen.queryByText('AI practice score')).toBeNull();
        expect(api.progressStudents).not.toHaveBeenCalled();
    });

    test('shows scores as labelled pills and flags students who need attention', async () => {
        speaking.students.mockResolvedValue(paged([studentRow({ userId: 'u3', name: 'Cara', averageScore: 4.2, highestScore: 5, latestScore: 5, improvement: -1.2 })]));
        render(<ProgressDashboard courseId="c1" />);
        const row = (await screen.findByText('Cara')).closest('tr')!;
        expect(within(row).getByText('Needs help')).toBeTruthy();
        expect(within(row).getByText('4.2')).toBeTruthy();
        expect(within(row).getByText('-1.2')).toBeTruthy();
    });

    test('students who have not started show a clear label and dashes, not zeros', async () => {
        render(<ProgressDashboard courseId="c1" />);
        const row = (await screen.findByText('Bob')).closest('tr')!;
        expect(within(row).getByText('Not started')).toBeTruthy();
        expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
    });

    test('sorts on the server and toggles direction', async () => {
        render(<ProgressDashboard courseId="c1" />);
        await screen.findByRole('button', { name: 'Alice' });
        fireEvent.click(screen.getByRole('button', { name: /Avg score/ }));
        await waitFor(() => expect(speaking.students).toHaveBeenLastCalledWith('c1', expect.objectContaining({ sort: 'average', dir: 'desc' })));
        expect(screen.getByRole('columnheader', { name: /Avg score/ }).getAttribute('aria-sort')).toBe('descending');
        fireEvent.click(screen.getByRole('button', { name: /Avg score/ }));
        await waitFor(() => expect(speaking.students).toHaveBeenLastCalledWith('c1', expect.objectContaining({ sort: 'average', dir: 'asc' })));
        expect(screen.getByRole('columnheader', { name: /Avg score/ }).getAttribute('aria-sort')).toBe('ascending');
    });

    test('shows a helpful empty state before anyone has practised', async () => {
        speaking.overview.mockResolvedValue(overview({ totalAttempts: 0, completedAttempts: 0, studentsAttempted: 0, averageScore: null, highestScore: null, lastActivity: null, activity: [], recentActivity: [], lowPerformingQuestions: [] }));
        render(<ProgressDashboard courseId="c1" />);
        expect(await screen.findByText('No speaking practice yet')).toBeTruthy();
        expect(screen.queryByText('NaN')).toBeNull();
    });
});

describe('student drawer', () => {
    async function openAlice() {
        render(<ProgressDashboard courseId="c1" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Alice' }));
        return screen.findByRole('dialog');
    }

    test('shows AI practice analytics and no manual status or assess button for audio questions', async () => {
        const dialog = await openAlice();
        await within(dialog).findByText('Questions practised');
        expect(within(dialog).getByText('1/2')).toBeTruthy();
        expect(within(dialog).getByText('What is React?')).toBeTruthy();
        expect(within(dialog).getByText('Reconciliation')).toBeTruthy();
        expect(within(dialog).getByText('Explain rendering')).toBeTruthy();
        expect(within(dialog).getByText('Not practised')).toBeTruthy();
        expect(within(dialog).queryByRole('button', { name: 'Assess' })).toBeNull();
        expect(within(dialog).queryByText('Completed')).toBeNull();
    });

    test('keeps instructor assessment for assignments, in their own tab', async () => {
        const dialog = await openAlice();
        fireEvent.click(await within(dialog).findByRole('tab', { name: /Assignments \(1\)/ }));
        expect(within(dialog).getByText('Build a form')).toBeTruthy();
        api.assess.mockResolvedValue({});
        fireEvent.click(within(dialog).getByRole('button', { name: 'Assess' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(api.assess).toHaveBeenCalledWith('c1', 'u1', 'a1', expect.objectContaining({ status: 'PASS', expectedVersion: 2 })));
    });

    test('opens an attempt report from a score chip', async () => {
        speaking.attemptDetail.mockResolvedValue({
            ...attemptRow({ id: 'at2' }), student: { userId: 'u1', name: 'Alice', email: null }, question: { id: 'q1', title: 'What is React?', prompt: '', topic: null, difficulty: null, expectedAnswer: null, keyConcepts: [], evaluationCriteria: null },
            report: null, transcript: null, reviews: [], processingMeta: { transcriptionAttempts: 1, evaluationAttempts: 1, transcriptionModel: 'w', statusHistory: [], consentNoticeVersion: 'v1', consentAt: '', audioMimeType: null, audioSizeBytes: null, audioDeletionReason: 'transcribed' },
        });
        const dialog = await openAlice();
        fireEvent.click(await within(dialog).findByRole('button', { name: /Open attempt 2, score 9/ }));
        await waitFor(() => expect(speaking.attemptDetail).toHaveBeenCalledWith('c1', 'at2'));
        expect(await screen.findByText(/Administrative review/)).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('score grid and assignments', () => {
    test('the grid shows best AI scores as a heat map for audio questions only', async () => {
        api.progressMatrix.mockResolvedValue({
            data: [
                { userId: 'u1', name: 'Alice', email: null, cells: { q1: { status: 'COMPLETED', updatedAt: null, marksObtained: 9, marksMax: 10, marksUpdatedAt: null } } },
                { userId: 'u2', name: 'Bob', email: null, cells: { q1: { status: 'COMPLETED', updatedAt: null, marksObtained: 0, marksMax: 10, marksUpdatedAt: null } } },
            ],
            meta: { page: 1, limit: 20, total: 2, totalPages: 1 }, questionTotal: 2,
            questions: [
                { id: 'q1', title: 'What is React?', type: 'audio_question', topic: null, maxMarks: 10, displayOrder: 0 },
                { id: 'q2', title: 'Closures', type: 'audio_question', topic: null, maxMarks: 100, displayOrder: 1 },
            ],
        });
        render(<ProgressDashboard courseId="c1" />);
        fireEvent.click(await screen.findByRole('tab', { name: /Score grid/ }));
        await screen.findByText('Closures');
        expect(api.progressMatrix).toHaveBeenCalledWith('c1', expect.objectContaining({ type: 'audio_question' }));
        const alice = screen.getByText('Alice').closest('tr')!;
        const bob = screen.getByText('Bob').closest('tr')!;
        expect(within(alice).getByText('9')).toBeTruthy();
        // A real zero is shown as 0; a question never practised is a dash.
        expect(within(bob).getByText('0')).toBeTruthy();
        expect(within(bob).getByText('Not practised')).toBeTruthy();
        expect(screen.getByLabelText('Score colour legend')).toBeTruthy();
        // No status chips in the audio grid.
        expect(screen.queryByText('Done')).toBeNull();
    });

    test('the assignments tab uses the status workflow for assignments only', async () => {
        api.progressStudents.mockResolvedValue({
            data: [{ userId: 'u1', name: 'Alice', email: 'alice@test.dev', completion: 'in_progress', overall: { ...metrics, finished: 0 }, audio: metrics, assignment: metrics, lastActivity: null, audioMarks: { scored: 0, unscored: 0, obtained: 0, max: 0, percent: null } }],
            meta: { page: 1, limit: 25, total: 1, totalPages: 1 }, totalQuestions: 1,
        });
        render(<ProgressDashboard courseId="c1" />);
        fireEvent.click(await screen.findByRole('tab', { name: /Assignments/ }));
        const row = (await screen.findByText('alice@test.dev')).closest('tr')!;
        expect(within(row).getByText('0/1')).toBeTruthy();
        expect(api.progressStudents).toHaveBeenLastCalledWith('c1', expect.objectContaining({ type: 'assignment' }));
        fireEvent.change(screen.getByLabelText('Completion'), { target: { value: 'finished' } });
        await waitFor(() => expect(api.progressStudents).toHaveBeenLastCalledWith('c1', expect.objectContaining({ type: 'assignment', completion: 'finished' })));
    });

    test('the assignments tab says so when the course has none', async () => {
        api.progressSummary.mockResolvedValue(progressSummary(0));
        api.progressStudents.mockResolvedValue(paged([]));
        render(<ProgressDashboard courseId="c1" />);
        fireEvent.click(await screen.findByRole('tab', { name: /Assignments/ }));
        expect(await screen.findByText(/no assignments/i)).toBeTruthy();
    });
});

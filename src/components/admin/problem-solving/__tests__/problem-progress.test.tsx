import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProblemStudentProgressRow } from '@/types/problem-course';

const studentProgress = vi.hoisted(() => vi.fn());
const logicAssessments = vi.hoisted(() => vi.fn());
vi.mock('@/services/api/problem-course.api', () => ({
    problemCourseService: {
        studentProgress,
        logicAssessments,
        adminProblems: vi.fn().mockResolvedValue([{ id: 's1', title: 'Arrays', problems: [] }]),
        logicOverview: vi.fn().mockResolvedValue({ studentsAttempted: 1, totalSubmitted: 2, completed: 2, pending: 0, failed: 0, averageScore: 7.4 }),
        logicAssessment: vi.fn(),
    },
}));

import { ProblemProgressDashboard } from '../ProblemProgressDashboard';
import { LogicAssessmentReport } from '@/components/courses/problem-tracker/LogicAssessmentReport';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const row = (over: Partial<ProblemStudentProgressRow> = {}): ProblemStudentProgressRow => ({
    userId: 'u-asha', name: 'Asha', email: 'asha@x.dev', studentCode: 'FK-2026-00001',
    problems: { total: 20, solved: 5, attempted: 2, percentSolved: 25 },
    logic: { attempts: 2, completed: 2, problemsExplained: 2, averageScore: 7.4, bestScore: 8.7, latestScore: 6.1 },
    lastActivity: '2026-11-01T10:00:00.000Z',
    ...over,
});
const page = (rows: ProblemStudentProgressRow[]) => ({
    data: rows,
    meta: { page: 1, limit: 25, total: rows.length, totalPages: 1 },
    summary: { students: rows.length, active: 1, totalProblems: 20, averageSolvedPercent: 13, studentsExplained: 1, averageLogicScore: 7.4 },
});

describe('ProblemProgressDashboard', () => {
    test('shows each student with problems solved and logic scores out of 10', async () => {
        studentProgress.mockResolvedValue(page([row(), row({ userId: 'u-ben', name: 'Ben', problems: { total: 20, solved: 0, attempted: 0, percentSolved: 0 }, logic: { attempts: 0, completed: 0, problemsExplained: 0, averageScore: null, bestScore: null, latestScore: null }, lastActivity: null })]));
        render(<ProblemProgressDashboard courseId="c1" />);
        expect(await screen.findByText('Asha')).toBeTruthy();
        expect(screen.getByText('5 / 20')).toBeTruthy();
        expect(screen.getAllByText('7.4/10').length).toBeGreaterThan(0);
        expect(screen.getByText('8.7/10')).toBeTruthy();
        expect(screen.getByText('Never')).toBeTruthy();
        // Ben has nothing to drill into.
        const results = screen.getAllByRole('button', { name: /Results/ });
        expect((results[1] as HTMLButtonElement).disabled).toBe(true);
    });

    test('opening a student shows only their logic assessments', async () => {
        studentProgress.mockResolvedValue(page([row()]));
        logicAssessments.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
        render(<ProblemProgressDashboard courseId="c1" />);
        fireEvent.click(await screen.findByRole('button', { name: /Results/ }));
        await waitFor(() => expect(logicAssessments).toHaveBeenCalledWith('c1', expect.objectContaining({ userId: 'u-asha' })));
        expect(screen.getByText('Showing only Asha')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Show all students' }));
        await waitFor(() => expect(logicAssessments).toHaveBeenLastCalledWith('c1', expect.objectContaining({ userId: undefined })));
    });

    test('search is sent to the server', async () => {
        studentProgress.mockResolvedValue(page([row()]));
        render(<ProblemProgressDashboard courseId="c1" />);
        await screen.findByText('Asha');
        fireEvent.change(screen.getByLabelText('Search students'), { target: { value: 'ash' } });
        await waitFor(() => expect(studentProgress).toHaveBeenLastCalledWith('c1', expect.objectContaining({ q: 'ash' })), { timeout: 2000 });
    });
});

describe('LogicAssessmentReport', () => {
    test('shows the overall and category scores out of 10', () => {
        render(<LogicAssessmentReport report={{
            id: 'r1', overallScore: 8.7, maxScore: 10, verdict: 'Good', capped: false, approachVerdict: 'CORRECT',
            identifiedApproach: 'Hash map', statedTimeComplexity: 'O(n)', statedSpaceComplexity: 'O(n)',
            categoryScores: [{ category: 'approach', label: 'Approach & algorithm', applicable: true, score: 8.5, maxScore: 10, weight: 25, feedback: 'Good.' }],
            strengths: [], improvements: [], missingConcepts: [], misconceptions: [], correctApproach: '', finalFeedback: '',
            confidence: 'HIGH', usedReferenceSolution: true, usedProblemStatement: true,
            metadata: { evaluationModel: 'm', transcriptionModel: 't', promptVersion: 'p', rubricVersion: 'r', createdAt: '2026-11-01T00:00:00Z' },
        } as never} />);
        expect(screen.getByRole('img', { name: 'Overall score 8.7 out of 10' })).toBeTruthy();
        expect(screen.getByRole('meter', { name: 'Approach & algorithm' }).getAttribute('aria-valuemax')).toBe('10');
    });
});

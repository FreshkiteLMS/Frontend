import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AptitudeConceptPage, AptitudeQuestionPage, AptitudeSubmitResult } from '@/types/aptitude';

const submit = vi.fn();
const start = vi.fn();
vi.mock('@/services/api/aptitude.api', () => ({
    newRequestId: (() => { let n = 0; return () => `req-${++n}`; })(),
    aptitudeService: {
        submit: (...a: unknown[]) => submit(...a),
        start: (...a: unknown[]) => start(...a),
        attempts: vi.fn().mockResolvedValue([]),
    },
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { AptitudeQuestionView } from '../AptitudeQuestionView';
import { AptitudeConceptView } from '../AptitudeConceptView';
import { RichQuestionText } from '../aptitude-ui';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const progress = (o = {}) => ({ workflowStatus: 'not_started' as const, latestResult: 'not_evaluated' as const, firstAttemptResult: 'not_evaluated' as const, attempts: 0, lastAttemptAt: null, completedAt: null, ...o });
const page = (o: Partial<AptitudeQuestionPage> = {}): AptitudeQuestionPage => ({
    course: { id: 'c1', title: 'Quant' },
    concept: { id: 'k1', title: 'Time and Distance' },
    question: { id: 'q1', number: 1, totalInConcept: 3, questionText: 'A train travels 120 km in 2 hours. What is its average speed?', options: [{ id: 'A', text: '40 km/hr' }, { id: 'B', text: '50 km/hr' }, { id: 'C', text: '60 km/hr' }], difficulty: null, answerable: true },
    previousId: null, nextId: 'q2', progress: progress(), review: null, ...o,
});
const result = (o: Partial<AptitudeSubmitResult> = {}): AptitudeSubmitResult => ({
    attemptId: 'a1', attemptNumber: 1, selectedOption: 'A', isCorrect: false, result: 'fail', correctOption: 'C', explanation: 'Speed = 120 / 2 = 60 km/hr.',
    submittedAt: new Date().toISOString(), questionChangedSince: false, replayed: false, progress: progress({ workflowStatus: 'completed', latestResult: 'fail', firstAttemptResult: 'fail', attempts: 1 }), ...o,
});
const renderQ = (data = page()) => {
    const onAnswered = vi.fn();
    const onNavigate = vi.fn();
    start.mockResolvedValue(progress({ workflowStatus: 'in_progress' }));
    render(<AptitudeQuestionView courseId="c1" data={data} onBack={vi.fn()} onNavigate={onNavigate} onAnswered={onAnswered} />);
    return { onAnswered, onNavigate };
};

describe('AptitudeQuestionView', () => {
    test('marks the question in progress on open and shows no answer before submitting', async () => {
        renderQ();
        await waitFor(() => expect(start).toHaveBeenCalledWith('c1', 'q1'));
        expect(await screen.findByText('In progress')).toBeTruthy();
        expect(screen.queryByText(/Correct answer/)).toBeNull();
        expect(screen.queryByText(/Explanation/)).toBeNull();
        expect((screen.getByRole('button', { name: 'Submit answer' }) as HTMLButtonElement).disabled).toBe(true);
    });

    test('a wrong answer shows Fail, the correct answer and the explanation; options lock', async () => {
        submit.mockResolvedValue(result());
        const { onAnswered } = renderQ();
        fireEvent.click(screen.getByLabelText(/40 km\/hr/));
        fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
        expect(await screen.findByText(/Fail — not quite/)).toBeTruthy();
        expect(submit).toHaveBeenCalledWith('c1', 'q1', 'A', 'req-1');
        const status = screen.getByRole('status');
        expect(within(status).getByText(/C\. 60 km\/hr/)).toBeTruthy();
        expect(within(status).getByText(/Speed = 120 \/ 2 = 60 km\/hr\./)).toBeTruthy();
        expect(onAnswered).toHaveBeenCalled();
        expect(screen.getByLabelText(/50 km\/hr/).matches(':disabled')).toBe(true);
        expect(screen.getByText('Completed')).toBeTruthy();
    });

    test('a failed request keeps the same request id for the retry', async () => {
        submit.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(result({ isCorrect: true, result: 'pass', selectedOption: 'C' }));
        renderQ();
        fireEvent.click(screen.getByLabelText(/60 km\/hr/));
        fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
        expect(await screen.findByRole('alert')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Retry submit' }));
        expect(await screen.findByText(/Pass — correct answer/)).toBeTruthy();
        expect(submit.mock.calls.map(c => c[3])).toEqual(['req-2', 'req-2']);
    });

    test('try again clears the result; next navigates', async () => {
        submit.mockResolvedValue(result());
        const { onNavigate } = renderQ();
        fireEvent.click(screen.getByLabelText(/40 km\/hr/));
        fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
        await screen.findByText(/Fail — not quite/);
        fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
        expect(screen.queryByText(/Fail — not quite/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Next/ }));
        expect(onNavigate).toHaveBeenCalledWith('q2');
    });

    test('a previously answered question offers the last result without revealing it by default', () => {
        renderQ(page({ progress: progress({ workflowStatus: 'completed', latestResult: 'pass', attempts: 1 }), review: { ...result({ isCorrect: true, result: 'pass', selectedOption: 'C' }) } }));
        expect(start).not.toHaveBeenCalled();
        expect(screen.getByText(/Your last answer/)).toBeTruthy();
        expect(screen.queryByText(/Correct answer:/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
        expect(screen.getByText(/Correct answer:/)).toBeTruthy();
    });
});

describe('AptitudeConceptView', () => {
    const row = (id: string, n: number, o = {}) => ({ id, number: n, preview: `Question ${n}`, difficulty: null, ...progress(), ...o });
    const data: AptitudeConceptPage = {
        course: { id: 'c1', title: 'Quant' },
        concept: { id: 'k1', title: 'Percentage', description: '' },
        stats: { total: 3, attempted: 2, inProgress: 0, completed: 2, passed: 1, failed: 1, remaining: 1, attempts: 3, correctAttempts: 1, incorrectAttempts: 2, firstAttemptCorrect: 0, progress: 67, accuracy: 33.3, firstAttemptAccuracy: 0, lastActivityAt: null },
        questions: [
            row('q1', 1, { workflowStatus: 'completed', latestResult: 'pass', attempts: 2 }),
            row('q2', 2, { workflowStatus: 'completed', latestResult: 'fail', attempts: 1 }),
            row('q3', 3),
        ],
    };

    test('filters keep completed and passed apart', () => {
        render(<AptitudeConceptView data={data} onBack={vi.fn()} onOpenQuestion={vi.fn()} />);
        const pick = (name: RegExp) => fireEvent.click(screen.getByRole('radio', { name }));
        pick(/^Completed/);
        expect(screen.getAllByText(/^Question \d$/).map(e => e.textContent)).toEqual(['Question 1', 'Question 2']);
        pick(/^Failed/);
        expect(screen.getAllByText(/^Question \d$/).map(e => e.textContent)).toEqual(['Question 2']);
        pick(/^Not started/);
        expect(screen.getAllByText(/^Question \d$/).map(e => e.textContent)).toEqual(['Question 3']);
    });

    test('continue opens the first unanswered question', () => {
        const open = vi.fn();
        render(<AptitudeConceptView data={data} onBack={vi.fn()} onOpenQuestion={open} />);
        fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
        expect(open).toHaveBeenCalledWith('q3');
    });
});

test('question text is rendered as text, with document images', () => {
    const { container } = render(<RichQuestionText text={'<b>x</b> see [Image: https://cdn.dev/f.png] then 2 × 3'} />);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>x</b>');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.dev/f.png');
});

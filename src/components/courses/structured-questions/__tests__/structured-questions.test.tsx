import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MySummary, ProgressMetrics, QuestionImport, StudentQuestion } from '@/types/structured-questions';
import { isOverdue, studentActions } from '@/lib/question-progress';

const api = vi.hoisted(() => ({
    myQuestions: vi.fn(),
    mySummary: vi.fn(),
    setMyStatus: vi.fn(),
    previewFromSheet: vi.fn(),
    previewFromFile: vi.fn(),
    commitImport: vi.fn(),
    downloadTemplate: vi.fn(),
    progressSummary: vi.fn(),
    progressStudents: vi.fn(),
    studentDetail: vi.fn(),
    assess: vi.fn(),
    exportCsv: vi.fn(),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));

type ApiErr = { response?: { data?: { error?: { message?: string; code?: string; details?: unknown } } } };
vi.mock('@/services/api/structured-course.api', () => ({
    structuredCourseService: api,
    apiErrorMessage: (err: ApiErr, fallback: string) => err?.response?.data?.error?.message || fallback,
    apiErrorCode: (err: ApiErr) => err?.response?.data?.error?.code,
    apiErrorDetails: (err: ApiErr) => err?.response?.data?.error?.details,
}));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { StudentQuestionsPanel } from '../StudentQuestionsPanel';
import { QuestionImportPanel } from '../QuestionImportPanel';
import { ProgressDashboard } from '../ProgressDashboard';

const metrics = (total: number, finished = 0): ProgressMetrics => ({
    total,
    counts: { NOT_STARTED: total - finished, IN_PROGRESS: 0, COMPLETED: finished, PASS: 0, FAIL: 0 },
    attempted: finished, finished, assessed: 0,
    percentAttempted: 0, percentFinished: total ? (finished / total) * 100 : 0, percentPassed: 0,
});
const summary: MySummary = { overall: metrics(2), byType: { audio_question: metrics(1), assignment: metrics(1) } };

function question(over: Partial<StudentQuestion> = {}): StudentQuestion {
    return {
        id: 'q1', courseId: 'c1', externalId: 'react-q1', type: 'audio_question', title: 'What is React?',
        prompt: 'Explain React.', topic: 'Basics', difficulty: 'beginner', expectedDurationMinutes: 5,
        resourceUrl: 'https://react.dev', evaluationCriteria: null, dueDate: null, displayOrder: 0, isActive: true,
        createdAt: '', updatedAt: '',
        progress: { status: 'NOT_STARTED', version: 0, updatedAt: null, updatedByRole: null, assessmentNotes: null, assessedAt: null, allowedStudentStatuses: ['IN_PROGRESS', 'COMPLETED'] },
        ...over,
    };
}

const page = <T,>(data: T[]) => ({ data, meta: { page: 1, limit: 15, total: data.length, totalPages: 1 }, topics: ['Basics'] });

beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
});
afterEach(cleanup);

describe('question-progress helpers', () => {
    test('student actions never include PASS or FAIL', () => {
        for (const s of ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PASS', 'FAIL'] as const) {
            expect(studentActions(s).map(a => a.status)).not.toContain('PASS');
            expect(studentActions(s).map(a => a.status)).not.toContain('FAIL');
        }
        expect(studentActions('PASS')).toEqual([]);
        expect(studentActions('FAIL').map(a => a.label)).toEqual(['Try again']);
    });

    test('isOverdue compares calendar dates', () => {
        const now = new Date(2026, 5, 15);
        expect(isOverdue('2026-06-14', now)).toBe(true);
        expect(isOverdue('2026-06-15', now)).toBe(false);
        expect(isOverdue(null, now)).toBe(false);
    });
});

describe('StudentQuestionsPanel', () => {
    test('shows a loading state, then questions with text status labels', async () => {
        api.myQuestions.mockResolvedValue(page([question(), question({ id: 'a1', type: 'assignment', title: 'Build a form', dueDate: '2000-01-01' })]));
        api.mySummary.mockResolvedValue(summary);
        render(<StudentQuestionsPanel courseId="c1" />);
        expect(screen.getByLabelText('Loading questions')).toBeTruthy();
        expect(await screen.findByText('What is React?')).toBeTruthy();
        expect(screen.getAllByText('Not started').length).toBeGreaterThan(0);
        expect(screen.getByText(/overdue/)).toBeTruthy();
    });

    test('shows an empty state', async () => {
        api.myQuestions.mockResolvedValue(page([]));
        api.mySummary.mockResolvedValue(summary);
        render(<StudentQuestionsPanel courseId="c1" />);
        expect(await screen.findByText(/no questions or assignments yet/i)).toBeTruthy();
    });

    test('shows an error state with retry', async () => {
        api.myQuestions.mockRejectedValueOnce({ response: { data: { error: { message: 'Course not found.' } } } });
        api.mySummary.mockResolvedValue(summary);
        render(<StudentQuestionsPanel courseId="c1" />);
        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.getByRole('alert').textContent).toContain('Course not found.');
        api.myQuestions.mockResolvedValue(page([question()]));
        fireEvent.click(screen.getByText('Retry'));
        expect(await screen.findByText('What is React?')).toBeTruthy();
    });

    const confirmed = (status: StudentQuestion['progress']['status'], version: number, allowed: StudentQuestion['progress']['status'][]) => ({
        questionId: 'q1', studentUserId: 'u', status, version, updatedAt: '2026-01-01T00:00:00Z', updatedByRole: 'student',
        assessmentNotes: null, assessedAt: null, allowedStudentStatuses: allowed, changed: true,
    });
    const checkedStep = () => screen.getByRole('radio', { checked: true }).textContent;

    test('updates the status only after the server confirms it, sending the version', async () => {
        api.myQuestions.mockResolvedValue(page([question()]));
        api.mySummary.mockResolvedValue(summary);
        let resolve!: (v: unknown) => void;
        api.setMyStatus.mockReturnValue(new Promise(r => { resolve = r; }));
        render(<StudentQuestionsPanel courseId="c1" />);
        fireEvent.click(await screen.findByRole('radio', { name: 'In progress' }));

        expect(api.setMyStatus).toHaveBeenCalledWith('c1', 'q1', 'IN_PROGRESS', 0);
        expect(screen.getByText('Saving…')).toBeTruthy();
        expect(checkedStep()).toBe('Not started');

        resolve(confirmed('IN_PROGRESS', 1, ['COMPLETED']));
        await waitFor(() => expect(checkedStep()).toBe('In progress'));
        expect(screen.getByText('Saved as in progress')).toBeTruthy();
        expect(toast.success).not.toHaveBeenCalled();
        // The next step uses the version the server returned.
        api.setMyStatus.mockResolvedValue(confirmed('COMPLETED', 2, ['IN_PROGRESS']));
        fireEvent.click(screen.getByRole('radio', { name: 'Completed' }));
        expect(api.setMyStatus).toHaveBeenLastCalledWith('c1', 'q1', 'COMPLETED', 1);
        await waitFor(() => expect(checkedStep()).toBe('Completed'));
        expect((screen.getByRole('radio', { name: 'Not started' }) as HTMLButtonElement).disabled).toBe(true);
    });

    test('a double click sends only one request', async () => {
        api.myQuestions.mockResolvedValue(page([question()]));
        api.mySummary.mockResolvedValue(summary);
        let resolve!: (v: unknown) => void;
        api.setMyStatus.mockReturnValue(new Promise(r => { resolve = r; }));
        render(<StudentQuestionsPanel courseId="c1" />);
        const completed = await screen.findByRole('radio', { name: 'Completed' });
        fireEvent.click(completed);
        fireEvent.click(completed);
        expect(api.setMyStatus).toHaveBeenCalledTimes(1);
        resolve(confirmed('COMPLETED', 1, ['IN_PROGRESS']));
        await waitFor(() => expect(checkedStep()).toBe('Completed'));
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('a version conflict shows the latest server state instead of an error', async () => {
        api.myQuestions.mockResolvedValue(page([question()]));
        api.mySummary.mockResolvedValue(summary);
        api.setMyStatus.mockRejectedValue({ response: { data: { error: {
            code: 'VERSION_CONFLICT',
            message: 'This question was updated in another tab or by your instructor. The latest status is now shown.',
            details: { questionId: 'q1', progress: { status: 'COMPLETED', version: 3, allowedStudentStatuses: ['IN_PROGRESS'], updatedAt: null, updatedByRole: 'student', assessmentNotes: null, assessedAt: null } },
        } } } });
        render(<StudentQuestionsPanel courseId="c1" />);
        fireEvent.click(await screen.findByRole('radio', { name: 'In progress' }));
        await waitFor(() => expect(checkedStep()).toBe('Completed'));
        expect(toast).toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('keeps the previous status when the update fails', async () => {
        api.myQuestions.mockResolvedValue(page([question()]));
        api.mySummary.mockResolvedValue(summary);
        api.setMyStatus.mockRejectedValue({ response: { data: { error: { message: 'Network down' } } } });
        render(<StudentQuestionsPanel courseId="c1" />);
        fireEvent.click(await screen.findByRole('radio', { name: 'In progress' }));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Network down'));
        expect(checkedStep()).toBe('Not started');
    });

    test('shows the instructor outcome for assessed questions, with retry after a fail', async () => {
        api.myQuestions.mockResolvedValue(page([
            question({ progress: { status: 'PASS', version: 2, updatedAt: null, updatedByRole: 'teacher', assessmentNotes: 'Great', assessedAt: null, allowedStudentStatuses: [] } }),
            question({ id: 'q2', title: 'Props vs state', progress: { status: 'FAIL', version: 2, updatedAt: null, updatedByRole: 'teacher', assessmentNotes: null, assessedAt: null, allowedStudentStatuses: ['IN_PROGRESS'] } }),
        ]));
        api.mySummary.mockResolvedValue(summary);
        render(<StudentQuestionsPanel courseId="c1" />);
        expect(await screen.findByText('Passed — assessed by instructor')).toBeTruthy();
        expect(screen.getByText('Not passed — assessed by instructor')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1);
    });

    test('type tabs and status chips filter on the server', async () => {
        api.myQuestions.mockResolvedValue(page([question()]));
        api.mySummary.mockResolvedValue(summary);
        render(<StudentQuestionsPanel courseId="c1" />);
        await screen.findByText('What is React?');
        fireEvent.click(screen.getByRole('tab', { name: /Assignments/ }));
        await waitFor(() => expect(api.myQuestions).toHaveBeenLastCalledWith('c1', expect.objectContaining({ type: 'assignment', page: 1 })));
        fireEvent.click(screen.getByRole('button', { name: /^Completed/ }));
        await waitFor(() => expect(api.myQuestions).toHaveBeenLastCalledWith('c1', expect.objectContaining({ type: 'assignment', status: 'COMPLETED' })));
    });

    test('read-only mode (instructor preview) offers no status buttons', async () => {
        api.myQuestions.mockResolvedValue(page([question()]));
        api.mySummary.mockResolvedValue(summary);
        render(<StudentQuestionsPanel courseId="c1" readOnly />);
        await screen.findByText('What is React?');
        expect(screen.queryByRole('radiogroup')).toBeNull();
        expect(screen.getByText('Not started', { selector: 'span' })).toBeTruthy();
    });
});

describe('QuestionImportPanel', () => {
    const previewResult: QuestionImport = {
        id: 'imp1', courseId: 'c1', sourceType: 'google_sheet', sourceRef: 'https://docs.google.com/spreadsheets/d/abc',
        sheetName: 'Questions', status: 'previewed',
        summary: { total_rows: 3, valid_rows: 2, invalid_rows: 1, duplicate_rows: 0, empty_rows: 0, to_insert: 1, to_update: 1, unchanged: 0 },
        errors: [{ row: 4, field: 'question_type', message: 'question_type "quiz" is not supported.' }],
        unmappedColumns: [], result: null, failureMessage: null, initiatedBy: 'a', committedBy: null, committedAt: null, createdAt: '',
        rows: [
            { row: 2, external_question_id: 'q1', external_id_provided: true, question_type: 'audio_question', title: 'What is React?', prompt: 'p', topic: null, difficulty: null, expected_duration_minutes: null, resource_url: null, evaluation_criteria: null, due_date: null, display_order: null, action: 'insert' },
            { row: 3, external_question_id: 'a1', external_id_provided: true, question_type: 'assignment', title: 'Build a form', prompt: 'p', topic: null, difficulty: null, expected_duration_minutes: null, resource_url: null, evaluation_criteria: null, due_date: null, display_order: null, action: 'update' },
        ],
    };

    test('validates the URL field before calling the server', () => {
        render(<QuestionImportPanel courseId="c1" />);
        fireEvent.change(screen.getByLabelText('Google Sheet URL'), { target: { value: 'https://evil.example.com/x' } });
        expect(screen.getByText(/Enter a Google Sheets link/)).toBeTruthy();
        expect((screen.getByRole('button', { name: 'Validate & preview' }) as HTMLButtonElement).disabled).toBe(true);
    });

    test('previews, requires confirming a partial import, then commits', async () => {
        api.previewFromSheet.mockResolvedValue(previewResult);
        api.commitImport.mockResolvedValue({ ...previewResult, status: 'committed', result: { inserted: 1, updated: 1, unchanged: 0 } });
        const onImported = vi.fn();
        render(<QuestionImportPanel courseId="c1" onImported={onImported} />);

        fireEvent.change(screen.getByLabelText('Google Sheet URL'), { target: { value: 'https://docs.google.com/spreadsheets/d/abc' } });
        fireEvent.click(screen.getByRole('button', { name: 'Validate & preview' }));

        expect(await screen.findByText(/Row 4/)).toBeTruthy();
        const table = screen.getByRole('table');
        expect(within(table).getByText('New')).toBeTruthy();
        expect(within(table).getByText('Update')).toBeTruthy();

        const confirm = screen.getByRole('button', { name: /Confirm import/ }) as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);
        fireEvent.click(screen.getByLabelText(/Import the 2 valid row/));
        expect(confirm.disabled).toBe(false);
        fireEvent.click(confirm);

        await waitFor(() => expect(api.commitImport).toHaveBeenCalledWith('c1', 'imp1', true));
        await waitFor(() => expect(onImported).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith('Imported: 1 new, 1 updated, 0 unchanged');
    });

    test('surfaces server errors from the preview', async () => {
        api.previewFromSheet.mockRejectedValue({ response: { data: { error: { message: 'This sheet is private.' } } } });
        render(<QuestionImportPanel courseId="c1" />);
        fireEvent.change(screen.getByLabelText('Google Sheet URL'), { target: { value: 'https://docs.google.com/spreadsheets/d/abc' } });
        fireEvent.click(screen.getByRole('button', { name: 'Validate & preview' }));
        expect((await screen.findByRole('alert')).textContent).toContain('This sheet is private.');
    });

    test('saves the course draft first when there is no course yet', async () => {
        api.previewFromSheet.mockResolvedValue({ ...previewResult, errors: [], summary: { ...previewResult.summary, invalid_rows: 0 } });
        const ensure = vi.fn().mockResolvedValue('new-course');
        render(<QuestionImportPanel courseId={null} ensureCourseSaved={ensure} />);
        fireEvent.change(screen.getByLabelText('Google Sheet URL'), { target: { value: 'https://docs.google.com/spreadsheets/d/abc' } });
        fireEvent.click(screen.getByRole('button', { name: 'Validate & preview' }));
        await waitFor(() => expect(api.previewFromSheet).toHaveBeenCalledWith('new-course', 'https://docs.google.com/spreadsheets/d/abc'));
        expect(ensure).toHaveBeenCalled();
    });
});

describe('ProgressDashboard', () => {
    test('renders server-computed per-student statuses', async () => {
        api.progressSummary.mockResolvedValue({
            courseId: 'c1', courseTitle: 'React Prep', totalStudents: 1, totalQuestions: 2,
            questionsByType: { audio_question: 1, assignment: 1 },
            statusTotals: { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 0, PASS: 1, FAIL: 0 },
            studentsStarted: 1, studentsFinished: 0, averagePercentFinished: 50, percentPairsFinished: 50, percentPairsPassed: 50, lastActivity: null,
        });
        const overall = { ...metrics(2), counts: { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 0, PASS: 1, FAIL: 0 }, finished: 1, percentFinished: 50 };
        api.progressStudents.mockResolvedValue({
            data: [{ userId: 'u1', name: 'Alice', email: 'alice@test.dev', completion: 'in_progress', overall, audio: metrics(1), assignment: { ...metrics(1, 1) }, lastActivity: null }],
            meta: { page: 1, limit: 25, total: 1, totalPages: 1 }, totalQuestions: 2,
        });
        render(<ProgressDashboard courseId="c1" />);
        expect(await screen.findByText('Alice')).toBeTruthy();
        expect(screen.getByText('React Prep')).toBeTruthy();
        const row = screen.getByText('Alice').closest('tr')!;
        expect(within(row).getByText('1/2')).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Completion'), { target: { value: 'finished' } });
        await waitFor(() => expect(api.progressStudents).toHaveBeenLastCalledWith('c1', expect.objectContaining({ completion: 'finished' })));
    });

    test('shows an empty state when nobody is enrolled', async () => {
        api.progressSummary.mockResolvedValue({
            courseId: 'c1', courseTitle: 'Empty', totalStudents: 0, totalQuestions: 0,
            questionsByType: { audio_question: 0, assignment: 0 },
            statusTotals: { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, PASS: 0, FAIL: 0 },
            studentsStarted: 0, studentsFinished: 0, averagePercentFinished: 0, percentPairsFinished: 0, percentPairsPassed: 0, lastActivity: null,
        });
        api.progressStudents.mockResolvedValue({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 }, totalQuestions: 0 });
        render(<ProgressDashboard courseId="c1" />);
        expect(await screen.findByText('No students are enrolled in this course yet.')).toBeTruthy();
        // Zero students / zero questions renders 0% (no NaN from division by zero).
        expect(screen.getAllByText('0%', { selector: 'p' })).toHaveLength(2);
        expect(screen.queryByText(/NaN/)).toBeNull();
    });
});

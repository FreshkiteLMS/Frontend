import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const insights = vi.hoisted(() => ({
    directory: vi.fn(),
    batchStudents: vi.fn(),
    exportDirectory: vi.fn(),
    exportBatchStudents: vi.fn(),
}));
const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: '' }));

vi.mock('@/services/api/admin-insights.api', () => ({
    adminInsightsService: insights,
    httpStatus: (err: { response?: { status?: number } }) => err?.response?.status,
}));
vi.mock('@/services/api/batch.api', () => ({ batchService: { getAll: vi.fn().mockResolvedValue({ data: [{ id: 'b1', name: 'Cohort A' }] }), assignStudents: vi.fn(), removeStudent: vi.fn() } }));
vi.mock('@/services/api/course.api', () => ({ courseService: { getAllCourses: vi.fn().mockResolvedValue([{ id: 'c1', title: 'Web' }]) } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: nav.push, replace: nav.replace }),
    usePathname: () => '/admin/students',
    useSearchParams: () => new URLSearchParams(nav.search),
}));

import { StudentDirectory } from '../student-directory';
import { GroupsEditor, templateGroup } from '@/components/batches/batch-config';
import { ActivityHeatmap } from '../../insights/charts';

const row = (over: Record<string, unknown> = {}) => ({
    id: 's1', userId: 'u1', studentCode: 'FK-2026-00001', name: 'Ana Lima', email: 'ana@x.dev', phone: null, avatarUrl: null, joinedAt: '2026-10-01T00:00:00Z',
    batches: [{ id: 'b1', name: 'Cohort A', status: 'active' }], enrolledCourses: 2, completedCourses: 1, inProgressCourses: 1, overallProgress: 75,
    lessonsCompleted: 6, problemsSolved: 3, assignments: { total: 4, finished: 2, passed: 1, failed: 0, pending: 2 },
    audio: { questions_total: 5, practised: 2, attempts: 4, avg_best: 6.5 }, tests: { taken: 0, avg_percent: null },
    lastActivityAt: new Date().toISOString(), activeDays30: 3, events30: 9, activityStatus: 'active', points: 120, rank: 4, batchRank: 1,
    pending: { attemptRequests: 1, enrollmentRequests: 0, audioProcessing: 0 }, summaryComputedAt: null, ...over,
});

beforeEach(() => {
    nav.search = '';
    nav.push.mockReset();
    nav.replace.mockReset();
    insights.directory.mockReset();
    insights.batchStudents.mockReset();
    insights.directory.mockResolvedValue({ rows: [row()], total: 1, page: 1, limit: 25, totalPages: 1 });
    insights.batchStudents.mockResolvedValue({ rows: [row()], total: 1, page: 1, limit: 25, totalPages: 1 });
});
afterEach(cleanup);

describe('StudentDirectory', () => {
    test('renders real row figures and passes URL filters to the server', async () => {
        nav.search = 'activity=inactive&sort=progress&dir=asc&pendingAssignments=true';
        render(<StudentDirectory />);
        expect(await screen.findByText('Ana Lima')).toBeTruthy();
        expect(insights.directory).toHaveBeenCalledWith(expect.objectContaining({ activity: 'inactive', sort: 'progress', dir: 'asc', pendingAssignments: true }));
        const tr = screen.getByText('Ana Lima').closest('tr')!;
        expect(within(tr).getByText('2/4')).toBeTruthy();         // assignments finished / total
        expect(within(tr).getByText('2 pending')).toBeTruthy();
        expect(within(tr).getByText('#4')).toBeTruthy();          // global rank
        expect(within(tr).getByText('1 attempt request')).toBeTruthy();
    });

    test('a batch-scoped list uses the batch roster API and keeps the batch context when opening a student', async () => {
        render(<StudentDirectory scope={{ batchId: 'b1', batchName: 'Cohort A' }} />);
        const name = await screen.findByText('Ana Lima');
        expect(insights.batchStudents).toHaveBeenCalledWith('b1', expect.any(Object));
        expect(insights.directory).not.toHaveBeenCalled();
        expect(within(name.closest('tr')!).getByText('#1')).toBeTruthy(); // batch rank, not global
        fireEvent.click(name.closest('tr')!);
        expect(nav.push).toHaveBeenCalledWith('/admin/students/u1?batch=b1');
    });

    test('opening from the global list has no batch context', async () => {
        render(<StudentDirectory />);
        fireEvent.click((await screen.findByText('Ana Lima')).closest('tr')!);
        expect(nav.push).toHaveBeenCalledWith('/admin/students/u1');
    });

    test('debounces search into the URL', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<StudentDirectory />);
        fireEvent.change(screen.getByLabelText('Search students'), { target: { value: 'ana' } });
        expect(nav.replace).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(400);
        await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/admin/students?q=ana', { scroll: false }));
        vi.useRealTimers();
    });

    test('shows a permission state on 403 instead of an empty list', async () => {
        insights.directory.mockRejectedValue({ response: { status: 403 } });
        render(<StudentDirectory />);
        expect(await screen.findByText(/don.t have permission/i)).toBeTruthy();
    });
});

describe('GroupsEditor', () => {
    test('meeting discussion needs meetings; custom groups get their own key', () => {
        const onChange = vi.fn();
        const { rerender } = render(<GroupsEditor value={[templateGroup('general')]} onChange={onChange} meetingsEnabled={false} />);
        expect((screen.getByRole('button', { name: /Meeting Discussion/ }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Custom group name'), { target: { value: 'Mock Interviews' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(onChange).toHaveBeenLastCalledWith([
            expect.objectContaining({ key: 'general' }),
            expect.objectContaining({ key: 'custom-mock-interviews', template: 'custom', name: 'Mock Interviews' }),
        ]);
        rerender(<GroupsEditor value={[templateGroup('general')]} onChange={onChange} meetingsEnabled />);
        expect((screen.getByRole('button', { name: /Meeting Discussion/ }) as HTMLButtonElement).disabled).toBe(false);
    });

    test('existing groups can only be archived, new ones removed', () => {
        const onChange = vi.fn();
        render(<GroupsEditor value={[templateGroup('general'), templateGroup('doubts')]} onChange={onChange} meetingsEnabled existingKeys={['general']} />);
        expect(screen.getByRole('button', { name: 'Archive General' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Remove General' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Remove Doubt Clearing' }));
        expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ key: 'general' })]);
    });
});

describe('ActivityHeatmap', () => {
    test('draws one cell per day and lists only real active days in the table view', () => {
        const days = Array.from({ length: 14 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, count: i === 3 ? 2 : 0, types: (i === 3 ? { lesson_completed: 2 } : {}) as Record<string, number> }));
        const { container } = render(<ActivityHeatmap days={days} levels={[1, 1, 2]} />);
        expect(container.querySelectorAll('span.rounded-\\[2px\\].h-\\[11px\\]').length).toBe(14 + 5); // cells + legend swatches
        fireEvent.click(screen.getByRole('button', { name: /Show active days/ }));
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(2); // header + the one active day
        expect(screen.getByText(/Lesson completed 2/)).toBeTruthy();
    });
});

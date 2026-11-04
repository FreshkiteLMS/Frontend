import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ProcessingState } from '@/types/structured-course';

const getProcessingStatus = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/services/api/course.api', () => ({ courseService: { getProcessingStatus: (...a: unknown[]) => getProcessingStatus(...a) } }));

import { CourseProcessingPanel } from '../CourseProcessingPanel';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const state = (over: Partial<ProcessingState>): ProcessingState => ({
    status: 'structuring', active: true, document_url: 'https://docs.google.com/document/d/x', error: null, warnings: [],
    chunks_total: null, chunks_done: null, modules_detected: null, lessons_detected: null, modules_done: null, lessons_done: null,
    model: null, started_at: '', finished_at: null, updated_at: '', ...over,
});

const show = async (s: ProcessingState) => {
    getProcessingStatus.mockResolvedValue(s);
    render(<CourseProcessingPanel courseId="c1" docLink={s.document_url} onDocLinkChange={vi.fn()} ensureCourseSaved={vi.fn()} structured={null} onProcessed={vi.fn()} />);
    await screen.findByText('Extracting document');
};
const count = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('CourseProcessingPanel progress', () => {
    test('names every stage of the run', async () => {
        await show(state({}));
        for (const stage of ['Extracting document', 'Analyzing structure', 'Processing lesson content', 'Validating links and resources', 'Saving course content', 'Verifying course structure']) {
            expect(screen.getByText(stage)).toBeTruthy();
        }
    });

    test('shows the real counts and never a percentage', async () => {
        await show(state({ modules_detected: 8, lessons_detected: 35, modules_done: 2, lessons_done: 9 }));
        expect(count('Modules detected')).toBe('8');
        expect(count('Lessons detected')).toBe('35');
        expect(count('Modules processed')).toBe('2 of 8');
        expect(count('Lessons processed')).toBe('9 of 35');
        expect(document.body.textContent).not.toMatch(/\d%/);
    });

    test('shows no counts before the structure is known', async () => {
        await show(state({ status: 'extracting' }));
        expect(screen.queryByText('Lessons detected')).toBeNull();
    });

    test('a failure explains itself and says finished lessons are kept', async () => {
        await show(state({ status: 'failed', active: false, modules_detected: 8, lessons_detected: 35, modules_done: 2, lessons_done: 9, error: { code: 'AI_RATE_LIMITED', message: 'The AI service is rate-limiting requests.' } }));
        const alert = screen.getByRole('alert');
        expect(alert.textContent).toContain('rate-limiting');
        expect(alert.textContent).toContain('continues from there');
        expect(count('Lessons processed')).toBe('9 of 35');
    });
});

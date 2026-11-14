import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CurriculumDraft, ProcessingState } from '@/types/structured-course';

const svc = vi.hoisted(() => ({
    getProcessingStatus: vi.fn(),
    getCurriculumDraft: vi.fn(),
    reprocessDocument: vi.fn(),
    approveCurriculumDraft: vi.fn(),
    discardCurriculumDraft: vi.fn(),
    processDocument: vi.fn(),
    getCourseById: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/services/api/course.api', () => ({ courseService: svc }));

import { CourseProcessingPanel } from '../CourseProcessingPanel';
import { validateOptions } from '../CustomizeCurriculumForm';

const state = (over: Partial<ProcessingState> = {}): ProcessingState => ({
    status: 'completed', active: false, document_url: 'https://docs.google.com/document/d/x', error: null, warnings: [],
    chunks_total: null, chunks_done: null, modules_detected: null, lessons_detected: null, modules_done: null, lessons_done: null,
    model: null, source_available: true, started_at: '', finished_at: null, updated_at: '', ...over,
});

const draft = (over: Partial<CurriculumDraft> = {}): CurriculumDraft => ({
    run_id: 11, created_at: '', model: 'm',
    options: { targetModules: 5, targetLessons: 20, density: 'detailed', strategy: 'concept', instructions: 'Keep advanced topics apart.' },
    summary: { sourceContentPreserved: true, requestedModules: 5, generatedModules: 5, requestedLessons: 20, generatedLessons: 19, deviationReason: 'One complex lesson was kept whole.' },
    needs_review: false, review_reasons: [], warnings: [],
    modules: [
        { id: 'm1', title: 'Fundamentals', description: 'The basics.', lessons: [{ id: 'l1', title: 'Variables', description: 'About variables.', words: 300, source_sections: ['Variables', 'Data Types'] }] },
        { id: 'm2', title: 'Functions', description: '', lessons: [{ id: 'l2', title: 'Closures', description: '', words: 200, source_sections: [] }] },
    ],
    current: { modules: 18, lessons: 36 },
    ...over,
});

const structured = { version: 1, title: 'JS', description: '', learningObjectives: [], modules: [{ id: 'cm', title: 'Old', description: '', lessons: [{ id: 'cl', title: 'Old lesson' }] }] } as any;

const mount = async (opts: { s?: ProcessingState | null; d?: CurriculumDraft | null; withStructured?: boolean } = {}) => {
    svc.getProcessingStatus.mockResolvedValue(opts.s === undefined ? state() : opts.s);
    svc.getCurriculumDraft.mockResolvedValue(opts.d === undefined ? null : opts.d);
    const onProcessed = vi.fn();
    render(<CourseProcessingPanel courseId="c1" docLink="https://docs.google.com/document/d/x" onDocLinkChange={vi.fn()} ensureCourseSaved={vi.fn()}
        structured={opts.withStructured === false ? null : structured} onProcessed={onProcessed} />);
    await screen.findByText('Customize Curriculum Structure');
    return { onProcessed };
};

beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Reprocess Document with Custom Structure/ }));

describe('Customize Curriculum Structure', () => {
    test('has every control, with Balanced and Follow Document Headings as defaults', async () => {
        await mount();
        expect(screen.getByLabelText(/Target number of modules/)).toBeTruthy();
        expect(screen.getByLabelText(/Target number of lessons/)).toBeTruthy();
        expect((screen.getByRole('radio', { name: /Balanced/ }) as HTMLInputElement).checked).toBe(true);
        expect((screen.getByRole('radio', { name: /Follow Document Headings/ }) as HTMLInputElement).checked).toBe(true);
        for (const name of [/Compact/, /Detailed/, /Concept-Based/, /Learning Path/]) expect(screen.getByRole('radio', { name })).toBeTruthy();
        expect(screen.getByLabelText(/Additional instructions/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Reprocess Document with Custom Structure/ })).toBeTruthy();
    });

    test('before the first run, the settings are offered up front and Process waits for a link', async () => {
        svc.getProcessingStatus.mockResolvedValue(null);
        svc.getCurriculumDraft.mockResolvedValue(null);
        render(<CourseProcessingPanel courseId="c1" docLink="" onDocLinkChange={vi.fn()} ensureCourseSaved={vi.fn()} structured={null} onProcessed={vi.fn()} />);
        expect(await screen.findByText('Processing Settings')).toBeTruthy();
        expect(screen.queryByText('Customize Curriculum Structure')).toBeNull();
        // Settings are editable before a link is entered; only processing is blocked.
        expect((screen.getByLabelText(/Target number of modules/) as HTMLInputElement).disabled).toBe(false);
        expect((screen.getByRole('button', { name: /^Process Document$/ }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText(/Paste the document link above/)).toBeTruthy();
        // One process button only (the form's), not a second one beside the link.
        expect(screen.getAllByRole('button', { name: /Process Document/ })).toHaveLength(1);
    });

    test('the first run is processed with the settings the admin chose', async () => {
        svc.getProcessingStatus.mockResolvedValue(null);
        svc.getCurriculumDraft.mockResolvedValue(null);
        svc.processDocument.mockResolvedValue(state({ status: 'uploaded', active: true, mode: 'review' }));
        const ensureCourseSaved = vi.fn().mockResolvedValue('new-course');
        render(<CourseProcessingPanel courseId={null} docLink="https://docs.google.com/document/d/abc/edit" onDocLinkChange={vi.fn()} ensureCourseSaved={ensureCourseSaved} structured={null} onProcessed={vi.fn()} />);
        await screen.findByText('Processing Settings');
        type(/Target number of modules/, '4');
        type(/Target number of lessons/, '12');
        fireEvent.click(screen.getByRole('radio', { name: /Concept-Based/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Process Document$/ }));
        await waitFor(() => expect(svc.processDocument).toHaveBeenCalledTimes(1));
        expect(ensureCourseSaved).toHaveBeenCalled();
        expect(svc.processDocument).toHaveBeenCalledWith('new-course', 'https://docs.google.com/document/d/abc/edit', {
            review: true,
            structureOptions: { targetModules: 4, targetLessons: 12, density: 'balanced', strategy: 'concept', instructions: '' },
        });
    });

    test('submits exactly what the admin chose', async () => {
        svc.reprocessDocument.mockResolvedValue(state({ status: 'uploaded', active: true, mode: 'review' }));
        await mount();
        type(/Target number of modules/, '5');
        type(/Target number of lessons/, '20');
        fireEvent.click(screen.getByRole('radio', { name: /Detailed/ }));
        fireEvent.click(screen.getByRole('radio', { name: /Learning Path/ }));
        type(/Additional instructions/, '  Keep advanced topics in separate modules.  ');
        submit();

        await waitFor(() => expect(svc.reprocessDocument).toHaveBeenCalledTimes(1));
        expect(svc.reprocessDocument).toHaveBeenCalledWith('c1', { targetModules: 5, targetLessons: 20, density: 'detailed', strategy: 'learning_path', instructions: 'Keep advanced topics in separate modules.' });
    });

    test.each([
        ['0', '', /between 1 and 50/],
        ['2.5', '', /whole number/],
        ['abc', '', /whole number/],
        ['', '9999', /between 1 and 300/],
        ['8', '3', /fewer than target modules/],
    ])('invalid input (modules %j, lessons %j) is explained and never sent', async (modules, lessons, message) => {
        await mount();
        type(/Target number of modules/, modules);
        type(/Target number of lessons/, lessons);
        submit();
        expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
        expect(svc.reprocessDocument).not.toHaveBeenCalled();
    });

    test('over-long instructions are refused', async () => {
        await mount();
        type(/Additional instructions/, 'x'.repeat(1501));
        submit();
        expect(await screen.findByText(/under 1500 characters/)).toBeTruthy();
        expect(svc.reprocessDocument).not.toHaveBeenCalled();
    });

    test('while a run is active the form is locked, so a second request cannot be sent', async () => {
        await mount({ s: state({ status: 'structuring', active: true }) });
        expect((screen.getByRole('button', { name: /Reprocessing/ }) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByLabelText(/Target number of modules/) as HTMLInputElement).disabled).toBe(true);
        expect(screen.getByText(/current curriculum stays unchanged/)).toBeTruthy();
        fireEvent.submit(screen.getByRole('form', { name: /Customize Curriculum Structure/ }));
        expect(svc.reprocessDocument).not.toHaveBeenCalled();
    });

    test('a double click sends one request', async () => {
        let resolve!: (s: ProcessingState) => void;
        svc.reprocessDocument.mockReturnValue(new Promise<ProcessingState>((r) => { resolve = r; }));
        await mount();
        const button = screen.getByRole('button', { name: /Reprocess Document with Custom Structure/ });
        fireEvent.click(button);
        fireEvent.click(button);
        expect(svc.reprocessDocument).toHaveBeenCalledTimes(1);
        resolve(state({ status: 'uploaded', active: true }));
    });

    test('says why customizing is unavailable when the original document is not stored', async () => {
        await mount({ s: state({ source_available: false }) });
        expect(screen.getByText(/Process the document once/)).toBeTruthy();
        expect((screen.getByRole('button', { name: /Reprocess Document with Custom Structure/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    test('remembers the last settings after a refresh', async () => {
        await mount({ d: draft() });
        await waitFor(() => expect((screen.getByLabelText(/Target number of modules/) as HTMLInputElement).value).toBe('5'));
        expect((screen.getByLabelText(/Target number of lessons/) as HTMLInputElement).value).toBe('20');
        expect((screen.getByRole('radio', { name: /Detailed/ }) as HTMLInputElement).checked).toBe(true);
        expect((screen.getByLabelText(/Additional instructions/) as HTMLTextAreaElement).value).toBe('Keep advanced topics apart.');
    });
});

describe('validateOptions', () => {
    const f = (over: object = {}) => ({ modules: '', lessons: '', density: 'balanced' as const, strategy: 'headings' as const, instructions: '', ...over });
    test('blank targets mean "let the AI decide"', () => {
        expect(validateOptions(f()).options).toEqual({ targetModules: null, targetLessons: null, density: 'balanced', strategy: 'headings', instructions: '' });
    });
    test('boundaries', () => {
        expect(validateOptions(f({ modules: '50', lessons: '300' })).options).toMatchObject({ targetModules: 50, targetLessons: 300 });
        expect(validateOptions(f({ modules: '51' })).options).toBeNull();
        expect(validateOptions(f({ modules: '5', lessons: '5' })).options).not.toBeNull();
    });
});

describe('generated curriculum review', () => {
    test('shows totals, requested versus generated, and the reason for any difference', async () => {
        await mount({ d: draft() });
        const preview = await screen.findByRole('region', { name: /Generated curriculum/ });
        expect(within(preview).getByText('5 modules')).toBeTruthy();
        expect(within(preview).getByText('19 lessons')).toBeTruthy();
        expect(within(preview).getByText('5 requested · 5 generated')).toBeTruthy();
        expect(within(preview).getByText('20 requested · 19 generated')).toBeTruthy();
        expect(within(preview).getByText(/One complex lesson was kept whole/)).toBeTruthy();
        expect(within(preview).getByText(/Students still see the current curriculum \(18 modules, 36 lessons\)/)).toBeTruthy();
    });

    test('modules expand and collapse to reveal lessons, descriptions and source sections', async () => {
        await mount({ d: draft() });
        const preview = await screen.findByRole('region', { name: /Generated curriculum/ });
        expect(within(preview).queryByText(/Variables$/)).toBeNull();
        fireEvent.click(within(preview).getByRole('button', { name: /1\. Fundamentals/ }));
        expect(within(preview).getByText('• Variables')).toBeTruthy();
        expect(within(preview).getByText('About variables.')).toBeTruthy();
        expect(within(preview).getByText(/From: Variables · Data Types/)).toBeTruthy();
        fireEvent.click(within(preview).getByRole('button', { name: /1\. Fundamentals/ }));
        expect(within(preview).queryByText('• Variables')).toBeNull();
        fireEvent.click(within(preview).getByRole('button', { name: 'Expand all' }));
        expect(within(preview).getByText('• Closures')).toBeTruthy();
    });

    test('applying asks first, then applies the draft that was reviewed and refreshes the course', async () => {
        svc.approveCurriculumDraft.mockResolvedValue(undefined);
        svc.getCourseById.mockResolvedValue({ id: 'c1' });
        const { onProcessed } = await mount({ d: draft() });
        fireEvent.click(await screen.findByRole('button', { name: /Replace current curriculum/ }));

        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('18 modules, 36 lessons'));
        await waitFor(() => expect(svc.approveCurriculumDraft).toHaveBeenCalledWith('c1', 11, false));
        await waitFor(() => expect(onProcessed).toHaveBeenCalledWith({ id: 'c1' }));
        expect(screen.queryByRole('region', { name: /Generated curriculum/ })).toBeNull();
    });

    test('declining the confirmation applies nothing', async () => {
        (window.confirm as any).mockReturnValue(false);
        await mount({ d: draft() });
        fireEvent.click(await screen.findByRole('button', { name: /Replace current curriculum/ }));
        expect(svc.approveCurriculumDraft).not.toHaveBeenCalled();
    });

    test('a first curriculum can be applied without a replace warning', async () => {
        svc.approveCurriculumDraft.mockResolvedValue(undefined);
        svc.getCourseById.mockResolvedValue({ id: 'c1' });
        await mount({ d: draft({ current: null }), withStructured: false });
        expect(screen.getByText(/Nothing is saved to the course until you apply/)).toBeTruthy();
        fireEvent.click(await screen.findByRole('button', { name: 'Apply this curriculum' }));
        await waitFor(() => expect(svc.approveCurriculumDraft).toHaveBeenCalled());
        expect(window.confirm).not.toHaveBeenCalled();
    });

    test('content-preservation warnings must be acknowledged before applying', async () => {
        svc.approveCurriculumDraft.mockResolvedValue(undefined);
        svc.getCourseById.mockResolvedValue({ id: 'c1' });
        await mount({ d: draft({ needs_review: true, review_reasons: ['1 code sample from the source is missing or changed.'] }) });

        expect((await screen.findByRole('alert')).textContent).toContain('code sample');
        const apply = screen.getByRole('button', { name: /Replace current curriculum/ }) as HTMLButtonElement;
        expect(apply.disabled).toBe(true);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(apply.disabled).toBe(false);
        fireEvent.click(apply);
        await waitFor(() => expect(svc.approveCurriculumDraft).toHaveBeenCalledWith('c1', 11, true));
    });

    test('discarding leaves the current curriculum alone', async () => {
        svc.discardCurriculumDraft.mockResolvedValue(undefined);
        await mount({ d: draft() });
        fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
        await waitFor(() => expect(svc.discardCurriculumDraft).toHaveBeenCalledWith('c1', 11));
        await waitFor(() => expect(screen.queryByRole('region', { name: /Generated curriculum/ })).toBeNull());
        expect(svc.approveCurriculumDraft).not.toHaveBeenCalled();
        expect(screen.getByText(/Old lesson/)).toBeTruthy();
    });

    test('a failed reprocess keeps the earlier draft on screen and says nothing was changed', async () => {
        await mount({
            s: state({ status: 'failed', error: { code: 'AI_TIMEOUT', message: 'The AI service timed out.' }, modules_detected: 5, lessons_detected: 20, modules_done: 1, lessons_done: 3 }),
            d: draft(),
        });
        const alert = (await screen.findAllByRole('alert')).find((a) => a.textContent?.includes('Processing failed'))!;
        expect(alert.textContent).toContain('timed out');
        expect(alert.textContent).toContain('previous generated curriculum and the current curriculum are unchanged');
        expect(screen.getByRole('region', { name: /Generated curriculum/ })).toBeTruthy();
    });

    test('a finished review run shows every stage as done, with no spinner left', async () => {
        await mount({ s: state({ status: 'awaiting_review', mode: 'review', modules_detected: 5, lessons_detected: 19, modules_done: 5, lessons_done: 19 }), d: draft() });
        expect(screen.getByText('Curriculum ready for review')).toBeTruthy();
        expect(document.querySelector('.animate-spin')).toBeNull();
    });
});

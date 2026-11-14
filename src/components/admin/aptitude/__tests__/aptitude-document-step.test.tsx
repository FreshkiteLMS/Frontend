import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AdminAptitudeContent } from '@/types/aptitude';

const svc = {
    content: vi.fn(),
    latestImport: vi.fn(),
    validateDocument: vi.fn(),
    startImport: vi.fn(),
    applyImport: vi.fn(),
    discardImport: vi.fn(),
    updateQuestion: vi.fn(),
};
vi.mock('@/services/api/aptitude.api', () => ({ aptitudeService: new Proxy({}, { get: (_t, k: string) => (svc as any)[k] ?? vi.fn() }) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { AptitudeDocumentStep, checkDocLink } from '../AptitudeDocumentStep';

const DOC = 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit';
const emptyContent: AdminAptitudeContent = {
    course: { id: 'c1', title: 'Quant', status: 'inactive' },
    verification: { verified: false, verifiedAt: null, blockers: [{ code: 'NO_QUESTIONS', message: 'Add at least one question.' }], summary: { concepts: 0, questions: 0, valid: 0, needsReview: 0, invalid: 0, visible: 0 } },
    totals: { concepts: 0, questions: 0, activeQuestions: 0, needsReview: 0, withoutAnswer: 0 },
    concepts: [],
};
const axiosError = (status: number, code: string, message: string) => Object.assign(new Error(message), { response: { status, data: { error: { code, message } } } });

beforeEach(() => {
    svc.content.mockResolvedValue(emptyContent);
    svc.latestImport.mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderStep(docLink = '') {
    const onVerification = vi.fn();
    const onDocLinkChange = vi.fn();
    const utils = render(<AptitudeDocumentStep courseId="c1" docLink={docLink} onDocLinkChange={onDocLinkChange} onVerification={onVerification} />);
    return { ...utils, onVerification, onDocLinkChange };
}

describe('checkDocLink', () => {
    test.each([
        ['', /Paste the Google Docs link/],
        ['docs.google.com/document/d/abc', /must start with https/],
        ['https://example.com/file.pdf', /not a Google Docs link/],
        ['https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKl/edit', /not a Google Docs link/],
        ['https://docs.google.com/document/d/', /missing the document ID/],
    ])('%s is rejected', (url, msg) => expect(checkDocLink(url)).toMatch(msg));
    test('a normal Google Docs link passes', () => expect(checkDocLink(DOC)).toBeNull());
});

describe('AptitudeDocumentStep', () => {
    test('shows the sample guide and the not-processed message, and reports verification state', async () => {
        const { onVerification } = renderStep(DOC);
        expect(await screen.findByText('Your aptitude document has not been processed yet. Process the document to extract questions.')).toBeTruthy();
        expect(screen.getByText('How to prepare your aptitude document')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Copy template/ })).toBeTruthy();
        await waitFor(() => expect(onVerification).toHaveBeenCalledWith(emptyContent.verification));
    });

    test('an invalid link is explained without calling the server', async () => {
        renderStep('https://example.com/doc.pdf');
        fireEvent.click(await screen.findByRole('button', { name: /Validate link/ }));
        expect((await screen.findByRole('alert')).textContent).toMatch(/not a Google Docs link/);
        expect(svc.validateDocument).not.toHaveBeenCalled();
    });

    test('a private document shows how to share it', async () => {
        svc.validateDocument.mockRejectedValue(axiosError(403, 'DOCUMENT_ACCESS_DENIED', 'The document could not be accessed.'));
        renderStep(DOC);
        fireEvent.click(await screen.findByRole('button', { name: /Validate link/ }));
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toMatch(/could not be accessed/);
        expect(alert.textContent).toMatch(/Anyone with the link/);
    });

    test('processing validates first, then shows stage progress', async () => {
        svc.validateDocument.mockResolvedValue({ url: DOC, documentId: 'x', title: 'Set 1', accessible: true });
        svc.startImport.mockResolvedValue({ id: 'r1', status: 'fetching_document', active: true, documentUrl: DOC, documentTitle: '', chunksTotal: 0, chunksDone: 0, stats: { concepts: 0, questions: 0, needs_review: 0, duplicates_removed: 0 }, warnings: [], error: null, applyResult: null, autoApplied: false, concepts: [] });
        renderStep(DOC);
        fireEvent.click(await screen.findByRole('button', { name: /Process document/ }));
        await waitFor(() => expect(svc.startImport).toHaveBeenCalledWith('c1', DOC));
        expect(svc.validateDocument).toHaveBeenCalled();
        expect(await screen.findByText('Reading the Google Doc')).toBeTruthy();
        expect((screen.getByRole('button', { name: /Processing/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    test('a failed run offers a retry and keeps the link', async () => {
        svc.latestImport.mockResolvedValue({ id: 'r1', status: 'failed', active: false, documentUrl: DOC, documentTitle: '', chunksTotal: 1, chunksDone: 0, stats: { concepts: 0, questions: 0, needs_review: 0, duplicates_removed: 0 }, warnings: [], error: { code: 'AI_INVALID_OUTPUT', message: 'The AI service returned questions in an unexpected format.' }, applyResult: null, autoApplied: false, concepts: [] });
        renderStep(DOC);
        expect(await screen.findByText(/unexpected format/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Retry processing/ })).toBeTruthy();
        expect((screen.getByRole('textbox', { name: 'Google Docs link' }) as HTMLInputElement).value).toBe(DOC);
    });
});

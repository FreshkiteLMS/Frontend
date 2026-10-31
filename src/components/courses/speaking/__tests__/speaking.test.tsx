import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AttemptDetail, QuestionHistory, SpeakingAttempt, SpeakingReport } from '@/types/speaking';
import type { StudentQuestion } from '@/types/structured-questions';
import { importanceTone, pickRecordingMimeType, practiceState, ratingTone, splitSentences, toParagraphs } from '@/lib/speaking';

const speaking = vi.hoisted(() => ({
    history: vi.fn(),
    attempt: vi.fn(),
    createAttempt: vi.fn(),
    uploadAudio: vi.fn(),
    retry: vi.fn(),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('@/services/api/speaking.api', () => ({ speakingService: speaking }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import { AudioRecorder } from '../AudioRecorder';
import { AssessmentReport } from '../AssessmentReport';
import { SpeakingPractice } from '../SpeakingPractice';

// ── Browser media fakes ─────────────────────────────────────────────────────
class FakeRecorder {
    static instances: FakeRecorder[] = [];
    static isTypeSupported = (t: string) => t.startsWith('audio/webm');
    state: 'inactive' | 'recording' | 'paused' = 'inactive';
    mimeType: string;
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_s: unknown, opts: { mimeType: string }) { this.mimeType = opts.mimeType; FakeRecorder.instances.push(this); }
    start() { this.state = 'recording'; }
    pause() { this.state = 'paused'; }
    resume() { this.state = 'recording'; }
    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob([new Uint8Array(5000)], { type: 'audio/webm' }) });
        this.onstop?.();
    }
}
const track = { stop: vi.fn() };
const getUserMedia = vi.fn();
let clock = 0;

beforeEach(() => {
    vi.clearAllMocks();
    FakeRecorder.instances = [];
    clock = 0;
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    getUserMedia.mockResolvedValue({ getTracks: () => [track] });
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* jsdom */ }
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

async function recordFor(seconds: number) {
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    await screen.findByRole('button', { name: /^stop$/i });
    clock += seconds * 1000; // relative: recorded time is measured from start
    fireEvent.click(screen.getByRole('button', { name: /^stop$/i }));
    await screen.findByRole('button', { name: /submit for ai evaluation/i });
}

describe('AudioRecorder', () => {
    const props = { maxSeconds: 300, minSeconds: 3, submitting: false, uploadProgress: null };

    test('explains a blocked microphone', async () => {
        getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
        render(<AudioRecorder {...props} onSubmit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
        expect((await screen.findByRole('alert')).textContent).toMatch(/microphone access was blocked/i);
        expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    });

    test('explains a missing microphone and an unsupported browser', async () => {
        getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotFoundError' }));
        const { unmount } = render(<AudioRecorder {...props} onSubmit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
        expect((await screen.findByRole('alert')).textContent).toMatch(/no microphone was found/i);
        unmount();

        vi.stubGlobal('MediaRecorder', Object.assign(class {}, { isTypeSupported: () => false }));
        render(<AudioRecorder {...props} onSubmit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
        expect((await screen.findByRole('alert')).textContent).toMatch(/supported audio format/i);
    });

    test('records, pauses, resumes and stops without submitting', async () => {
        const onSubmit = vi.fn();
        render(<AudioRecorder {...props} onSubmit={onSubmit} />);
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
        fireEvent.click(await screen.findByRole('button', { name: /pause/i }));
        expect(FakeRecorder.instances[0].state).toBe('paused');
        expect(screen.getByRole('status').textContent).toMatch('Paused');
        fireEvent.click(screen.getByRole('button', { name: /resume/i }));
        expect(FakeRecorder.instances[0].state).toBe('recording');
        clock = 10_000;
        fireEvent.click(screen.getByRole('button', { name: /^stop$/i }));
        await screen.findByRole('button', { name: /submit for ai evaluation/i });
        expect(onSubmit).not.toHaveBeenCalled();
        expect(track.stop).toHaveBeenCalled(); // microphone released
    });

    test('lets the student listen back, re-record and then submit', async () => {
        const onSubmit = vi.fn();
        const { container } = render(<AudioRecorder {...props} onSubmit={onSubmit} />);
        await recordFor(12);
        const audio = container.querySelector('audio')!;
        expect(audio.getAttribute('src')).toBe('blob:preview');

        fireEvent.click(screen.getByRole('button', { name: /record again/i }));
        expect(container.querySelector('audio')).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');

        await recordFor(15);
        fireEvent.click(screen.getByRole('button', { name: /submit for ai evaluation/i }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0]).toMatchObject({ mimeType: 'audio/webm', durationSeconds: 15 });
        expect(onSubmit.mock.calls[0][0].blob.size).toBeGreaterThan(0);
    });

    test('blocks submission of a too-short recording', async () => {
        render(<AudioRecorder {...props} onSubmit={vi.fn()} />);
        await recordFor(1);
        expect((screen.getByRole('button', { name: /submit for ai evaluation/i }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText(/under 3 seconds/i)).toBeTruthy();
    });

    test('reports unsaved work to the parent', async () => {
        const onDirty = vi.fn();
        render(<AudioRecorder {...props} onSubmit={vi.fn()} onDirtyChange={onDirty} />);
        await recordFor(5);
        expect(onDirty).toHaveBeenLastCalledWith(true);
    });
});

// ── Report ──────────────────────────────────────────────────────────────────
const report: SpeakingReport = {
    id: 'r1', overallScore: 7.3, maxScore: 10, performanceLevel: 'GOOD', answerRelevance: 'ON_TOPIC',
    summary: 'Solid answer.', scoreRationale: 'Correct core idea.', adjustments: [],
    confidence: { level: 'MEDIUM', limitations: ['No reference answer was available.'] },
    categoryScores: [
        { category: 'TECHNICAL_ACCURACY', label: 'Technical accuracy', applicable: true, score: 8, maxScore: 10, weight: 0.35, feedback: 'Accurate.' },
        { category: 'COMMUNICATION', label: 'Communication & language', applicable: false, score: null, maxScore: 10, weight: 0, feedback: 'Too short.' },
    ],
    strengths: [{ title: 'Components', description: 'Explained components.', evidence: 'React builds UIs' }],
    missedConcepts: [{ concept: 'Reconciliation', description: 'Missing.', importance: 'HIGH', whyItMatters: 'Core.', suggestion: 'Explain diffing.' }],
    incorrectInformation: [{ statement: 'React is a framework', explanation: 'It is a library.', correction: 'React is a UI library.' }],
    improvements: [{ title: 'Explain rendering', description: 'Connect state to re-render.' }],
    idealAnswer: 'React is a JavaScript library…',
    communicationFeedback: { clarity: 'CLEAR', structure: 'GOOD', repetition: 'NONE', feedback: 'Clear.', languageFeedback: '', deliveryFeedback: 'Good pace.' },
    usedReferenceAnswer: false, usedEvaluationCriteria: false,
    metadata: { evaluationModel: 'm', transcriptionModel: 'w', promptVersion: 'p', rubricVersion: 'speaking-rubric-v1', createdAt: '2026-10-30T10:00:00Z' },
};

describe('AssessmentReport', () => {
    test('renders every section, the score and no audio player', () => {
        const { container } = render(
            <AssessmentReport report={report} transcript={{ text: 'React builds UIs', language: 'en', lowConfidence: true, segments: [] }}
                audioMetrics={{ totalDurationSeconds: 40, speakingDurationSeconds: 36, wordCount: 80, wordsPerMinute: 133, longPauseCount: 1, longestPauseSeconds: 4 }} />
        );
        expect(screen.getByRole('img', { name: /score 7.3 out of 10/i })).toBeTruthy();
        expect(screen.getByText('Good', { selector: 'span' })).toBeTruthy();
        for (const h of ['Strengths', 'Missing concepts', 'Incorrect information', 'How to improve', 'Ideal answer', 'Communication', 'Transcript']) {
            expect(screen.getByRole('heading', { name: new RegExp(h) })).toBeTruthy();
        }
        expect(screen.getByText('Not assessed')).toBeTruthy();
        expect(screen.getByText(/No reference answer was available/)).toBeTruthy();
        expect(screen.getByText(/133 wpm/)).toBeTruthy();
        expect(screen.getByText(/may contain errors/)).toBeTruthy();
        expect(container.querySelector('audio')).toBeNull();
    });
});

// ── Practice flow ───────────────────────────────────────────────────────────
const question: StudentQuestion = {
    id: 'q1', courseId: 'c1', externalId: 'r1', type: 'audio_question', title: 'What is React?', prompt: 'Explain React.',
    topic: 'Basics', difficulty: 'beginner', expectedDurationMinutes: 2, resourceUrl: null, evaluationCriteria: null, dueDate: null,
    maxMarks: 10, displayOrder: 0, isActive: true, createdAt: '', updatedAt: '',
    progress: { status: 'NOT_STARTED', version: 0, updatedAt: null, updatedByRole: null, assessmentNotes: null, assessedAt: null, marksObtained: null, marksMax: null, marksUpdatedAt: null },
};
const settings = { maxRecordingSeconds: 300, minRecordingSeconds: 3, maxAudioBytes: 1e7, consentNoticeVersion: 'v1', audioRetentionMinutes: 30 };
const attempt = (over: Partial<SpeakingAttempt> = {}): SpeakingAttempt => ({
    id: 'a1', courseId: 'c1', questionId: 'q1', attemptNumber: 1, status: 'COMPLETED', processing: false, overallScore: 7.3,
    performanceLevel: 'GOOD', error: null, nextRetryAt: null, audio: { received: true, durationSeconds: 40, deleted: true, deletedAt: '' },
    transcriptLanguage: 'en', latestReview: null, submittedAt: '2026-10-30T10:00:00Z', completedAt: '2026-10-30T10:01:00Z',
    createdAt: '', updatedAt: '', ...over,
});
const history = (attempts: SpeakingAttempt[], activeAttemptId: string | null = null): QuestionHistory => ({
    data: attempts, meta: { page: 1, limit: 50, total: attempts.length, totalPages: 1 },
    stats: { totalAttempts: attempts.length, completedAttempts: attempts.length, latestScore: 7.3, bestScore: 7.3, averageScore: 7.3, firstScore: 7.3, improvement: null, lastPracticedAt: null },
    activeAttemptId, settings, scoreHistory: [],
});
const detail = (over: Partial<AttemptDetail> = {}): AttemptDetail => ({
    ...attempt(), question: { id: 'q1', title: 'What is React?', prompt: '', topic: null, difficulty: null }, report, review: null,
    transcript: { text: 'React builds UIs', language: 'en', durationSeconds: 40, lowConfidence: false, segments: [] }, ...over,
});

describe('SpeakingPractice', () => {
    beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });

    test('shows history and opens a previous report', async () => {
        speaking.history.mockResolvedValue(history([attempt()]));
        speaking.attempt.mockResolvedValue(detail());
        render(<SpeakingPractice courseId="c1" question={question} onBack={vi.fn()} />);
        fireEvent.click(await screen.findByRole('button', { name: /#1/ }));
        expect(await screen.findByText('Solid answer.')).toBeTruthy();
        expect(screen.getByText(/Attempt 1 ·/)).toBeTruthy();
    });

    test('requires the AI processing notice before submitting', async () => {
        speaking.history.mockResolvedValue(history([]));
        render(<SpeakingPractice courseId="c1" question={question} onBack={vi.fn()} />);
        expect(await screen.findByText(/How your recording is used/)).toBeTruthy();
        expect((screen.getByRole('button', { name: /start recording/i }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('checkbox'));
        expect((screen.getByRole('button', { name: /start recording/i }) as HTMLButtonElement).disabled).toBe(false);
        expect(localStorage.getItem('speaking-consent:v1')).toBe('1');
    });

    test('submits once, shows processing, then the report', async () => {
        localStorage.setItem('speaking-consent:v1', '1');
        speaking.history.mockResolvedValue(history([]));
        speaking.createAttempt.mockResolvedValue(attempt({ status: 'UPLOADING', processing: true, overallScore: null }));
        let resolveUpload!: (a: SpeakingAttempt) => void;
        speaking.uploadAudio.mockImplementation(() => new Promise(r => { resolveUpload = r; }));
        speaking.attempt.mockResolvedValue(detail());

        render(<SpeakingPractice courseId="c1" question={question} onBack={vi.fn()} />);
        await screen.findByRole('button', { name: /start recording/i });
        await recordFor(20);
        const submit = screen.getByRole('button', { name: /submit for ai evaluation/i });
        fireEvent.click(submit);
        fireEvent.click(submit); // double click
        await waitFor(() => expect(speaking.createAttempt).toHaveBeenCalledTimes(1));
        expect(speaking.uploadAudio).toHaveBeenCalledTimes(1);

        await act(async () => resolveUpload(attempt({ status: 'UPLOADED', processing: true, overallScore: null })));
        expect(await screen.findByText(/queued for assessment/i)).toBeTruthy();
        expect(await screen.findByText('Solid answer.', {}, { timeout: 4000 })).toBeTruthy();
        expect(toast.success).toHaveBeenCalled();
    });

    test('keeps the recording and reuses the attempt when the upload fails', async () => {
        localStorage.setItem('speaking-consent:v1', '1');
        speaking.history.mockResolvedValue(history([]));
        speaking.createAttempt.mockResolvedValue(attempt({ id: 'a9', status: 'UPLOADING', processing: true }));
        speaking.uploadAudio.mockRejectedValueOnce({ message: 'Network Error' }).mockResolvedValueOnce(attempt({ id: 'a9', status: 'UPLOADED', processing: true }));
        speaking.attempt.mockResolvedValue(detail({ id: 'a9' }));

        render(<SpeakingPractice courseId="c1" question={question} onBack={vi.fn()} />);
        await screen.findByRole('button', { name: /start recording/i });
        await recordFor(20);
        fireEvent.click(screen.getByRole('button', { name: /submit for ai evaluation/i }));
        expect(await screen.findByText(/Your recording is still here/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /^try again$/i }));
        await waitFor(() => expect(speaking.uploadAudio).toHaveBeenCalledTimes(2));
        expect(speaking.createAttempt).toHaveBeenCalledTimes(1);
        expect(speaking.uploadAudio.mock.calls[1][1]).toBe('a9');
    });

    test('resumes a processing attempt after a refresh and offers evaluation retry on failure', async () => {
        speaking.history.mockResolvedValue(history([attempt({ status: 'EVALUATING', processing: true, overallScore: null })], 'a1'));
        speaking.attempt.mockResolvedValue(detail({ status: 'FAILED', processing: false, report: null, error: { code: 'AI_UPSTREAM_ERROR', message: 'Evaluator down.', stage: 'evaluation', willRetry: false, canRetry: true } }));
        speaking.retry.mockResolvedValue(attempt({ status: 'EVALUATING', processing: true }));
        render(<SpeakingPractice courseId="c1" question={question} onBack={vi.fn()} />);
        expect(await screen.findByText(/evaluating your answer/i)).toBeTruthy();
        fireEvent.click(await screen.findByRole('button', { name: /retry evaluation/i }, { timeout: 4000 }));
        await waitFor(() => expect(speaking.retry).toHaveBeenCalledWith('c1', 'a1'));
    });
});


describe('report readability', () => {
    const long: SpeakingReport = {
        ...report,
        scoreRationale: 'Core idea is right. Two key concepts are missing. Delivery was clear.',
        missedConcepts: [
            { concept: 'Virtual DOM', description: 'React keeps an in-memory tree. It diffs it on updates.', importance: 'HIGH', whyItMatters: 'Explains performance. Core to rendering.', suggestion: 'Say it compares old and new trees.' },
            { concept: 'Hooks', description: 'Hooks add state to functions.', importance: 'MEDIUM', whyItMatters: 'Modern React uses them.', suggestion: 'Name useState.' },
        ],
        idealAnswer: 'React is a UI library. It uses components. State changes re-render the UI. It updates the DOM efficiently. Hooks add state to functions.',
    };

    test('shows long feedback as bullet points instead of a wall of text', () => {
        const { container } = render(<AssessmentReport report={long} transcript={null} />);
        const bullets = Array.from(container.querySelectorAll('li')).map(l => l.textContent);
        expect(bullets).toContain('Core idea is right.');
        expect(bullets).toContain('Two key concepts are missing.');
        expect(bullets).toContain('Core to rendering.');
    });

    test('missing concepts are collapsible, with high priority open by default and a priority label', () => {
        const { container } = render(<AssessmentReport report={long} transcript={null} />);
        expect(screen.getByText('High priority')).toBeTruthy();
        expect(screen.getByText('Medium priority')).toBeTruthy();
        const items = Array.from(container.querySelectorAll('#r-missing details'));
        expect(items.map(d => (d as HTMLDetailsElement).open)).toEqual([true, false]);
        expect(screen.getAllByText('Why it matters').length).toBe(2);
        expect(screen.getAllByText('Say it like this').length).toBe(2);
    });

    test('communication ratings are colour-coded and labelled', () => {
        const poor: SpeakingReport = { ...long, communicationFeedback: { ...long.communicationFeedback!, clarity: 'UNCLEAR', structure: 'FAIR', repetition: 'NONE' } };
        const { container } = render(<AssessmentReport report={poor} transcript={null} />);
        expect(screen.getByText('Unclear')).toBeTruthy();
        expect(screen.getByText('Fair')).toBeTruthy();
        expect(container.querySelector('.border-rose-200')).toBeTruthy();
        expect(container.querySelector('.border-amber-200')).toBeTruthy();
        expect(container.querySelector('.border-emerald-200')).toBeTruthy();
    });

    test('splits the ideal answer into short paragraphs', () => {
        expect(toParagraphs(long.idealAnswer)).toHaveLength(2);
    });
});

describe('text helpers', () => {
    test('splitSentences keeps abbreviations together and ignores empty input', () => {
        expect(splitSentences('Use hooks, e.g. useState. Then render. Done!')).toEqual(['Use hooks, e.g. useState.', 'Then render.', 'Done!']);
        expect(splitSentences('')).toEqual([]);
        expect(splitSentences('One sentence only')).toEqual(['One sentence only']);
    });
    test('tones', () => {
        expect(ratingTone('CLEAR')).toBe('green');
        expect(ratingTone('FAIR')).toBe('amber');
        expect(ratingTone('EXCESSIVE')).toBe('red');
        expect(importanceTone('HIGH')).toBe('red');
        expect(importanceTone('LOW')).toBe('sky');
    });
});

describe('recorder layout', () => {
    test('keeps the same fixed zones while idle, recording and previewing', async () => {
        const { container } = render(<AudioRecorder maxSeconds={300} minSeconds={3} submitting={false} uploadProgress={null} onSubmit={vi.fn()} />);
        const heights = () => ['h-9', 'h-20', 'h-32'].map(c => !!container.querySelector('.' + c));
        expect(heights()).toEqual([true, true, true]);
        fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
        await screen.findByRole('button', { name: /^stop$/i });
        expect(heights()).toEqual([true, true, true]);
        fireEvent.click(screen.getByRole('button', { name: /^stop$/i }));
        await screen.findByRole('button', { name: /submit for ai evaluation/i });
        expect(heights()).toEqual([true, true, true]);
    });

    test('the record button and waveform are green', async () => {
        const { container } = render(<AudioRecorder maxSeconds={300} minSeconds={3} submitting={false} uploadProgress={null} onSubmit={vi.fn()} />);
        expect(container.querySelector('button .bg-emerald-500')).toBeTruthy();
        expect(container.querySelector('.text-emerald-500 canvas')).toBeTruthy();
    });
});

describe('speaking helpers', () => {
    test('practice state combines progress and attempts', () => {
        expect(practiceState('NOT_STARTED', undefined)).toBe('NOT_STARTED');
        const base = { totalAttempts: 1, completedAttempts: 0, latestScore: null, bestScore: null, averageScore: null, firstScore: null, improvement: null, lastPracticedAt: null, latestAttemptId: 'a', latestErrorCode: null, lastActivity: '' };
        expect(practiceState('IN_PROGRESS', { ...base, latestStatus: 'TRANSCRIBING' })).toBe('PROCESSING');
        expect(practiceState('IN_PROGRESS', { ...base, latestStatus: 'FAILED' })).toBe('FAILED');
        expect(practiceState('IN_PROGRESS', { ...base, completedAttempts: 2, latestStatus: 'FAILED' })).toBe('PRACTICED');
        expect(practiceState('IN_PROGRESS', { ...base, latestStatus: 'COMPLETED' })).toBe('COMPLETED');
    });
    test('picks a recordable format the server accepts', () => {
        expect(pickRecordingMimeType(t => t === 'audio/mp4')).toBe('audio/mp4');
        expect(pickRecordingMimeType(() => false)).toBeNull();
    });
});

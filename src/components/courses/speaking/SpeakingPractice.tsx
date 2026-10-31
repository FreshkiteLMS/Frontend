"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, ExternalLink, History, Loader2, RefreshCw, ShieldCheck, Trophy, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { speakingService } from '@/services/api/speaking.api';
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '@/services/api/structured-course.api';
import type { AttemptDetail, QuestionHistory, SpeakingAttempt } from '@/types/speaking';
import type { StudentQuestion } from '@/types/structured-questions';
import { ATTEMPT_STATUS_LABELS, CONSENT_STORAGE_KEY, formatRelative, formatScore, newRequestId, scoreTone } from '@/lib/speaking';
import { AudioRecorder } from './AudioRecorder';
import type { Recording } from './useAudioRecorder';
import { AssessmentReport, PerformanceBadge } from './AssessmentReport';

const POLL_MS = [1500, 2000, 3000, 5000];
const PROCESSING_STEPS: { status: SpeakingAttempt['status'][]; label: string }[] = [
    { status: ['UPLOADING', 'UPLOADED'], label: 'Received' },
    { status: ['TRANSCRIBING'], label: 'Transcribing' },
    { status: ['EVALUATING'], label: 'Evaluating' },
    { status: ['COMPLETED'], label: 'Report ready' },
];

function readConsent(version: string): boolean {
    try { return localStorage.getItem(CONSENT_STORAGE_KEY(version)) === '1'; } catch { return false; }
}
function writeConsent(version: string) {
    try { localStorage.setItem(CONSENT_STORAGE_KEY(version), '1'); } catch { /* storage unavailable */ }
}

/** Live processing state for an attempt, with a step indicator. */
function ProcessingCard({ attempt, onRetry, retrying }: { attempt: SpeakingAttempt; onRetry: () => void; retrying: boolean }) {
    if (attempt.status === 'FAILED') {
        return (
            <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 p-4 sm:p-5">
                <p className="font-semibold text-red-800 dark:text-red-200">Assessment failed</p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{attempt.error?.message ?? 'Something went wrong.'}</p>
                {attempt.error?.canRetry ? (
                    <button type="button" onClick={onRetry} disabled={retrying} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" /> Retry evaluation
                    </button>
                ) : (
                    <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">Your recording was deleted. Record a new answer below.</p>
                )}
            </div>
        );
    }
    const current = PROCESSING_STEPS.findIndex(s => s.status.includes(attempt.status));
    return (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-900/20 p-4 sm:p-5" role="status" aria-live="polite">
            <p className="flex items-center gap-2 font-semibold text-sky-900 dark:text-sky-100">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {attempt.status === 'TRANSCRIBING' ? 'Transcribing your answer…' : attempt.status === 'EVALUATING' ? 'The AI is evaluating your answer…' : 'Your answer is queued for assessment…'}
            </p>
            {attempt.error?.willRetry && <p className="mt-1 text-xs text-sky-800 dark:text-sky-200">{attempt.error.message}</p>}
            <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Assessment progress">
                {PROCESSING_STEPS.map((s, i) => (
                    <li key={s.label} className="text-center">
                        <span className={`mx-auto block h-1.5 rounded-full ${i <= current ? 'bg-sky-500' : 'bg-sky-200 dark:bg-sky-900'}`} />
                        <span className={`mt-1.5 block text-[11px] ${i === current ? 'font-semibold text-sky-900 dark:text-sky-100' : 'text-sky-700/70 dark:text-sky-300/70'}`}>
                            {s.label}{i < current ? ' ✓' : ''}
                        </span>
                    </li>
                ))}
            </ol>
            <p className="mt-3 text-xs text-sky-800/80 dark:text-sky-200/80">This usually takes under a minute. You can leave this page — the result will be here when you come back.</p>
        </div>
    );
}

function ScoreTrend({ points }: { points: QuestionHistory['scoreHistory'] }) {
    if (points.length < 2) return null;
    const last = points.slice(-12);
    return (
        <div className="mt-3" role="img" aria-label={`Score history: ${last.map(p => `attempt ${p.attemptNumber} ${p.score}`).join(', ')}`}>
            <div className="flex h-12 items-end gap-1" aria-hidden="true">
                {last.map(p => (
                    <div key={p.attemptNumber} className="flex-1 rounded-t bg-blue-500/70 dark:bg-blue-400/60" style={{ height: `${Math.max(6, p.score * 10)}%` }} title={`Attempt ${p.attemptNumber}: ${p.score}`} />
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400" aria-hidden="true">
                <span>#{last[0].attemptNumber}</span><span>#{last[last.length - 1].attemptNumber}</span>
            </div>
        </div>
    );
}

/**
 * One-screen practice flow for an audio question:
 * question → record → preview → submit → processing → report, plus history.
 * Processing state is persisted on the server, so refreshing or returning
 * later resumes it.
 */
export function SpeakingPractice({ courseId, question, onBack, onChanged, readOnly = false, openLatest = false }: {
    courseId: string;
    question: StudentQuestion;
    onBack: () => void;
    onChanged?: () => void;
    readOnly?: boolean;
    /** Open the newest completed report straight away (the "View report" shortcut). */
    openLatest?: boolean;
}) {
    const [history, setHistory] = useState<QuestionHistory | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [active, setActive] = useState<SpeakingAttempt | null>(null);
    const [viewing, setViewing] = useState<AttemptDetail | null>(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [failedUpload, setFailedUpload] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [consent, setConsent] = useState(false);
    const [recorderKey, setRecorderKey] = useState(0);
    const [retrying, setRetrying] = useState(false);
    // One idempotency key + attempt per recording, reused if the upload is retried.
    const pendingRef = useRef<{ recording: Recording; requestId: string; attemptId: string | null } | null>(null);
    const submittingRef = useRef(false);
    const reportRef = useRef<HTMLDivElement | null>(null);

    const settings = history?.settings ?? null;

    const loadHistory = useCallback(async () => {
        try {
            const h = await speakingService.history(courseId, question.id, 1, 50);
            setHistory(h);
            setLoadError(null);
            if (h.settings) setConsent(readConsent(h.settings.consentNoticeVersion));
            return h;
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load your attempts.'));
            return null;
        }
    }, [courseId, question.id]);

    const openAttempt = useCallback(async (attemptId: string, scroll = true) => {
        setViewLoading(true);
        try {
            const d = await speakingService.attempt(courseId, attemptId);
            setViewing(d);
            if (scroll) setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not open this report.'));
        } finally {
            setViewLoading(false);
        }
    }, [courseId]);

    // Initial load: resume an attempt that is still processing.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const h = await loadHistory();
            if (cancelled || !h) return;
            const processing = h.activeAttemptId ? h.data.find(a => a.id === h.activeAttemptId) : null;
            if (processing) {
                setActive(processing);
                return;
            }
            const latest = openLatest ? h.data.find(a => a.status === 'COMPLETED') : null;
            if (latest) void openAttempt(latest.id);
        })();
        return () => { cancelled = true; };
    }, [loadHistory, openAttempt, openLatest]);

    // Poll the active attempt until it finishes.
    const activeId = active?.processing ? active.id : null;
    useEffect(() => {
        if (!activeId) return;
        let stopped = false;
        let n = 0;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            try {
                const d = await speakingService.attempt(courseId, activeId);
                if (stopped) return;
                if (d.processing) {
                    setActive(d);
                } else {
                    setActive(d.status === 'FAILED' ? d : null);
                    await loadHistory();
                    onChanged?.();
                    if (d.status === 'COMPLETED') {
                        setViewing(d);
                        toast.success(`Assessment ready: ${formatScore(d.overallScore)}/10`);
                        setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }
                    return;
                }
            } catch {
                // Transient network error: keep polling with backoff.
            }
            timer = setTimeout(tick, POLL_MS[Math.min(n++, POLL_MS.length - 1)]);
        };
        timer = setTimeout(tick, POLL_MS[0]);
        return () => { stopped = true; clearTimeout(timer); };
    }, [activeId, courseId, loadHistory, onChanged]);

    // Warn before leaving with an unsubmitted recording or an upload in flight.
    useEffect(() => {
        if (!dirty && !submitting) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty, submitting]);

    const confirmLeave = () => !(dirty || submitting) || window.confirm('Your recording has not been submitted and will be lost. Leave anyway?');

    const submit = async (recording: Recording) => {
        if (submittingRef.current || !settings) return;
        if (!consent) {
            toast.error('Please confirm the AI processing notice first.');
            return;
        }
        submittingRef.current = true;
        setSubmitting(true);
        setFailedUpload(null);
        setUploadProgress(0);
        if (!pendingRef.current || pendingRef.current.recording !== recording) {
            pendingRef.current = { recording, requestId: newRequestId(), attemptId: null };
        }
        const pending = pendingRef.current;
        try {
            if (!pending.attemptId) {
                const created = await speakingService.createAttempt(courseId, question.id, pending.requestId);
                pending.attemptId = created.id;
            }
            const result = await speakingService.uploadAudio(courseId, pending.attemptId, recording.blob, recording.durationSeconds, setUploadProgress);
            pendingRef.current = null;
            setDirty(false);
            setRecorderKey(k => k + 1); // discard the local recording
            setViewing(null);
            setActive(result);
            onChanged?.();
            void loadHistory();
        } catch (err) {
            const code = apiErrorCode(err);
            if (code === 'ATTEMPT_IN_PROGRESS') {
                const id = apiErrorDetails<{ attemptId?: string }>(err)?.attemptId;
                toast(apiErrorMessage(err, 'Your previous answer is still being assessed.'), { icon: 'ℹ️' });
                if (id) setActive(await speakingService.attempt(courseId, id).catch(() => null));
            } else if (code && ['UNSUPPORTED_AUDIO_FORMAT', 'AUDIO_TYPE_MISMATCH', 'RECORDING_EMPTY', 'RECORDING_TOO_LARGE', 'RECORDING_TOO_LONG', 'RECORDING_TOO_SHORT', 'ATTEMPT_CLOSED'].includes(code)) {
                // The server rejected this recording for good — a new one is needed.
                pendingRef.current = null;
                toast.error(apiErrorMessage(err, 'This recording could not be used. Please record again.'));
                void loadHistory();
            } else {
                // Network/transient: keep the recording and the attempt for a retry.
                setFailedUpload(apiErrorMessage(err, 'The upload failed. Check your connection and try again.'));
            }
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
            setUploadProgress(null);
        }
    };

    const retryEvaluation = async () => {
        if (!active) return;
        setRetrying(true);
        try {
            setActive(await speakingService.retry(courseId, active.id));
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not restart the evaluation.'));
        } finally {
            setRetrying(false);
        }
    };

    const stats = history?.stats;
    const busy = !!active?.processing;

    return (
        <section aria-labelledby="sp-title" className="space-y-5">
            <button type="button" onClick={() => { if (confirmLeave()) onBack(); }} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All questions
            </button>

            <header className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Audio question{question.topic ? ` · ${question.topic}` : ''}{question.difficulty ? ` · ${question.difficulty}` : ''}
                </p>
                <h2 id="sp-title" className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{question.title}</h2>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">{question.prompt}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                    {question.expectedDurationMinutes && (
                        <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />Aim for about {question.expectedDurationMinutes} min</span>
                    )}
                    {settings && <span>Max recording {Math.round(settings.maxRecordingSeconds / 60)} min</span>}
                    {question.resourceUrl && (
                        <a href={question.resourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Resource
                        </a>
                    )}
                </div>
                {question.evaluationCriteria && (
                    <details className="mt-4 text-sm">
                        <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">What a good answer covers</summary>
                        <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{question.evaluationCriteria}</p>
                    </details>
                )}
                {stats && stats.totalAttempts > 0 && (
                    <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                            <dt className="text-[11px] text-gray-500 dark:text-gray-400">Latest score</dt>
                            <dd className={`text-xl font-bold tabular-nums ${scoreTone(stats.latestScore)}`}>{formatScore(stats.latestScore)}</dd>
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                            <dt className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><Trophy className="h-3 w-3" aria-hidden="true" />Best score</dt>
                            <dd className={`text-xl font-bold tabular-nums ${scoreTone(stats.bestScore)}`}>{formatScore(stats.bestScore)}</dd>
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                            <dt className="text-[11px] text-gray-500 dark:text-gray-400">Attempts</dt>
                            <dd className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{stats.totalAttempts}</dd>
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                            <dt className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><TrendingUp className="h-3 w-3" aria-hidden="true" />Since first try</dt>
                            <dd className={`text-xl font-bold tabular-nums ${stats.improvement === null ? 'text-gray-400' : stats.improvement >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {stats.improvement === null ? '—' : `${stats.improvement > 0 ? '+' : ''}${stats.improvement}`}
                            </dd>
                        </div>
                    </dl>
                )}
            </header>

            {loadError && (
                <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-300">
                    {loadError} <button type="button" onClick={() => void loadHistory()} className="font-medium underline">Retry</button>
                </div>
            )}

            {active && <ProcessingCard attempt={active} onRetry={retryEvaluation} retrying={retrying} />}

            {!readOnly && settings && (
                <>
                    {!consent && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm">
                            <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />How your recording is used</p>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">
                                Your recording is sent to an AI service to be transcribed and evaluated. It is kept only while it is processed (at most {settings.audioRetentionMinutes} minutes) and then deleted — it cannot be played back later.
                                The transcript and feedback are saved so you and your instructors can review them.
                            </p>
                            <label className="mt-3 flex items-start gap-2 text-gray-800 dark:text-gray-200">
                                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300" checked={consent} onChange={e => { if (e.target.checked) { writeConsent(settings.consentNoticeVersion); setConsent(true); } }} />
                                I understand and agree to AI processing of my recordings.
                            </label>
                        </div>
                    )}
                    <AudioRecorder
                        key={recorderKey}
                        maxSeconds={settings.maxRecordingSeconds}
                        minSeconds={settings.minRecordingSeconds}
                        submitting={submitting}
                        uploadProgress={uploadProgress}
                        disabled={busy || !consent}
                        disabledReason={busy ? 'Wait for your current answer to be assessed before recording another.' : !consent ? 'Confirm the AI processing notice above to submit a recording.' : undefined}
                        onSubmit={submit}
                        onDirtyChange={setDirty}
                    />
                    {failedUpload && (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
                            <span>{failedUpload} Your recording is still here.</span>
                            <button type="button" onClick={() => pendingRef.current && void submit(pendingRef.current.recording)} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700">Try again</button>
                        </div>
                    )}
                </>
            )}
            {!history && !loadError && <div className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" aria-label="Loading" />}

            <div ref={reportRef} className="scroll-mt-20">
                {viewLoading && <p className="py-6 text-center text-sm text-gray-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Opening report…</p>}
                {viewing?.report && !viewLoading && (
                    <AssessmentReport
                        report={viewing.report}
                        transcript={viewing.transcript}
                        audioMetrics={viewing.audioMetrics}
                        idPrefix={`a${viewing.attemptNumber ?? ''}`}
                        header={
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Attempt {viewing.attemptNumber} · {viewing.question?.title ?? question.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{viewing.completedAt ? new Date(viewing.completedAt).toLocaleString() : ''}</p>
                                </div>
                                {viewing.review && (
                                    <p className="rounded-lg bg-indigo-50 dark:bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-900 dark:text-indigo-200">
                                        Reviewed by your instructor{viewing.review.decision === 'SCORE_ADJUSTED' && viewing.review.adjustedScore !== null ? ` — adjusted score ${viewing.review.adjustedScore}/10` : viewing.review.decision === 'CONFIRMED' ? ' — confirmed' : ' — flagged'}
                                        {viewing.review.notes ? `: ${viewing.review.notes}` : ''}
                                    </p>
                                )}
                            </div>
                        }
                    />
                )}
            </div>

            {history && history.data.length > 0 && (
                <section aria-labelledby="sp-history" className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5">
                    <h3 id="sp-history" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><History className="h-4 w-4" aria-hidden="true" />Your attempts</h3>
                    <ScoreTrend points={history.scoreHistory} />
                    <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                        {history.data.map(a => {
                            const isBest = a.overallScore !== null && a.overallScore === stats?.bestScore;
                            const selected = viewing?.id === a.id;
                            return (
                                <li key={a.id}>
                                    <button
                                        type="button"
                                        disabled={a.status !== 'COMPLETED'}
                                        onClick={() => void openAttempt(a.id)}
                                        aria-current={selected ? 'true' : undefined}
                                        className={`flex w-full items-center gap-3 px-2 py-3 text-left rounded-lg disabled:cursor-default ${selected ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}
                                    >
                                        <span className="w-16 text-sm font-semibold text-gray-700 dark:text-gray-200">#{a.attemptNumber}</span>
                                        <span className="flex-1 text-sm text-gray-500 dark:text-gray-400">{formatRelative(a.completedAt ?? a.submittedAt)}</span>
                                        {a.status === 'COMPLETED' ? (
                                            <>
                                                {isBest && <span className="hidden sm:inline text-[11px] font-semibold text-amber-600 dark:text-amber-400">Best</span>}
                                                <PerformanceBadge level={a.performanceLevel} />
                                                <span className={`w-12 text-right text-base font-bold tabular-nums ${scoreTone(a.overallScore)}`}>{formatScore(a.overallScore)}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{ATTEMPT_STATUS_LABELS[a.status]}</span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </section>
    );
}

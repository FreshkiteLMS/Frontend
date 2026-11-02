"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { History, Loader2, Mic, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { problemCourseService } from '@/services/api/problem-course.api';
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '@/services/api/structured-course.api';
import type { LogicAttemptDetail, LogicHistory } from '@/types/problem-course';
import type { SpeakingAttempt } from '@/types/speaking';
import { ATTEMPT_STATUS_LABELS, CONSENT_STORAGE_KEY, formatRelative, newRequestId } from '@/lib/speaking';
import { AudioRecorder } from '@/components/courses/speaking/AudioRecorder';
import type { Recording } from '@/components/courses/speaking/useAudioRecorder';
import { ProcessingCard } from '@/components/courses/speaking/SpeakingPractice';
import { AttemptAllowanceBanner } from '@/components/assessments/AttemptAllowanceBanner';
import { LogicAssessmentReport, VerdictBadge, scoreColor } from './LogicAssessmentReport';

const POLL_MS = [1500, 2000, 3000, 5000];
const REJECTED_FOR_GOOD = ['UNSUPPORTED_AUDIO_FORMAT', 'AUDIO_TYPE_MISMATCH', 'RECORDING_EMPTY', 'RECORDING_TOO_LARGE', 'RECORDING_TOO_LONG', 'RECORDING_TOO_SHORT', 'ATTEMPT_CLOSED'];

const readConsent = (v: string) => { try { return localStorage.getItem(CONSENT_STORAGE_KEY(v)) === '1'; } catch { return false; } };
const writeConsent = (v: string) => { try { localStorage.setItem(CONSENT_STORAGE_KEY(v), '1'); } catch { /* storage unavailable */ } };

/**
 * "Explain Your Approach": the student records how they would solve the
 * problem and gets AI feedback on the logic. Recording, upload, transcription,
 * temporary audio and attempt limits are the same pipeline as course audio
 * questions; this component only presents the problem-specific results.
 * Processing state lives on the server, so leaving and returning resumes it.
 */
export function ProblemLogicPractice({ courseId, problemId, problemTitle }: { courseId: string; problemId: string; problemTitle: string }) {
    const [history, setHistory] = useState<LogicHistory | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [active, setActive] = useState<SpeakingAttempt | null>(null);
    const [viewing, setViewing] = useState<LogicAttemptDetail | null>(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [failedUpload, setFailedUpload] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [consent, setConsent] = useState(false);
    const [recorderKey, setRecorderKey] = useState(0);
    const [retrying, setRetrying] = useState(false);
    const pendingRef = useRef<{ recording: Recording; requestId: string; attemptId: string | null } | null>(null);
    const submittingRef = useRef(false);
    const reportRef = useRef<HTMLDivElement | null>(null);

    const settings = history?.settings ?? null;
    const allowance = history?.allowance ?? null;

    const loadHistory = useCallback(async () => {
        try {
            const h = await problemCourseService.logicHistory(courseId, problemId, 1, 50);
            setHistory(h);
            setLoadError(null);
            if (h.settings) setConsent(readConsent(h.settings.consentNoticeVersion));
            return h;
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load your attempts.'));
            return null;
        }
    }, [courseId, problemId]);

    const openAttempt = useCallback(async (attemptId: string, scroll = true) => {
        setViewLoading(true);
        try {
            setViewing(await problemCourseService.logicAttempt(courseId, attemptId));
            if (scroll) setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not open this assessment.'));
        } finally {
            setViewLoading(false);
        }
    }, [courseId]);

    // Resume a processing attempt; otherwise show the latest result.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const h = await loadHistory();
            if (cancelled || !h) return;
            const processing = h.activeAttemptId ? h.data.find(a => a.id === h.activeAttemptId) : null;
            if (processing) { setActive(processing as SpeakingAttempt); return; }
            const latest = h.data.find(a => a.status === 'COMPLETED');
            if (latest) void openAttempt(latest.id, false);
        })();
        return () => { cancelled = true; };
    }, [loadHistory, openAttempt]);

    // Poll the active attempt until it finishes (never blocks the rest of the page).
    const activeId = active?.processing ? active.id : null;
    useEffect(() => {
        if (!activeId) return;
        let stopped = false;
        let n = 0;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            try {
                const d = await problemCourseService.logicAttempt(courseId, activeId);
                if (stopped) return;
                if (d.processing) setActive(d as unknown as SpeakingAttempt);
                else {
                    setActive(d.status === 'FAILED' ? (d as unknown as SpeakingAttempt) : null);
                    await loadHistory();
                    if (d.status === 'COMPLETED' && d.report) {
                        setViewing(d);
                        toast.success(`Assessment ready: ${d.report.overallScore}/10`);
                        setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }
                    return;
                }
            } catch { /* transient: keep polling */ }
            timer = setTimeout(tick, POLL_MS[Math.min(n++, POLL_MS.length - 1)]);
        };
        timer = setTimeout(tick, POLL_MS[0]);
        return () => { stopped = true; clearTimeout(timer); };
    }, [activeId, courseId, loadHistory]);

    useEffect(() => {
        if (!dirty && !submitting) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty, submitting]);

    const submit = async (recording: Recording) => {
        if (submittingRef.current || !settings) return;
        if (!consent) { toast.error('Please confirm the AI processing notice first.'); return; }
        submittingRef.current = true;
        setSubmitting(true);
        setFailedUpload(null);
        setUploadProgress(0);
        if (!pendingRef.current || pendingRef.current.recording !== recording) {
            pendingRef.current = { recording, requestId: newRequestId(), attemptId: null };
        }
        const pending = pendingRef.current;
        try {
            if (!pending.attemptId) pending.attemptId = (await problemCourseService.createLogicAttempt(courseId, problemId, pending.requestId)).id;
            const result = await problemCourseService.uploadLogicAudio(courseId, pending.attemptId, recording.blob, recording.durationSeconds, setUploadProgress);
            pendingRef.current = null;
            setDirty(false);
            setRecorderKey(k => k + 1);
            setViewing(null);
            setActive(result);
            void loadHistory();
        } catch (err) {
            const code = apiErrorCode(err);
            if (code === 'ATTEMPT_IN_PROGRESS') {
                const id = apiErrorDetails<{ attemptId?: string }>(err)?.attemptId;
                toast(apiErrorMessage(err, 'Your previous explanation is still being assessed.'), { icon: 'ℹ️' });
                if (id) setActive((await problemCourseService.logicAttempt(courseId, id).catch(() => null)) as SpeakingAttempt | null);
            } else if (code === 'ATTEMPT_LIMIT_REACHED') {
                pendingRef.current = null;
                toast.error(apiErrorMessage(err, 'You have used all your attempts for this problem.'));
                void loadHistory();
            } else if (code && REJECTED_FOR_GOOD.includes(code)) {
                pendingRef.current = null;
                toast.error(apiErrorMessage(err, 'This recording could not be used. Please record again.'));
                void loadHistory();
            } else {
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
            setActive(await problemCourseService.retryLogicAttempt(courseId, active.id));
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not restart the evaluation.'));
        } finally {
            setRetrying(false);
        }
    };

    const busy = !!active?.processing;
    const limitReached = !!allowance?.limitReached;
    const stats = history?.stats;

    return (
        <section aria-labelledby="logic-title" className="space-y-4">
            <header>
                <h3 id="logic-title" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><Mic className="h-5 w-5 text-blue-600" aria-hidden="true" />Explain Your Approach</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Explain how you would solve this problem. Describe your approach, algorithm, data structures, and time and space complexity.
                    Our AI will evaluate your explanation and provide personalized feedback.
                </p>
                {settings && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Up to {Math.round(settings.maxRecordingSeconds / 60)} minutes. No code needed — just your reasoning.</p>}
            </header>

            {loadError && (
                <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
                    {loadError} <button type="button" onClick={() => void loadHistory()} className="font-medium underline">Retry</button>
                </div>
            )}

            {active && <ProcessingCard attempt={active} onRetry={retryEvaluation} retrying={retrying} />}

            {settings && (
                <>
                    <AttemptAllowanceBanner allowance={allowance} item={{ kind: 'PROBLEM_LOGIC', courseId, itemId: problemId }} itemTitle={problemTitle} onRequested={() => void loadHistory()} />
                    {!consent && !limitReached && (
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
                    {!limitReached && (
                        <AudioRecorder
                            key={recorderKey}
                            maxSeconds={settings.maxRecordingSeconds}
                            minSeconds={settings.minRecordingSeconds}
                            submitting={submitting}
                            uploadProgress={uploadProgress}
                            disabled={busy || !consent}
                            disabledReason={busy ? 'Wait for your current explanation to be assessed before recording another.' : !consent ? 'Confirm the AI processing notice above to submit a recording.' : undefined}
                            onSubmit={submit}
                            onDirtyChange={setDirty}
                        />
                    )}
                    {failedUpload && (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
                            <span>{failedUpload} Your recording is still here.</span>
                            <button type="button" onClick={() => pendingRef.current && void submit(pendingRef.current.recording)} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700">Try again</button>
                        </div>
                    )}
                </>
            )}
            {!history && !loadError && <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" aria-label="Loading" />}

            <div ref={reportRef} className="scroll-mt-4">
                {viewLoading && <p className="py-6 text-center text-sm text-gray-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Opening assessment…</p>}
                {viewing?.report && !viewLoading && (
                    <LogicAssessmentReport
                        report={viewing.report}
                        transcript={viewing.transcript ? { text: viewing.transcript.text, lowConfidence: viewing.transcript.lowConfidence } : null}
                        header={
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Attempt {viewing.attemptNumber}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{viewing.completedAt ? new Date(viewing.completedAt).toLocaleString() : ''}</p>
                            </div>
                        }
                    />
                )}
            </div>

            {history && history.data.length > 0 && (
                <section aria-labelledby="logic-history" className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <h4 id="logic-history" className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <History className="h-4 w-4" aria-hidden="true" />Your attempts
                        {stats?.bestScore !== null && stats?.bestScore !== undefined && <span className="ml-auto text-xs font-normal text-gray-500">Best {stats.bestScore}/10</span>}
                    </h4>
                    <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
                        {history.data.map(a => (
                            <li key={a.id}>
                                <button
                                    type="button"
                                    disabled={a.status !== 'COMPLETED'}
                                    onClick={() => void openAttempt(a.id)}
                                    aria-current={viewing?.id === a.id ? 'true' : undefined}
                                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left disabled:cursor-default ${viewing?.id === a.id ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}
                                >
                                    <span className="w-10 text-sm font-semibold text-gray-700 dark:text-gray-200">#{a.attemptNumber}</span>
                                    <span className="flex-1 text-sm text-gray-500 dark:text-gray-400">{formatRelative(a.completedAt ?? a.submittedAt)}</span>
                                    {a.status === 'COMPLETED' ? (
                                        <>
                                            <VerdictBadge verdict={a.performanceLevel} />
                                            <span className={`w-10 text-right font-bold tabular-nums ${scoreColor(a.overallScore)}`}>{a.overallScore}</span>
                                        </>
                                    ) : (
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {a.error?.code === 'NOT_ASSESSABLE' ? 'Not assessable' : ATTEMPT_STATUS_LABELS[a.status]}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </section>
    );
}

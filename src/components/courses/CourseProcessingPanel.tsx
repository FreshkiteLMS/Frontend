'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { courseService } from '@/services/api/course.api';
import { isValidDocumentUrl } from '@/lib/document-url';
import type { Course } from '@/types/course';
import type { ProcessingState, ProcessingStatus, StructuredCourse } from '@/types/structured-course';

const POLL_INTERVAL_MS = 2500;

const STEPS: { label: string; statuses: ProcessingStatus[] }[] = [
    { label: 'Queued', statuses: ['uploaded', 'processing'] },
    { label: 'Reading document', statuses: ['extracting'] },
    { label: 'Structuring with AI', statuses: ['structuring'] },
    { label: 'Validating', statuses: ['validating'] },
    { label: 'Done', statuses: ['completed'] },
];

interface CourseProcessingPanelProps {
    /** Existing course id, or null before the course has been saved. */
    courseId: string | null;
    docLink: string;
    onDocLinkChange: (value: string) => void;
    /** Persist the course (creating a draft if needed) and return its id. */
    ensureCourseSaved: () => Promise<string | null>;
    structured: StructuredCourse | null | undefined;
    /** Called with the freshly loaded course after a successful run. */
    onProcessed: (course: Course) => void;
}

function apiErrorMessage(err: any, fallback: string): string {
    return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || fallback;
}

/**
 * Admin control for AI course processing. The document is processed on the
 * server; this component only starts a run and polls its persisted status.
 */
export function CourseProcessingPanel({
    courseId,
    docLink,
    onDocLinkChange,
    ensureCourseSaved,
    structured,
    onProcessed,
}: CourseProcessingPanelProps) {
    const [state, setState] = useState<ProcessingState | null>(null);
    const [starting, setStarting] = useState(false);
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onProcessedRef = useRef(onProcessed);
    onProcessedRef.current = onProcessed;

    const docLinkInvalid = docLink.trim().length > 0 && !isValidDocumentUrl(docLink);
    const busy = starting || !!state?.active;

    const stopPolling = () => {
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = null;
    };

    const poll = useCallback(async (id: string) => {
        try {
            const next = await courseService.getProcessingStatus(id);
            setState(next);
            if (next?.active) {
                pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL_MS);
            } else if (next?.status === 'completed') {
                const course = await courseService.getCourseById(id);
                onProcessedRef.current(course);
            }
        } catch (err) {
            // Transient network hiccup: keep polling rather than abandon a running job.
            console.error('Failed to fetch processing status:', err);
            pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL_MS * 2);
        }
    }, []);

    // Resume tracking an in-flight run (e.g. the admin navigated away and back).
    useEffect(() => {
        if (!courseId) return;
        let cancelled = false;
        courseService.getProcessingStatus(courseId)
            .then((current) => {
                if (cancelled) return;
                setState(current);
                if (current?.active) pollTimer.current = setTimeout(() => poll(courseId), POLL_INTERVAL_MS);
            })
            .catch(() => { /* status is optional on load */ });
        return () => { cancelled = true; stopPolling(); };
    }, [courseId, poll]);

    const handleProcess = async () => {
        if (!docLink.trim() || docLinkInvalid) return;
        if (structured && !window.confirm('Reprocess the document? The current AI-generated lessons will be replaced once the new run succeeds. Student progress is kept for lessons whose titles stay the same.')) {
            return;
        }
        setStarting(true);
        stopPolling();
        try {
            const id = await ensureCourseSaved();
            if (!id) throw new Error('Save the course details first.');
            const initial = await courseService.processDocument(id, docLink.trim());
            setState(initial);
            pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL_MS);
        } catch (err: any) {
            toast.error(apiErrorMessage(err, 'Failed to start processing.'));
        } finally {
            setStarting(false);
        }
    };

    // Toast once when a run we were watching finishes.
    const lastStatus = useRef<ProcessingStatus | null>(null);
    useEffect(() => {
        const prev = lastStatus.current;
        lastStatus.current = state?.status ?? null;
        if (!prev || prev === state?.status) return;
        if (state?.status === 'completed' && prev !== 'completed') toast.success('Document processed — lessons are ready to preview.');
        if (state?.status === 'failed' && prev !== 'failed') toast.error(state.error?.message || 'Processing failed.');
    }, [state]);

    const activeStep = state ? STEPS.findIndex((s) => s.statuses.includes(state.status)) : -1;
    const lessonCount = structured?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 0;

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-2">Source Document</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                        Paste a Google Doc link written the normal way — no special formatting needed. The AI reads the
                        document and organises it into modules and lessons with explanations, code, tables, exercises,
                        images and videos. Your course title, description, price and other details stay exactly as you entered them.
                    </p>
                    <label htmlFor="course-document-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Document URL
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            id="course-document-url"
                            type="url"
                            inputMode="url"
                            aria-describedby="course-document-url-help"
                            aria-invalid={docLinkInvalid}
                            disabled={busy}
                            className={`flex-1 min-w-0 px-4 py-2 border dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:border-transparent outline-none disabled:opacity-60 ${
                                docLinkInvalid
                                    ? 'border-red-400 focus:ring-red-500 dark:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                            }`}
                            placeholder="https://docs.google.com/document/d/..."
                            value={docLink}
                            onChange={(e) => onDocLinkChange(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={handleProcess}
                            disabled={busy || !docLink.trim() || docLinkInvalid}
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : structured ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            {busy ? 'Processing…' : structured ? 'Reprocess Document' : 'Process Document'}
                        </button>
                    </div>
                    <p id="course-document-url-help" className={`mt-2 text-xs ${docLinkInvalid ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {docLinkInvalid
                            ? 'Enter a valid http(s) link, for example https://docs.google.com/document/d/…'
                            : 'Processing saves the course as a draft first. The link is also shown to students as an “Open Document” link; the document must be shared with the service account or “Anyone with the link”.'}
                    </p>

                    {state && state.status !== 'completed' && (
                        <div className="mt-5" aria-live="polite">
                            <ol className="flex flex-wrap gap-x-4 gap-y-2">
                                {STEPS.map((step, i) => {
                                    const failed = state.status === 'failed';
                                    const done = !failed && i < activeStep;
                                    const current = !failed && i === activeStep;
                                    return (
                                        <li key={step.label} className={`flex items-center gap-1.5 text-xs font-medium ${
                                            done ? 'text-green-700 dark:text-green-400'
                                                : current ? 'text-blue-700 dark:text-blue-300'
                                                    : 'text-gray-400 dark:text-gray-500'
                                        }`}>
                                            {done ? <CheckCircle2 className="w-3.5 h-3.5" />
                                                : current ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <span className="w-3.5 h-3.5 rounded-full border border-current" />}
                                            {step.label}
                                            {current && step.statuses.includes('structuring') && (state.chunks_total ?? 0) > 1 && (
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    ({state.chunks_done ?? 0}/{state.chunks_total} parts)
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                            {state.status === 'failed' && state.error && (
                                <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3.5">
                                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-red-800 dark:text-red-300">Processing failed</p>
                                        <p className="text-red-700 dark:text-red-300/90">{state.error.message}</p>
                                        {structured && (
                                            <p className="mt-1 text-red-700/80 dark:text-red-300/70">The previously processed lessons are unchanged.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {structured && (
                        <div className="mt-5 rounded-lg border border-blue-100 dark:border-blue-900 bg-white dark:bg-gray-800 p-4">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">Structured content</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                                    {structured.modules.length} module{structured.modules.length === 1 ? '' : 's'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                                    {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
                                </span>
                            </div>
                            <ol className="space-y-2 max-h-72 overflow-y-auto text-sm">
                                {structured.modules.map((m, mi) => (
                                    <li key={m.id}>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{mi + 1}. {m.title}</p>
                                        <ul className="ml-5 mt-1 space-y-0.5 text-gray-600 dark:text-gray-400">
                                            {m.lessons.map((l) => <li key={l.id}>• {l.title}</li>)}
                                        </ul>
                                    </li>
                                ))}
                            </ol>
                            {(state?.warnings.length ?? 0) > 0 && (
                                <details className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                                    <summary className="cursor-pointer font-semibold">{state!.warnings.length} warning{state!.warnings.length === 1 ? '' : 's'}</summary>
                                    <ul className="mt-1.5 list-disc list-inside space-y-0.5">
                                        {state!.warnings.slice(0, 20).map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </details>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

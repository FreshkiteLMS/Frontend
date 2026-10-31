"use client";

import { useEffect } from 'react';
import { AlertTriangle, Loader2, Mic, MicOff, Pause, Play, RotateCcw, Send, Square } from 'lucide-react';
import { formatClock } from '@/lib/speaking';
import { useAudioRecorder, type Recording } from './useAudioRecorder';
import { Waveform } from './Waveform';

interface Props {
    maxSeconds: number;
    minSeconds: number;
    /** Uploading/creating the attempt — controls are locked. */
    submitting: boolean;
    uploadProgress: number | null;
    disabled?: boolean;
    disabledReason?: string;
    onSubmit: (recording: Recording) => void;
    /** True while an unsubmitted recording (or a live one) exists. */
    onDirtyChange?: (dirty: boolean) => void;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';
const btn = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const neutral = `${btn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-gray-400`;

/**
 * Record → pause/resume → stop → listen → re-record or submit. Stopping never
 * submits; submission is a separate, explicit action.
 *
 * The card has a FIXED height split into fixed zones (status, visual, controls,
 * message), so switching between idle / recording / paused / preview, or an
 * error appearing, never moves anything below it.
 */
export function AudioRecorder({ maxSeconds, minSeconds, submitting, uploadProgress, disabled = false, disabledReason, onSubmit, onDirtyChange }: Props) {
    const rec = useAudioRecorder({ maxSeconds });
    const live = rec.state === 'recording' || rec.state === 'paused';
    const dirty = live || rec.state === 'requesting' || !!rec.recording;

    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

    const tooShort = !!rec.recording && rec.recording.durationSeconds < minSeconds;
    const remaining = maxSeconds - rec.elapsed;
    const blocked = rec.state === 'denied' || rec.state === 'unavailable' || rec.state === 'unsupported';
    const recording = rec.state === 'recording';

    const statusText = submitting
        ? uploadProgress !== null && uploadProgress < 1 ? `Uploading your answer… ${Math.round(uploadProgress * 100)}%` : 'Sending your answer for evaluation…'
        : {
            idle: 'Ready when you are',
            requesting: 'Allow the microphone to begin…',
            recording: remaining <= 30 ? `Recording — ${Math.ceil(remaining)}s left` : 'Recording',
            paused: 'Paused',
            stopped: 'Recording ready',
            denied: 'Microphone access blocked',
            unavailable: 'Microphone unavailable',
            unsupported: 'Recording not supported',
        }[rec.state];

    const pill = submitting
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200'
        : recording
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
            : rec.state === 'paused'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                : blocked
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200'
                    : rec.state === 'stopped'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

    const message = rec.error || (disabled && disabledReason) || (tooShort ? `That was under ${minSeconds} seconds. Record a complete answer to get feedback.` : null);
    const hint = rec.state === 'idle' || rec.state === 'requesting'
        ? 'Tip: start with a one-line definition, then the key points, then a quick example.'
        : recording ? 'Take your time — you can pause anytime.'
        : rec.state === 'paused' ? 'Resume when you are ready, or stop to review.'
        : rec.state === 'stopped' ? 'Listen back. Happy with it? Submit — or record again.'
        : '';

    return (
        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-500/20 bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-gray-900 p-4 sm:p-6">
            {/* Zone 1 — status + timer (fixed height) */}
            <div className="flex h-9 items-center justify-between gap-3">
                <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${pill}`} role="status" aria-live="polite">
                    {recording && !submitting && (
                        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                    )}
                    {(submitting || rec.state === 'requesting') && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {statusText}
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums text-gray-800 dark:text-gray-100" aria-label={`Recorded ${formatClock(rec.elapsed)} of ${formatClock(maxSeconds)} maximum`}>
                    {formatClock(rec.elapsed)}<span className="text-sm font-normal text-gray-400"> / {formatClock(maxSeconds)}</span>
                </p>
            </div>

            {/* Zone 2 — waveform, or the preview player once stopped (fixed height) */}
            <div className="mt-3 h-20 sm:h-24">
                {rec.state === 'stopped' && rec.recording ? (
                    <div className="flex h-full flex-col justify-center">
                        {/* Local preview only — this recording exists in your browser until you submit or discard it. */}
                        <audio controls src={rec.recording.url} className="w-full" preload="metadata">Your browser cannot play the preview.</audio>
                    </div>
                ) : (
                    <div className="h-full text-emerald-500 dark:text-emerald-400">
                        <Waveform analyserRef={rec.analyserRef} active={recording} />
                    </div>
                )}
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" aria-hidden="true">
                <div className="h-full bg-emerald-500 transition-[width] duration-200" style={{ width: `${Math.min(100, (rec.elapsed / maxSeconds) * 100)}%` }} />
            </div>

            {/* Zone 3 — controls (fixed height, content centred) */}
            <div className="mt-4 flex h-32 flex-wrap items-center justify-center gap-3">
                {(rec.state === 'idle' || blocked || rec.state === 'requesting') && (
                    <button
                        type="button"
                        onClick={() => void rec.start()}
                        disabled={disabled || submitting || rec.state === 'requesting' || rec.state === 'unsupported'}
                        className="group inline-flex flex-col items-center gap-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-emerald-300 motion-reduce:transition-none">
                            {rec.state === 'requesting' ? <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" /> : <Mic className="h-9 w-9" aria-hidden="true" />}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{blocked ? 'Try again' : 'Start recording'}</span>
                    </button>
                )}

                {live && (
                    <>
                        {recording ? (
                            <button type="button" onClick={rec.pause} className={`${btn} border border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10 focus-visible:ring-amber-400`}>
                                <Pause className="h-4 w-4" aria-hidden="true" /> Pause
                            </button>
                        ) : (
                            <button type="button" onClick={rec.resume} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500`}>
                                <Play className="h-4 w-4" aria-hidden="true" /> Resume
                            </button>
                        )}
                        <button type="button" onClick={rec.stop} className={`${btn} bg-rose-600 px-6 py-3 text-white hover:bg-rose-700 focus-visible:ring-rose-500`}>
                            <Square className="h-4 w-4 fill-current" aria-hidden="true" /> Stop
                        </button>
                    </>
                )}

                {rec.state === 'stopped' && rec.recording && (
                    <>
                        <button type="button" onClick={rec.reset} disabled={submitting} className={neutral}>
                            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Record again
                        </button>
                        <button
                            type="button"
                            onClick={() => rec.recording && onSubmit(rec.recording)}
                            disabled={submitting || tooShort || disabled}
                            className={`${btn} bg-emerald-600 px-6 py-3 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus-visible:ring-emerald-500`}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                            {submitting ? 'Submitting…' : 'Submit for AI evaluation'}
                        </button>
                    </>
                )}
            </div>

            {/* Zone 4 — message / hint (reserved height, so an error never pushes the page) */}
            <div className="mt-2 min-h-[3.25rem]">
                {message ? (
                    <div role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
                        {blocked ? <MicOff className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                        <span>{message}</span>
                    </div>
                ) : (
                    <p className="px-1 pt-2 text-center text-sm text-gray-500 dark:text-gray-400">{hint}</p>
                )}
            </div>
        </div>
    );
}

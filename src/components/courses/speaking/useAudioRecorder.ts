"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickRecordingMimeType } from '@/lib/speaking';

/**
 * Microphone recording with MediaRecorder.
 *
 * - The recording only ever lives in this tab's memory (a Blob + object URL for
 *   the preview). Nothing is persisted locally; `reset()` and unmount revoke
 *   the URL and release the microphone.
 * - The timer counts recorded time only (pauses excluded) and the recorder
 *   stops itself at `maxSeconds`.
 * - Live levels come from an AnalyserNode exposed through `analyserRef`, so the
 *   waveform can draw at frame rate without re-rendering React.
 */

export type RecorderState =
    | 'idle'
    | 'requesting'      // waiting for the permission prompt
    | 'recording'
    | 'paused'
    | 'stopped'         // a recording is ready to preview / submit
    | 'denied'          // permission refused
    | 'unavailable'     // no microphone found / in use
    | 'unsupported';    // browser can't record a format the server accepts

export interface Recording {
    blob: Blob;
    url: string;
    mimeType: string;
    durationSeconds: number;
}

interface Options {
    maxSeconds: number;
    onAutoStop?: () => void;
}

const TICK_MS = 200;

export function useAudioRecorder({ maxSeconds, onAutoStop }: Options) {
    const [state, setState] = useState<RecorderState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [recording, setRecording] = useState<Recording | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Recorded time = accumulated + (now − segmentStart) while recording.
    const accumulatedRef = useRef(0);
    const segmentStartRef = useRef<number | null>(null);
    const urlRef = useRef<string | null>(null);
    const autoStopRef = useRef(onAutoStop);
    useEffect(() => { autoStopRef.current = onAutoStop; }, [onAutoStop]);

    const currentSeconds = () =>
        accumulatedRef.current + (segmentStartRef.current !== null ? (performance.now() - segmentStartRef.current) / 1000 : 0);

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    };

    const releaseMedia = useCallback(() => {
        stopTimer();
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        analyserRef.current = null;
        const ctx = audioCtxRef.current;
        audioCtxRef.current = null;
        if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
    }, []);

    const revokeUrl = () => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
    };

    const stop = useCallback(() => {
        const rec = recorderRef.current;
        if (!rec || rec.state === 'inactive') return;
        if (segmentStartRef.current !== null) {
            accumulatedRef.current = currentSeconds();
            segmentStartRef.current = null;
        }
        stopTimer();
        rec.stop();
    }, []);

    const start = useCallback(async () => {
        setError(null);
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setState('unsupported');
            setError('This browser cannot record audio. Please use a recent version of Chrome, Edge, Firefox or Safari.');
            return;
        }
        const mimeType = pickRecordingMimeType(t => MediaRecorder.isTypeSupported(t));
        if (!mimeType) {
            setState('unsupported');
            setError('This browser cannot record in a supported audio format.');
            return;
        }

        revokeUrl();
        setRecording(null);
        setState('requesting');
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        } catch (err) {
            const name = (err as { name?: string })?.name;
            if (name === 'NotAllowedError' || name === 'SecurityError') {
                setState('denied');
                setError('Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.');
            } else {
                setState('unavailable');
                setError(name === 'NotReadableError'
                    ? 'Your microphone is being used by another app. Close it and try again.'
                    : 'No microphone was found. Connect one and try again.');
            }
            return;
        }
        streamRef.current = stream;

        try {
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (Ctx) {
                const ctx = new Ctx();
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 1024;
                ctx.createMediaStreamSource(stream).connect(analyser);
                audioCtxRef.current = ctx;
                analyserRef.current = analyser;
            }
        } catch {
            // Visualization is optional; recording still works.
        }

        chunksRef.current = [];
        const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48_000 });
        rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = () => {
            const type = (rec.mimeType || mimeType).split(';')[0];
            const blob = new Blob(chunksRef.current, { type });
            chunksRef.current = [];
            releaseMedia();
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setRecording({ blob, url, mimeType: type, durationSeconds: Math.round(accumulatedRef.current * 10) / 10 });
            setElapsed(accumulatedRef.current);
            setState('stopped');
        };
        rec.onerror = () => {
            releaseMedia();
            setState('idle');
            setError('Recording stopped unexpectedly. Please try again.');
        };
        recorderRef.current = rec;
        accumulatedRef.current = 0;
        segmentStartRef.current = performance.now();
        setElapsed(0);
        rec.start(1000);
        setState('recording');

        timerRef.current = setInterval(() => {
            const s = currentSeconds();
            setElapsed(s);
            if (s >= maxSeconds) {
                stop();
                autoStopRef.current?.();
            }
        }, TICK_MS);
    }, [maxSeconds, releaseMedia, stop]);

    const pause = useCallback(() => {
        const rec = recorderRef.current;
        if (!rec || rec.state !== 'recording') return;
        rec.pause();
        accumulatedRef.current = currentSeconds();
        segmentStartRef.current = null;
        setElapsed(accumulatedRef.current);
        setState('paused');
    }, []);

    const resume = useCallback(() => {
        const rec = recorderRef.current;
        if (!rec || rec.state !== 'paused') return;
        rec.resume();
        segmentStartRef.current = performance.now();
        setState('recording');
    }, []);

    /** Discard the current recording (re-record). */
    const reset = useCallback(() => {
        const rec = recorderRef.current;
        if (rec && rec.state !== 'inactive') {
            rec.onstop = null;
            rec.stop();
        }
        recorderRef.current = null;
        releaseMedia();
        revokeUrl();
        chunksRef.current = [];
        accumulatedRef.current = 0;
        segmentStartRef.current = null;
        setRecording(null);
        setElapsed(0);
        setError(null);
        setState('idle');
    }, [releaseMedia]);

    // Unmount: stop everything and drop the in-memory recording.
    useEffect(() => () => {
        const rec = recorderRef.current;
        if (rec && rec.state !== 'inactive') {
            rec.onstop = null;
            try { rec.stop(); } catch { /* already stopped */ }
        }
        releaseMedia();
        revokeUrl();
    }, [releaseMedia]);

    return { state, elapsed, recording, error, analyserRef, start, pause, resume, stop, reset };
}

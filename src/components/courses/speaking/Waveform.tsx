"use client";

import { useEffect, useRef, type RefObject } from 'react';

const BARS = 48;
const FRAME_MS = 1000 / 30; // 30 fps is plenty for a level meter and keeps the page smooth

/**
 * Live microphone waveform drawn on a canvas from an AnalyserNode. Shows a
 * calm idle line when there is no live input. Purely decorative: status is
 * always conveyed in text next to it. Draws with the element's CSS colour.
 *
 * Performance: the canvas is only resized when its box actually changes
 * (ResizeObserver, whole pixels), and the colour is read once, not per frame.
 */
export function Waveform({ analyserRef, active, className = '' }: { analyserRef: RefObject<AnalyserNode | null>; active: boolean; className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext?.('2d');
        if (!ctx) return;

        const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const data = new Uint8Array(2048);
        const smoothed = new Float32Array(BARS);
        let width = 0;
        let height = 0;
        let color = '#10b981';
        let frame = 0;
        let last = 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            const w = Math.max(1, Math.round(width * dpr));
            const h = Math.max(1, Math.round(height * dpr));
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            ctx.setTransform(w / Math.max(1, width), 0, 0, h / Math.max(1, height), 0, 0);
            color = getComputedStyle(canvas).color || color;
        };
        resize();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        observer?.observe(canvas);

        const draw = (t: number) => {
            frame = requestAnimationFrame(draw);
            if (t - last < (reduceMotion ? 250 : FRAME_MS)) return;
            last = t;
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = color;

            const analyser = analyserRef.current;
            if (active && analyser) {
                const buf = data.subarray(0, analyser.fftSize);
                analyser.getByteTimeDomainData(buf);
                const per = Math.max(1, Math.floor(buf.length / BARS));
                for (let i = 0; i < BARS; i++) {
                    let peak = 0;
                    for (let j = i * per; j < (i + 1) * per && j < buf.length; j++) peak = Math.max(peak, Math.abs(buf[j] - 128));
                    const target = Math.min(1, (peak / 128) * 2.4);
                    // Rise fast, fall slowly: reads as a smooth meter instead of flicker.
                    smoothed[i] += (target - smoothed[i]) * (target > smoothed[i] ? 0.6 : 0.2);
                }
            } else {
                for (let i = 0; i < BARS; i++) smoothed[i] *= 0.8;
            }

            const gap = 3;
            const barW = Math.max(2, (width - gap * (BARS - 1)) / BARS);
            for (let i = 0; i < BARS; i++) {
                const lv = smoothed[i];
                const barH = Math.max(4, lv * (height - 4));
                const x = i * (barW + gap);
                const y = (height - barH) / 2;
                ctx.globalAlpha = active ? 0.5 + lv * 0.5 : 0.3;
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, barW, barH, barW / 2);
                else ctx.rect(x, y, barW, barH);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        };
        frame = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(frame);
            observer?.disconnect();
        };
    }, [analyserRef, active]);

    return <canvas ref={canvasRef} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}

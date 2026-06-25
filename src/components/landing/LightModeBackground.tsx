"use client";

import { useEffect, useRef } from 'react';

/**
 * LightModeBackground — Premium aurora canvas animation.
 * Renders flowing, soft color waves that morph and breathe.
 * Uses requestAnimationFrame for buttery-smooth 60fps performance.
 */
export function LightModeBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let t = 0;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // ---- Blob definitions ----
        // Each blob is a breathing radial gradient orbiting around a center
        interface Blob {
            cx: number; cy: number;       // center orbit position (0-1 normalized)
            r: number;                    // base radius (px)
            color1: string; color2: string;
            orbitRadius: number;          // how far it wanders
            speed: number;                // orbit speed multiplier
            phase: number;                // starting phase
        }

        const blobs: Blob[] = [
            { cx: 0.15, cy: 0.15, r: 420, color1: 'rgba(99,102,241,0.22)', color2: 'transparent', orbitRadius: 80, speed: 0.4, phase: 0 },
            { cx: 0.82, cy: 0.08, r: 380, color1: 'rgba(59,130,246,0.18)', color2: 'transparent', orbitRadius: 60, speed: 0.3, phase: 1.2 },
            { cx: 0.55, cy: 0.55, r: 500, color1: 'rgba(168,85,247,0.12)', color2: 'transparent', orbitRadius: 100, speed: 0.25, phase: 2.5 },
            { cx: 0.85, cy: 0.80, r: 350, color1: 'rgba(236,72,153,0.12)', color2: 'transparent', orbitRadius: 70, speed: 0.35, phase: 3.8 },
            { cx: 0.08, cy: 0.75, r: 320, color1: 'rgba(34,211,238,0.13)', color2: 'transparent', orbitRadius: 55, speed: 0.45, phase: 5.0 },
            { cx: 0.45, cy: 0.20, r: 260, color1: 'rgba(251,191,36,0.08)', color2: 'transparent', orbitRadius: 45, speed: 0.5, phase: 0.7 },
        ];

        // ---- Wave path helper ----
        const wave = (
            ctx: CanvasRenderingContext2D,
            w: number, h: number,
            amp: number, freq: number, phase: number,
            yBase: number, color: string
        ) => {
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 4) {
                const y = yBase + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp
                    + Math.sin((x / w) * Math.PI * 3 + phase * 0.7) * (amp * 0.4);
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        };

        const draw = () => {
            const w = canvas.width;
            const h = canvas.height;
            t += 0.006;

            ctx.clearRect(0, 0, w, h);

            // ---- 1. Breathing gradient orbs ----
            for (const blob of blobs) {
                const pulse = 1 + Math.sin(t * blob.speed * 2 + blob.phase) * 0.12;
                const ox = Math.cos(t * blob.speed + blob.phase) * blob.orbitRadius;
                const oy = Math.sin(t * blob.speed * 0.7 + blob.phase) * blob.orbitRadius;
                const cx = blob.cx * w + ox;
                const cy = blob.cy * h + oy;
                const r = blob.r * pulse;

                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, blob.color1);
                grad.addColorStop(1, blob.color2);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- 2. Layered flowing waves at the bottom ----
            wave(ctx, w, h, 55, 1.2, t * 0.9, h * 0.72, 'rgba(99,102,241,0.07)');
            wave(ctx, w, h, 45, 1.5, t * 1.1 + 1, h * 0.78, 'rgba(59,130,246,0.06)');
            wave(ctx, w, h, 35, 1.8, t * 0.7 + 2, h * 0.83, 'rgba(168,85,247,0.05)');

            // ---- 3. Subtle diagonal shimmer ----
            const shX = Math.sin(t * 0.4) * w * 0.1;
            const shimmer = ctx.createLinearGradient(shX, 0, w + shX, h);
            shimmer.addColorStop(0, 'transparent');
            shimmer.addColorStop(0.4, 'rgba(99,102,241,0.03)');
            shimmer.addColorStop(0.6, 'rgba(59,130,246,0.04)');
            shimmer.addColorStop(1, 'transparent');
            ctx.fillStyle = shimmer;
            ctx.fillRect(0, 0, w, h);

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ display: 'block' }}
        />
    );
}

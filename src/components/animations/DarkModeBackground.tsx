"use client";

import { useEffect, useRef } from 'react';

/**
 * DarkModeBackground — Premium animated dark mode background.
 * Layers: glowing nebula orbs + star field + flowing aurora bands.
 * Pure canvas + requestAnimationFrame — 60fps, no dependencies.
 */
export function DarkModeBackground() {
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
            initStars();
        };

        // --- Star field ---
        interface Star {
            x: number; y: number;
            r: number; opacity: number;
            speed: number; phase: number;
        }
        let stars: Star[] = [];
        const initStars = () => {
            const count = Math.floor((canvas.width * canvas.height) / 5000);
            stars = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: 0.4 + Math.random() * 1.2,
                opacity: 0.2 + Math.random() * 0.6,
                speed: 0.5 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2,
            }));
        };

        // --- Nebula blobs ---
        const blobs = [
            // Top coverage — eliminates dark strip below navbar
            { cx: 0.50, cy: 0.00, r: 700, color: 'rgba(99,102,241,', orbit: 30, speed: 0.2, phase: 0 },
            { cx: 0.15, cy: 0.10, r: 550, color: 'rgba(99,102,241,', orbit: 70, speed: 0.3, phase: 0 },
            { cx: 0.80, cy: 0.12, r: 500, color: 'rgba(139,92,246,', orbit: 60, speed: 0.25, phase: 1.5 },
            { cx: 0.50, cy: 0.50, r: 650, color: 'rgba(59,130,246,', orbit: 90, speed: 0.2, phase: 3.0 },
            { cx: 0.85, cy: 0.78, r: 420, color: 'rgba(236,72,153,', orbit: 55, speed: 0.35, phase: 4.5 },
            { cx: 0.10, cy: 0.75, r: 380, color: 'rgba(6,182,212,', orbit: 50, speed: 0.4, phase: 2.0 },
            { cx: 0.55, cy: 0.20, r: 420, color: 'rgba(168,85,247,', orbit: 40, speed: 0.45, phase: 5.2 },
            { cx: 0.28, cy: 0.33, r: 400, color: 'rgba(99,102,241,', orbit: 50, speed: 0.28, phase: 0.8 },
            { cx: 0.72, cy: 0.36, r: 360, color: 'rgba(139,92,246,', orbit: 45, speed: 0.32, phase: 2.3 },
        ];

        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const w = canvas.width;
            const h = canvas.height;
            t += 0.007;

            // Clear with full dark background
            // Clear with a unified dark base — prevents body background bleed-through
            ctx.fillStyle = '#08090f';
            ctx.fillRect(0, 0, w, h);

            // ── 1. Nebula orbs ──
            for (const b of blobs) {
                const pulse = 1 + Math.sin(t * b.speed * 1.8 + b.phase) * 0.10;
                const ox = Math.cos(t * b.speed + b.phase) * b.orbit;
                const oy = Math.sin(t * b.speed * 0.65 + b.phase) * b.orbit;
                const cx = b.cx * w + ox;
                const cy = b.cy * h + oy;
                const r = b.r * pulse;

                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                g.addColorStop(0, b.color + '0.25)');
                g.addColorStop(0.4, b.color + '0.12)');
                g.addColorStop(1, b.color + '0.00)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── 2. Twinkling star field ──
            for (const s of stars) {
                const tw = s.opacity * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${tw})`;
                ctx.fill();
            }

            // ── 3. Aurora bands ──
            const auroraWave = (
                yBase: number, amp: number, freq: number,
                phase: number, col1: string, col2: string, thickness: number
            ) => {
                const grad = ctx.createLinearGradient(0, yBase - thickness, 0, yBase + thickness);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, col1);
                grad.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.moveTo(0, h);
                for (let x = 0; x <= w; x += 5) {
                    const y = yBase
                        + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp
                        + Math.sin((x / w) * Math.PI * 3.5 + phase * 0.6) * (amp * 0.35);
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(w, h);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();
            };

            auroraWave(h * 0.68, 50, 1.1, t * 0.7, 'rgba(99,102,241,0.08)', 'rgba(139,92,246,0.06)', 120);
            auroraWave(h * 0.75, 40, 1.4, t * 0.9 + 1, 'rgba(59,130,246,0.07)', 'rgba(6,182,212,0.05)', 100);
            auroraWave(h * 0.82, 30, 1.8, t * 0.6 + 2.5, 'rgba(168,85,247,0.06)', 'rgba(236,72,153,0.04)', 80);

            // ── 4. Subtle horizontal scanline shimmer ──
            const shimY = ((t * 0.08) % 1) * h;
            const shimGrad = ctx.createLinearGradient(0, shimY - 80, 0, shimY + 80);
            shimGrad.addColorStop(0, 'transparent');
            shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.012)');
            shimGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = shimGrad;
            ctx.fillRect(0, shimY - 80, w, 160);

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
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ display: 'block', zIndex: 0 }}
        />
    );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { AlertTriangle, BookOpen, Brain, Calculator, Code2, RefreshCw, SearchX } from 'lucide-react';
import type { CatalogKind } from '@/types/catalog';

/** True after the first client render — gate anything that depends on the signed-in user. */
export function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}

/** Fade-and-rise when scrolled into view. Motion is skipped for reduced-motion users. */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
    const reduce = useReducedMotion();
    const Comp = motion[as];
    return (
        <Comp
            className={className}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
            transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </Comp>
    );
}

export function SectionHeading({ eyebrow, title, description, align = 'left', action, id }: {
    eyebrow?: string; title: ReactNode; description?: ReactNode; align?: 'left' | 'center'; action?: ReactNode; id?: string;
}) {
    const center = align === 'center';
    return (
        <div className={`mb-10 sm:mb-12 flex flex-col gap-5 ${center ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
            <div className={center ? 'max-w-2xl' : 'max-w-2xl'}>
                {eyebrow && (
                    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400 mb-3">
                        <span className="h-px w-6 bg-current opacity-60" aria-hidden="true" />
                        {eyebrow}
                    </p>
                )}
                <h2 id={id} className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-gray-900 dark:text-white leading-[1.08]">
                    {title}
                </h2>
                {description && <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

/** Counts up from 0 the first time it scrolls into view. Renders the final value for SSR/no-JS. */
export function AnimatedCounter({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
    const reduce = useReducedMotion();
    const [shown, setShown] = useState<number | null>(null);

    useEffect(() => {
        if (!inView || reduce) return;
        const controls = animate(0, value, {
            duration: Math.min(1.8, 0.6 + value / 2000),
            ease: [0.16, 1, 0.3, 1],
            onUpdate: v => setShown(Math.round(v)),
        });
        return () => controls.stop();
    }, [inView, reduce, value]);

    return (
        <span ref={ref} className={className} aria-label={`${value.toLocaleString('en-IN')}${suffix}`}>
            <span aria-hidden="true">{(shown ?? value).toLocaleString('en-IN')}{suffix}</span>
        </span>
    );
}

const KIND_STYLE: Record<CatalogKind, { icon: typeof Code2; from: string; to: string; label: string }> = {
    structured: { icon: Code2, from: 'from-blue-600', to: 'to-indigo-700', label: 'Course' },
    legacy: { icon: BookOpen, from: 'from-sky-600', to: 'to-blue-700', label: 'Course' },
    problems: { icon: Brain, from: 'from-violet-600', to: 'to-fuchsia-700', label: 'Problem solving' },
    aptitude: { icon: Calculator, from: 'from-emerald-600', to: 'to-teal-700', label: 'Aptitude' },
};
export const kindLabel = (k: CatalogKind) => KIND_STYLE[k].label;

/** Course cover: the admin's thumbnail, or a generated cover (never a broken image). */
export function CourseCover({ src, kind, className = '', sizes = 'h-full' }: { src: string | null; title?: string; kind: CatalogKind; className?: string; sizes?: string }) {
    const [failed, setFailed] = useState(false);
    const style = KIND_STYLE[kind] || KIND_STYLE.structured;
    const Icon = style.icon;
    if (src && !failed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs on arbitrary hosts
            <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
                className={`w-full ${sizes} object-cover ${className}`}
            />
        );
    }
    return (
        <div className={`relative w-full ${sizes} bg-gradient-to-br ${style.from} ${style.to} overflow-hidden ${className}`} aria-hidden="true">
            <div
                className="absolute inset-0 opacity-[0.14]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            />
            <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            {/* Large faint glyph as the "art"; the title is printed by the card itself, never twice. */}
            <Icon className="absolute -right-[4%] -bottom-[8%] w-[42%] h-auto aspect-square max-w-28 text-white/15" strokeWidth={1.25} />
            <span className="absolute left-[6%] bottom-[9%] w-[min(2.5rem,28%)] aspect-square rounded-[28%] bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <Icon className="w-1/2 h-1/2 text-white" />
            </span>
        </div>
    );
}

export function CourseCardSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden" aria-hidden="true">
            <div className="aspect-[16/9] bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="p-5 space-y-3">
                <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-9 w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse mt-5" />
            </div>
        </div>
    );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-6 py-14 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                {icon ?? <SearchX className="w-6 h-6" />}
            </div>
            <p className="font-bold text-gray-900 dark:text-white">{title}</p>
            {description && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function ErrorState({ message = 'We couldn’t load the courses right now.', onRetry }: { message?: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/20 px-6 py-10 text-center">
            <AlertTriangle className="w-7 h-7 text-red-500 mx-auto mb-3" />
            <p className="font-semibold text-red-700 dark:text-red-300">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Try again
                </button>
            )}
        </div>
    );
}

/** Small pill used for meta (difficulty, counts…). */
export function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'violet' }) {
    const tones = {
        gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    };
    return <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${tones[tone]}`}>{children}</span>;
}

export const difficultyTone = (d: string | null | undefined) =>
    d === 'beginner' ? 'green' : d === 'intermediate' ? 'amber' : d === 'advanced' ? 'red' : 'gray';

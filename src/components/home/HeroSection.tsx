"use client";

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Layers, ListChecks, Sparkles } from 'lucide-react';
import type { Catalog, CatalogCourse } from '@/types/catalog';
import { useAuth } from '@/hooks/use-auth';
import { categoryLabel, formatINR, moduleWord, unitLabel } from '@/lib/catalog';
import { CourseCover, useMounted } from '@/components/catalog/ui';
import { courseDetailsHref } from '@/components/catalog/course-card';

const ease = [0.22, 1, 0.36, 1] as const;

/** Three published courses with the richest curriculum — real data, never mock-ups. */
function heroCourses(catalog: Catalog | null): CatalogCourse[] {
    if (!catalog) return [];
    return [...catalog.courses].sort((a, b) => b.counts.lessons - a.counts.lessons || b.counts.modules - a.counts.modules).slice(0, 3);
}

function FloatingCourse({ course, index }: { course: CatalogCourse; index: number }) {
    const reduce = useReducedMotion();
    const positions = [
        'left-0 top-6 w-[270px] rotate-[-4deg]',
        'right-0 top-28 w-[280px] rotate-[3deg]',
        'left-10 bottom-0 w-[260px] rotate-[1.5deg]',
    ];
    return (
        <motion.div
            className={`absolute ${positions[index]}`}
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.35 + index * 0.15, ease }}
            style={{ zIndex: 3 - index }}
        >
            <motion.div
                animate={reduce ? undefined : { y: [0, index % 2 ? 10 : -10, 0] }}
                transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Link
                    href={courseDetailsHref(course)}
                    className="block rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur border border-gray-200/80 dark:border-gray-700/70 shadow-2xl shadow-indigo-950/20 overflow-hidden hover:-translate-y-1 hover:shadow-indigo-600/25 transition-all duration-300"
                >
                    <div className="h-24 overflow-hidden"><CourseCover src={course.thumbnailUrl} title={course.title} kind={course.kind} /></div>
                    <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{categoryLabel(course.category)}</p>
                        <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">{course.title}</p>
                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1">
                                <Layers className="w-3 h-3" aria-hidden="true" />{course.counts.modules} {moduleWord(course.kind, course.counts.modules)}{course.counts.lessons > 0 ? ` · ${unitLabel(course.counts.unit, course.counts.lessons)}` : ''}
                            </span>
                            {course.price > 0 && <span className="text-gray-900 dark:text-white font-black">{formatINR(course.price)}</span>}
                        </div>
                    </div>
                </Link>
            </motion.div>
        </motion.div>
    );
}

export function HeroSection({ catalog, loading }: { catalog: Catalog | null; loading: boolean }) {
    const reduce = useReducedMotion();
    const mounted = useMounted();
    const { user } = useAuth();
    const signedIn = mounted && !!user;
    const dashboardHref = user?.role === 'admin' ? '/admin' : '/student';
    const courses = heroCourses(catalog);
    const stats = catalog?.stats;

    const fade = (delay: number) => ({
        initial: reduce ? false : { opacity: 0, y: 22 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay, ease },
    });

    return (
        <section aria-labelledby="hero-title" className="relative overflow-hidden bg-white dark:bg-gray-950 pt-28 sm:pt-32 pb-20 lg:pb-28">
            {/* Animated ambient background */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="hero-blob absolute -top-40 -right-32 w-[620px] h-[620px] rounded-full bg-blue-400/25 dark:bg-blue-600/20 blur-3xl" />
                <div className="hero-blob hero-blob--slow absolute top-1/3 -left-40 w-[520px] h-[520px] rounded-full bg-indigo-400/20 dark:bg-indigo-600/15 blur-3xl" />
                <div className="hero-blob hero-blob--alt absolute -bottom-40 right-1/4 w-[460px] h-[460px] rounded-full bg-fuchsia-300/20 dark:bg-fuchsia-700/10 blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
                    style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.18) 1px, transparent 1px)', backgroundSize: '44px 44px' }}
                />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_540px] gap-14 xl:gap-20 items-center">
                    <div>
                        <motion.p {...fade(0)} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-xs font-bold text-blue-700 dark:text-blue-300 tracking-wide">
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Expert-led courses · Hands-on practice
                        </motion.p>

                        <motion.h1 {...fade(0.08)} id="hero-title" className="mt-7 text-[42px] leading-[1.02] sm:text-6xl lg:text-[68px] font-black tracking-tight text-gray-900 dark:text-white">
                            Build real skills.
                            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 dark:from-blue-400 dark:via-indigo-400 dark:to-fuchsia-400 bg-clip-text text-transparent pb-1">
                                Grow your tech career.
                            </span>
                        </motion.h1>

                        <motion.p {...fade(0.16)} className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-xl">
                            Structured courses, guided problem solving and practice assessments — designed by engineers with decades of industry experience. See every module before you enroll, then learn at your own pace.
                        </motion.p>

                        <motion.div {...fade(0.24)} className="mt-9 flex flex-col sm:flex-row gap-3">
                            <a
                                href="#courses"
                                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold shadow-xl shadow-gray-900/15 hover:-translate-y-0.5 transition-all duration-200"
                            >
                                Explore courses
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </a>
                            {signedIn ? (
                                <Link href={dashboardHref} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/25 hover:-translate-y-0.5 transition-all duration-200">
                                    Go to your dashboard
                                </Link>
                            ) : (
                                <Link href="/signup" className="cta-shine relative overflow-hidden inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/30 hover:shadow-blue-600/45 hover:-translate-y-0.5 transition-all duration-200">
                                    Create free account
                                </Link>
                            )}
                        </motion.div>
                        {!signedIn && (
                            <motion.p {...fade(0.3)} className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                Already learning with us?{' '}
                                <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">Log in</Link>
                            </motion.p>
                        )}

                        {stats && stats.courses > 0 && (
                            <motion.dl {...fade(0.36)} className="mt-10 pt-8 border-t border-gray-200/80 dark:border-gray-800 grid grid-cols-3 gap-4 max-w-lg">
                                {[
                                    { label: stats.courses === 1 ? 'Course' : 'Courses', value: stats.courses },
                                    { label: 'Modules', value: stats.modules },
                                    stats.problems > 0
                                        ? { label: 'Practice problems', value: stats.problems }
                                        : { label: 'Lessons', value: stats.lessons },
                                ].filter(s => s.value > 0).map(s => (
                                    <div key={s.label}>
                                        <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">{s.label}</dt>
                                        <dd className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tabular-nums">{s.value.toLocaleString('en-IN')}</dd>
                                    </div>
                                ))}
                            </motion.dl>
                        )}
                    </div>

                    {/* Real courses, floating */}
                    <div className="relative hidden lg:block h-[480px]" aria-label="Featured courses">
                        {loading && !courses.length ? (
                            <div className="absolute inset-8 rounded-3xl bg-gray-100/80 dark:bg-gray-900/60 animate-pulse" />
                        ) : courses.length ? (
                            courses.map((c, i) => <FloatingCourse key={c.id} course={c} index={i} />)
                        ) : (
                            <div className="absolute inset-10 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-center p-10">
                                <div>
                                    <ListChecks className="w-8 h-8 text-blue-500 mx-auto mb-3" aria-hidden="true" />
                                    <p className="font-bold text-gray-900 dark:text-white">Courses launching soon</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

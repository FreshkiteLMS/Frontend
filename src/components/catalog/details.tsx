"use client";

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { BadgePercent, BookOpenCheck, CheckCircle2, ChevronDown, Clock, Layers, ListChecks, Mic, Package, Sparkles, Tag, Target, TicketPercent } from 'lucide-react';
import type { CatalogBundleDetail, CatalogCourseDetail } from '@/types/catalog';
import { catalogService } from '@/services/api/catalog.api';
import { categoryLabel, difficultyLabel, formatINR, moduleWord, unitLabel } from '@/lib/catalog';
import { CurriculumAccordion } from './curriculum-accordion';
import { PurchaseAction } from './purchase-action';
import { BundlePrice, bundleDetailsHref } from './bundle-card';
import { courseDetailsHref } from './course-card';
import { CourseCover, ErrorState, Pill, difficultyTone, kindLabel } from './ui';

// ─── Data ───────────────────────────────────────────────────────────────────

const detailCache = new Map<string, Promise<unknown>>();

/** Fetch a course/bundle detail once per page session (shared by every caller). */
function useDetail<T>(key: string | null, load: () => Promise<T>, initial?: T | null) {
    const [state, setState] = useState<{ key: string | null; data: T | null; error: boolean }>({ key, data: initial ?? null, error: false });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!key || (initial && state.key === key && attempt === 0)) return;
        let alive = true;
        if (!detailCache.has(key) || attempt > 0) {
            const p = load();
            detailCache.set(key, p);
            p.catch(() => detailCache.delete(key));
        }
        (detailCache.get(key) as Promise<T>)
            .then(data => alive && setState({ key, data, error: false }))
            .catch(() => alive && setState({ key, data: null, error: true }));
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is keyed by `key`
    }, [key, attempt]);
    const fresh = state.key === key;
    return { data: fresh ? state.data : null, error: fresh && state.error, retry: () => setAttempt(a => a + 1) };
}

export const useCourseDetail = (id: string | null, initial?: CatalogCourseDetail | null) =>
    useDetail(id ? `course:${id}` : null, () => catalogService.getCourse(id!), initial);
export const useBundleDetail = (id: string | null, initial?: CatalogBundleDetail | null) =>
    useDetail(id ? `bundle:${id}` : null, () => catalogService.getBundle(id!), initial);

// ─── Shared bits ────────────────────────────────────────────────────────────

function DetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <section className="py-7 border-t border-gray-200/70 dark:border-gray-800 first:border-t-0 first:pt-0">
            <h3 className="flex items-center gap-2.5 text-lg font-black tracking-tight text-gray-900 dark:text-white mb-4">
                <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">{icon}</span>
                {title}
            </h3>
            {children}
        </section>
    );
}

export function DetailsSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-label="Loading details">
            <div className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-6 w-2/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
    );
}

function CourseFacts({ course }: { course: CatalogCourseDetail }) {
    const c = course.counts;
    const facts = [
        c.modules > 0 && { icon: Layers, text: `${c.modules} ${moduleWord(course.kind, c.modules)}` },
        c.lessons > 0 && { icon: ListChecks, text: unitLabel(c.unit, c.lessons) },
        course.estimatedHours && { icon: Clock, text: `${course.estimatedHours} hours of learning` },
        c.audioQuestions > 0 && { icon: Mic, text: `${c.audioQuestions} speaking practice question${c.audioQuestions === 1 ? '' : 's'}` },
        c.assignments > 0 && { icon: BookOpenCheck, text: `${c.assignments} assignment${c.assignments === 1 ? '' : 's'}` },
    ].filter(Boolean) as { icon: typeof Layers; text: string }[];
    if (!facts.length) return null;
    return (
        <ul className="space-y-2.5">
            {facts.map(f => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <f.icon className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" /> {f.text}
                </li>
            ))}
        </ul>
    );
}

function PricingPanel({ course, secondary }: { course: CatalogCourseDetail; secondary?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Course price</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-gray-900 dark:text-white">{course.price > 0 ? formatINR(course.price) : 'Not on sale yet'}</p>
            {course.price > 0 && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <TicketPercent className="w-3.5 h-3.5" aria-hidden="true" /> Have a coupon? Apply it at checkout.
                </p>
            )}
            <div className="mt-5">
                <PurchaseAction size="lg" product={{ type: 'course', id: course.id, mongoId: course._id, name: course.title, price: course.price }} secondary={secondary} />
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">This course includes</p>
                <CourseFacts course={course} />
            </div>
        </div>
    );
}

// ─── Course details ─────────────────────────────────────────────────────────

export function CourseDetails({ course, variant = 'page', onOpenBundle, secondary }: {
    course: CatalogCourseDetail;
    variant?: 'page' | 'modal';
    /** In the student store, bundles open in place; otherwise they link to the public page. */
    onOpenBundle?: (bundleId: string) => void;
    secondary?: ReactNode;
}) {
    const isPage = variant === 'page';
    const header = (
        <header className={isPage ? '' : 'mb-6'}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <Pill tone="blue">{categoryLabel(course.category)}</Pill>
                {course.kind !== 'structured' && course.kind !== 'legacy' && <Pill tone="violet">{kindLabel(course.kind)}</Pill>}
                {course.difficulty && <Pill tone={difficultyTone(course.difficulty)}>{difficultyLabel(course.difficulty)}</Pill>}
            </div>
            {isPage ? (
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-[1.08]">{course.title}</h1>
            ) : (
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">{course.title}</h2>
            )}
            {course.description && <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{course.description}</p>}
        </header>
    );

    const body = (
        <div>
            {course.overview && course.overview !== course.description && (
                <DetailSection icon={<Sparkles className="w-4 h-4" />} title="Course overview">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{course.overview}</p>
                </DetailSection>
            )}
            {course.learningObjectives.length > 0 && (
                <DetailSection icon={<Target className="w-4 h-4" />} title="What you’ll learn">
                    <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                        {course.learningObjectives.map((o, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" /> {o}
                            </li>
                        ))}
                    </ul>
                </DetailSection>
            )}
            {course.tags.length > 0 && (
                <DetailSection icon={<Tag className="w-4 h-4" />} title="Skills covered">
                    <ul className="flex flex-wrap gap-2">
                        {course.tags.map(t => (
                            <li key={t} className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</li>
                        ))}
                    </ul>
                </DetailSection>
            )}
            <DetailSection icon={<Layers className="w-4 h-4" />} title="Curriculum">
                <CurriculumAccordion modules={course.curriculum.modules} unit={course.curriculum.unit} kind={course.kind} />
            </DetailSection>
            {course.bundles.length > 0 && (
                <DetailSection icon={<Package className="w-4 h-4" />} title="Also available in">
                    <ul className="grid sm:grid-cols-2 gap-3">
                        {course.bundles.map(b => {
                            const content = (
                                <>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500">Bundle · {b.courseCount} courses</span>
                                    <span className="block font-bold text-gray-900 dark:text-white mt-0.5">{b.name}</span>
                                    <span className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mt-1">{formatINR(b.price)}</span>
                                </>
                            );
                            const cls = 'block w-full text-left rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors';
                            return (
                                <li key={b.id}>
                                    {onOpenBundle
                                        ? <button type="button" className={cls} onClick={() => onOpenBundle(b.id)}>{content}</button>
                                        : <Link className={cls} href={bundleDetailsHref(b)}>{content}</Link>}
                                </li>
                            );
                        })}
                    </ul>
                </DetailSection>
            )}
        </div>
    );

    if (!isPage) {
        return (
            <div>
                {course.thumbnailUrl && (
                    <div className="rounded-2xl overflow-hidden aspect-[21/9] mb-6 bg-gray-100 dark:bg-gray-800">
                        <CourseCover src={course.thumbnailUrl} title={course.title} kind={course.kind} />
                    </div>
                )}
                {header}
                <div className="mb-8"><PricingPanel course={course} secondary={secondary} /></div>
                {body}
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-10 lg:gap-14 items-start">
            <div className="min-w-0">
                {header}
                <div className="mt-8 lg:hidden"><PricingPanel course={course} secondary={secondary} /></div>
                <div className="mt-10">{body}</div>
            </div>
            <aside className="hidden lg:block sticky top-24">
                <div className="rounded-2xl overflow-hidden aspect-[16/9] mb-4 bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-800">
                    <CourseCover src={course.thumbnailUrl} title={course.title} kind={course.kind} />
                </div>
                <PricingPanel course={course} secondary={secondary} />
            </aside>
        </div>
    );
}

/** Loads then renders course details; for modals and client-only pages. */
export function CourseDetailsLoader({ id, initial, ...rest }: { id: string; initial?: CatalogCourseDetail | null } & Omit<Parameters<typeof CourseDetails>[0], 'course'>) {
    const { data, error, retry } = useCourseDetail(id, initial);
    if (error) return <ErrorState message="This course isn’t available right now." onRetry={retry} />;
    if (!data) return <DetailsSkeleton />;
    return <CourseDetails course={data} {...rest} />;
}

// ─── Bundle details ─────────────────────────────────────────────────────────

function BundleCourseItem({ course, index, onOpenCourse }: { course: CatalogCourseDetail; index: number; onOpenCourse?: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const panelId = `bundle-course-${course.id}`;
    const c = course.counts;
    return (
        <li className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId} className="w-full flex items-center gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
                <span className="text-xs font-black text-gray-400 w-6 text-right shrink-0">{index + 1}</span>
                <span className="hidden sm:block w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                    <CourseCover src={course.thumbnailUrl} title="" kind={course.kind} />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block font-bold text-gray-900 dark:text-white leading-snug">{course.title}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {[c.modules > 0 && `${c.modules} ${moduleWord(course.kind, c.modules)}`, c.lessons > 0 && unitLabel(c.unit, c.lessons), course.price > 0 && `${formatINR(course.price)} on its own`].filter(Boolean).join(' · ')}
                    </span>
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && (
                <div id={panelId} className="px-4 pb-5 sm:pl-14">
                    {course.description && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-4">{course.description}</p>}
                    <CurriculumAccordion modules={course.curriculum.modules} unit={course.curriculum.unit} kind={course.kind} previewModules={4} openFirst={false} />
                    <div className="mt-4">
                        {onOpenCourse ? (
                            <button type="button" onClick={() => onOpenCourse(course.id)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Full course details →</button>
                        ) : (
                            <Link href={courseDetailsHref(course)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Full course details →</Link>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

function BundlePricingPanel({ bundle, secondary }: { bundle: CatalogBundleDetail; secondary?: ReactNode }) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-5 sm:p-6 ring-1 ring-white/10">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden="true" />
            <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200/80">Bundle price</p>
                <div className="mt-1"><BundlePrice bundle={bundle} /></div>
                {bundle.savings > 0 && (
                    <dl className="mt-5 space-y-1.5 text-sm">
                        {bundle.courses.map(c => (
                            <div key={c.id} className="flex justify-between gap-3 text-indigo-100/75">
                                <dt className="truncate">{c.title}</dt><dd className="shrink-0 tabular-nums">{formatINR(c.price)}</dd>
                            </div>
                        ))}
                        <div className="flex justify-between gap-3 pt-2 mt-2 border-t border-white/10 font-semibold text-indigo-50">
                            <dt>Bought separately</dt><dd className="tabular-nums">{formatINR(bundle.combinedPrice)}</dd>
                        </div>
                        <div className="flex justify-between gap-3 font-bold text-emerald-300">
                            <dt className="flex items-center gap-1.5"><BadgePercent className="w-4 h-4" aria-hidden="true" />You save</dt>
                            <dd className="tabular-nums">{formatINR(bundle.savings)}</dd>
                        </div>
                    </dl>
                )}
                <p className="mt-4 flex items-center gap-1.5 text-xs text-indigo-200/70">
                    <TicketPercent className="w-3.5 h-3.5" aria-hidden="true" /> Have a coupon? Apply it at checkout.
                </p>
                <div className="mt-5">
                    <PurchaseAction size="lg" product={{ type: 'bundle', id: bundle.id, name: bundle.name, price: bundle.price, courseIds: bundle.courseIds }} secondary={secondary} />
                </div>
            </div>
        </div>
    );
}

export function BundleDetails({ bundle, variant = 'page', onOpenCourse, secondary }: {
    bundle: CatalogBundleDetail;
    variant?: 'page' | 'modal';
    onOpenCourse?: (courseId: string) => void;
    secondary?: ReactNode;
}) {
    const isPage = variant === 'page';
    const Title = isPage ? 'h1' : 'h2';
    const benefits = [
        `Access to all ${bundle.courseCount} course${bundle.courseCount === 1 ? '' : 's'} as soon as your payment is confirmed`,
        'Courses laid out as a learning path in a recommended order',
        'Progress tracked for the bundle and for every course in it',
        bundle.totals.modules > 0 ? `${bundle.totals.modules} modules of structured content across the bundle` : null,
    ].filter(Boolean) as string[];

    const main = (
        <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
                <Package className="w-3 h-3" aria-hidden="true" /> Bundle · {bundle.courseCount} courses
            </span>
            <Title className={`mt-3 font-black tracking-tight text-gray-900 dark:text-white leading-[1.08] ${isPage ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl'}`}>{bundle.name}</Title>
            {bundle.description && <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{bundle.description}</p>}

            <div className={`mt-8 ${isPage ? 'lg:hidden' : ''}`}><BundlePricingPanel bundle={bundle} secondary={secondary} /></div>

            <section className="mt-10">
                <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white mb-4">What’s included</h3>
                <ol className="space-y-3">
                    {bundle.courses.map((c, i) => <BundleCourseItem key={c.id} course={c} index={i} onOpenCourse={onOpenCourse} />)}
                </ol>
            </section>

            <section className="mt-10">
                <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white mb-4">Enrollment benefits</h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                    {benefits.map(b => (
                        <li key={b} className="flex gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-sm text-gray-700 dark:text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" /> {b}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );

    if (!isPage) return main;
    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 items-start">
            {main}
            <aside className="hidden lg:block sticky top-24"><BundlePricingPanel bundle={bundle} secondary={secondary} /></aside>
        </div>
    );
}

export function BundleDetailsLoader({ id, initial, ...rest }: { id: string; initial?: CatalogBundleDetail | null } & Omit<Parameters<typeof BundleDetails>[0], 'bundle'>) {
    const { data, error, retry } = useBundleDetail(id, initial);
    if (error) return <ErrorState message="This bundle isn’t available right now." onRetry={retry} />;
    if (!data) return <DetailsSkeleton />;
    return <BundleDetails bundle={data} {...rest} />;
}

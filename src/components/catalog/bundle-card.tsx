"use client";

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BadgePercent, Check, Infinity as InfinityIcon, Layers, Package } from 'lucide-react';
import type { CatalogBundle, CatalogCourse } from '@/types/catalog';
import { formatINR } from '@/lib/catalog';
import { CourseCover } from './ui';
import { DetailsArrow, PurchaseAction } from './purchase-action';

export const bundleDetailsHref = (b: Pick<CatalogBundle, 'id'>) => `/catalog/bundles/${encodeURIComponent(b.id)}`;

/** Savings line, shown only when the bundle is genuinely cheaper than its courses bought one by one. */
export function BundlePrice({ bundle, tone = 'dark' }: { bundle: CatalogBundle; tone?: 'dark' | 'light' }) {
    const muted = tone === 'dark' ? 'text-indigo-200/70' : 'text-gray-400';
    const strong = tone === 'dark' ? 'text-white' : 'text-gray-900 dark:text-white';
    return (
        <div>
            <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-3xl font-black tracking-tight ${strong}`}>{formatINR(bundle.price)}</span>
                {bundle.savings > 0 && (
                    <span className={`text-sm font-semibold line-through ${muted}`}>
                        <span className="sr-only">Courses bought separately: </span>{formatINR(bundle.combinedPrice)}
                    </span>
                )}
            </div>
            {bundle.savings > 0 && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 dark:text-emerald-400">
                    <BadgePercent className="w-3.5 h-3.5" aria-hidden="true" />
                    Save {formatINR(bundle.savings)}{bundle.savingsPercent > 0 ? ` (${bundle.savingsPercent}%)` : ''} vs. buying separately
                </p>
            )}
        </div>
    );
}

/**
 * A bundle as a "learning package": dark, layered panel with a stack of the
 * included course covers — deliberately unlike the course cards.
 */
export function CatalogBundleCard({ bundle, courses, onOpenBundle, secondary }: {
    bundle: CatalogBundle;
    /** The bundle's courses, resolved from the catalog, in bundle order. */
    courses: CatalogCourse[];
    onOpenBundle?: (bundle: CatalogBundle) => void;
    secondary?: ReactNode;
}) {
    const titleId = `bundle-${bundle.id}-title`;
    const preview = courses.slice(0, 4);
    const detailsClass = 'group/btn inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 text-sm font-semibold text-indigo-100 hover:text-white transition-colors';

    return (
        <article
            aria-labelledby={titleId}
            className="group relative flex flex-col h-full rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white ring-1 ring-white/10 shadow-xl shadow-indigo-950/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-700/30 hover:ring-indigo-400/40 motion-reduce:transform-none"
        >
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/25 blur-3xl transition-opacity duration-500 group-hover:opacity-80" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 w-64 h-64 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />

            <div className="relative p-6 sm:p-7 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200 bg-white/10 ring-1 ring-white/15 px-2.5 py-1 rounded-full">
                            <Package className="w-3 h-3" aria-hidden="true" /> Bundle · {bundle.courseCount} course{bundle.courseCount === 1 ? '' : 's'}
                        </span>
                        <h3 id={titleId} className="mt-3 text-xl sm:text-2xl font-black leading-tight tracking-tight">{bundle.name}</h3>
                    </div>
                    {/* Stacked covers */}
                    <div className="relative hidden sm:block w-28 h-20 shrink-0" aria-hidden="true">
                        {preview.slice(0, 3).map((c, i) => (
                            <div
                                key={c.id}
                                className="absolute top-0 w-20 h-14 rounded-lg overflow-hidden ring-2 ring-slate-900 shadow-lg transition-transform duration-500 group-hover:translate-x-[var(--dx)] motion-reduce:transform-none"
                                style={{ left: i * 14, top: i * 6, zIndex: 3 - i, ['--dx' as string]: `${i * 6}px` }}
                            >
                                <CourseCover src={c.thumbnailUrl} title="" kind={c.kind} />
                            </div>
                        ))}
                        {bundle.imageUrl && preview.length === 0 && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={bundle.imageUrl} alt="" loading="lazy" className="w-20 h-14 rounded-lg object-cover" />
                        )}
                    </div>
                </div>

                {bundle.description && <p className="mt-3 text-sm text-indigo-100/75 leading-relaxed line-clamp-3">{bundle.description}</p>}

                <ul className="mt-5 space-y-2" aria-label="Courses included">
                    {preview.map(c => (
                        <li key={c.id} className="flex items-center gap-2.5 text-sm">
                            <span className="w-5 h-5 rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/30 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-emerald-300" aria-hidden="true" />
                            </span>
                            <span className="truncate text-indigo-50/90">{c.title}</span>
                        </li>
                    ))}
                    {courses.length > preview.length && (
                        <li className="text-xs font-semibold text-indigo-200/70 pl-7">+ {courses.length - preview.length} more course{courses.length - preview.length === 1 ? '' : 's'}</li>
                    )}
                </ul>

                {bundle.totals.modules > 0 && (
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-200/80">
                        <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                        {bundle.totals.modules} modules in total
                    </p>
                )}

                <div className="mt-auto pt-6">
                    <div className="flex items-end justify-between gap-4 mb-4">
                        <BundlePrice bundle={bundle} />
                        {onOpenBundle ? (
                            <button type="button" onClick={() => onOpenBundle(bundle)} className={detailsClass} aria-describedby={titleId}>
                                View bundle <DetailsArrow />
                            </button>
                        ) : (
                            <Link href={bundleDetailsHref(bundle)} className={detailsClass} aria-describedby={titleId}>
                                View bundle <DetailsArrow />
                            </Link>
                        )}
                    </div>
                    <PurchaseAction
                        size="lg"
                        product={{ type: 'bundle', id: bundle.id, name: bundle.name, price: bundle.price, courseIds: bundle.courseIds }}
                        secondary={secondary}
                    />
                </div>
            </div>
        </article>
    );
}

/** The All-In-One plan (every published course), priced by the server config. */
export function AllAccessCard({ price, courseCount, secondary, compact = false }: { price: number; courseCount: number; secondary?: ReactNode; compact?: boolean }) {
    return (
        <article aria-labelledby="all-access-title" className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-blue-500 via-indigo-500 to-fuchsia-500 shadow-xl shadow-indigo-900/20">
            <div className={`relative h-full rounded-[calc(1.5rem-1px)] bg-white dark:bg-gray-950 ${compact ? 'p-6' : 'p-6 sm:p-8'} flex flex-col md:flex-row md:items-center gap-6`}>
                <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
                        <InfinityIcon className="w-3 h-3" aria-hidden="true" /> All-In-One plan
                    </span>
                    <h3 id="all-access-title" className="mt-3 text-2xl font-black tracking-tight text-gray-900 dark:text-white">Every course, one purchase</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                        Access to all {courseCount} published course{courseCount === 1 ? '' : 's'} on the platform — including courses added later.
                    </p>
                </div>
                <div className="md:w-72 shrink-0">
                    <p className="text-3xl font-black text-gray-900 dark:text-white mb-3">{formatINR(price)}</p>
                    <PurchaseAction size="lg" product={{ type: 'all-access', name: 'Freshkite All-In-One plan', price }} secondary={secondary} />
                </div>
            </div>
        </article>
    );
}

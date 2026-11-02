"use client";

import { Scissors } from 'lucide-react';
import { formatPaise, previewDiscount } from '@/lib/money';
import type { DiscountType } from '@/services/api/discount.api';

/**
 * Ticket-style live preview of a coupon while it is being configured.
 * Informational only — checkout prices are computed by the server.
 */
export function CouponPreview({
    code,
    name,
    type,
    value,
    productName,
    originalPaise,
    expiresAt,
}: {
    code: string;
    name: string;
    type: DiscountType;
    value: number;
    productName: string | null;
    originalPaise: number | null;
    expiresAt: string | null;
}) {
    const hasValue = Number.isFinite(value) && value > 0;
    const calc = originalPaise != null && hasValue ? previewDiscount(type, value, originalPaise) : null;
    const headline = !hasValue ? '—' : type === 'percentage' ? `${value}% OFF` : `${formatPaise(Math.round(value * 100))} OFF`;

    return (
        <div aria-live="polite" className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-600/20">
                {/* Notches */}
                <span className="absolute left-0 top-[62%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-gray-900" aria-hidden="true" />
                <span className="absolute right-0 top-[62%] translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-gray-900" aria-hidden="true" />
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />

                <div className="px-5 pt-5 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/80 truncate">{name || 'Discount'}</p>
                    <p className="mt-1 text-3xl font-black tracking-tight">{headline}</p>
                    <p className="mt-1 text-xs text-blue-100/90 truncate">
                        {productName ? `on ${productName}` : 'Choose a product'}
                    </p>
                </div>
                <div className="relative border-t-2 border-dashed border-white/30 mx-4" aria-hidden="true">
                    <Scissors className="absolute -top-2.5 left-1 w-4 h-4 text-white/50 rotate-90" />
                </div>
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="rounded-lg bg-white/15 px-3 py-1.5 font-mono text-base font-bold tracking-[0.15em] truncate">
                        {code || 'CODE'}
                    </span>
                    <span className="text-[11px] text-blue-100/80 text-right shrink-0">
                        {expiresAt ? `Valid till ${new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No expiry'}
                    </span>
                </div>
            </div>

            <dl className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">Original price</dt>
                    <dd className="tabular-nums font-medium text-gray-900 dark:text-white">{originalPaise != null ? formatPaise(originalPaise) : '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">Discount{type === 'percentage' && hasValue ? ` (${value}%)` : ''}</dt>
                    <dd className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{calc ? `−${formatPaise(calc.discount)}` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-3 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <dt className="font-bold text-gray-900 dark:text-white">Final price</dt>
                    <dd className="tabular-nums text-lg font-black text-gray-900 dark:text-white">{calc ? formatPaise(calc.final) : '—'}</dd>
                </div>
                {calc?.belowMinimum && (
                    <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                        This leaves less than ₹1 to pay — Razorpay can’t process that. Lower the discount.
                    </p>
                )}
            </dl>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Preview only. The final amount is always calculated by the server at checkout.</p>
        </div>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { formatPaise } from '@/lib/money';
import {
    discountService,
    apiErrorMessage,
    type AdminDiscount,
    type AdminDiscountDetail,
    type DiscountRedemptionRow,
} from '@/services/api/discount.api';

const STATUS_STYLE: Record<DiscountRedemptionRow['status'], { label: string; cls: string }> = {
    redeemed: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    reserved: { label: 'Checkout open', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    released: { label: 'Superseded', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    expired: { label: 'Abandoned', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

/** Redemption history for one coupon. Only "Paid" rows count as uses. */
export function DiscountUsage({ discount, onClose }: { discount: AdminDiscount | null; onClose: () => void }) {
    const [detail, setDetail] = useState<AdminDiscountDetail | null>(null);
    const [rows, setRows] = useState<DiscountRedemptionRow[]>([]);
    const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!discount) return;
        setPage(1);
        setDetail(null);
        discountService.get(discount._id).then(setDetail).catch((e) => setError(apiErrorMessage(e)));
    }, [discount]);

    useEffect(() => {
        if (!discount) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        discountService.redemptions(discount._id, page, 10)
            .then((r) => { if (!cancelled) { setRows(r.data); setMeta(r.meta); } })
            .catch((e) => { if (!cancelled) setError(apiErrorMessage(e)); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [discount, page]);

    const stats = detail?.stats;

    return (
        <Modal
            open={!!discount}
            onClose={onClose}
            size="2xl"
            title={discount ? <>Usage · <span className="font-mono">{discount.code}</span></> : 'Usage'}
            description={discount ? `${discount.name} — ${discount.product.name}` : undefined}
            icon={
                <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <BarChart3 className="w-5 h-5" aria-hidden="true" />
                </span>
            }
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Paid uses', value: stats ? `${stats.redeemed}${discount?.max_usage ? ` / ${discount.max_usage}` : ''}` : null },
                        { label: 'Discount given', value: stats ? formatPaise(stats.totalDiscountGiven) : null },
                        { label: 'Revenue', value: stats ? formatPaise(stats.revenue) : null },
                        { label: 'Open / abandoned', value: stats ? `${stats.pendingCheckouts} / ${stats.abandoned}` : null },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</p>
                            {s.value == null
                                ? <div className="mt-1.5 h-6 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                : <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">{s.value}</p>}
                        </div>
                    ))}
                </div>

                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold">Student</th>
                                    <th className="px-4 py-2.5 font-semibold">Status</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Price</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Discount</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">Paid</th>
                                    <th className="px-4 py-2.5 font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && rows.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" aria-label="Loading" /></td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No one has used this coupon yet.</td></tr>
                                ) : rows.map((r) => (
                                    <tr key={r._id} className={loading ? 'opacity-60' : ''}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{r.student.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {r.student.studentCode && <span className="font-mono mr-1.5">{r.student.studentCode}</span>}
                                                {r.student.email}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status].cls}`}>{STATUS_STYLE[r.status].label}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{formatPaise(r.originalAmount, r.currency)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">−{formatPaise(r.discountAmount, r.currency)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{formatPaise(r.finalAmount, r.currency)}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(r.redeemedAt || r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                            {r.razorpayPaymentId && <span className="block font-mono text-[10px] text-gray-400">{r.razorpayPaymentId}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                            <span>Page {meta.page} of {meta.totalPages} · {meta.total} records</span>
                            <div className="flex gap-1">
                                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages} aria-label="Next page" className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

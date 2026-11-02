'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgePercent, Check, Loader2, Lock, Tag, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { discountService, apiErrorMessage, type CouponQuote } from '@/services/api/discount.api';
import { formatPaise } from '@/lib/money';

export type AppliedCoupon = Extract<CouponQuote, { valid: true }>;

/**
 * Order summary + coupon entry before Razorpay opens. Every figure shown for
 * an applied coupon comes from the server's quote (priced from the database);
 * the order itself is re-priced and re-validated on the server when "Pay" is
 * pressed, so nothing here is trusted for the charge.
 */
export function CheckoutModal({
    open,
    onClose,
    productName,
    itemId,
    listPrice,
    currency,
    applied,
    onApplied,
    paying,
    couponError,
    onCouponError,
    onPay,
}: {
    open: boolean;
    onClose: () => void;
    productName: string;
    itemId: string;
    /** List price in paise, for display before a coupon is applied. */
    listPrice: number;
    currency: string;
    applied: AppliedCoupon | null;
    onApplied: (quote: AppliedCoupon | null) => void;
    paying: boolean;
    couponError: string | null;
    onCouponError: (message: string | null) => void;
    onPay: () => void;
}) {
    const [code, setCode] = useState('');
    const [checking, setChecking] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && !applied) setCode('');
    }, [open, applied]);

    const original = applied?.originalAmount ?? listPrice;
    const discount = applied?.discountAmount ?? 0;
    const total = applied?.finalAmount ?? listPrice;

    const apply = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = code.trim();
        if (!trimmed || checking) return;
        setChecking(true);
        onCouponError(null);
        try {
            const quote = await discountService.validate(trimmed, itemId);
            if (quote.valid) {
                onApplied(quote);
                setCode('');
            } else {
                onCouponError(quote.message);
                inputRef.current?.focus();
            }
        } catch (err) {
            onCouponError(apiErrorMessage(err, 'Could not check this coupon. Please try again.'));
        } finally {
            setChecking(false);
        }
    };

    const remove = () => {
        onApplied(null);
        onCouponError(null);
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    return (
        <Modal
            open={open}
            onClose={paying ? () => undefined : onClose}
            title="Checkout"
            description={productName}
            size="md"
            icon={
                <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Lock className="w-4 h-4" aria-hidden="true" />
                </span>
            }
            footer={
                <div className="space-y-2.5">
                    <button
                        type="button"
                        onClick={onPay}
                        disabled={paying || checking}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-sm py-3 shadow-lg shadow-blue-600/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                    >
                        {paying ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
                        {paying ? 'Preparing secure payment…' : `Pay ${formatPaise(total, currency)}`}
                    </button>
                    <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
                        Payments are processed securely by Razorpay. The final amount is confirmed by our server.
                    </p>
                </div>
            }
        >
            <div className="space-y-5">
                {/* Coupon */}
                <section aria-labelledby="coupon-heading">
                    <h3 id="coupon-heading" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                        <Tag className="w-3.5 h-3.5" aria-hidden="true" /> Coupon code
                    </h3>
                    {applied ? (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3.5 py-3 ui-pop-in" role="status">
                            <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                                <Check className="w-4.5 h-4.5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                                    <span className="font-mono tracking-wide">{applied.coupon.code}</span> applied
                                </p>
                                <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90 truncate">
                                    {applied.coupon.discountType === 'percentage'
                                        ? `${applied.coupon.value}% off`
                                        : `${formatPaise(Math.round(applied.coupon.value * 100), currency)} off`}
                                    {' · '}You save {formatPaise(applied.discountAmount, currency)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={remove}
                                disabled={paying}
                                className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <X className="w-3.5 h-3.5" aria-hidden="true" /> Remove
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={apply} className="space-y-1.5" noValidate>
                            <div className="flex gap-2">
                                <label htmlFor="checkout-coupon" className="sr-only">Coupon code</label>
                                <input
                                    id="checkout-coupon"
                                    ref={inputRef}
                                    data-autofocus
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value.toUpperCase()); if (couponError) onCouponError(null); }}
                                    placeholder="Enter code, e.g. JAVA20"
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    maxLength={32}
                                    aria-invalid={!!couponError}
                                    aria-describedby={couponError ? 'checkout-coupon-error' : undefined}
                                    className={`min-w-0 flex-1 rounded-xl border bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm font-mono tracking-wide text-gray-900 dark:text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 outline-none transition focus:ring-2 ${couponError ? 'border-red-300 dark:border-red-700 focus:ring-red-500/40' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/40 focus:border-blue-500'}`}
                                />
                                <button
                                    type="submit"
                                    disabled={!code.trim() || checking || paying}
                                    className="shrink-0 inline-flex items-center justify-center gap-1.5 min-w-[84px] rounded-xl border border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-500 px-4 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    {checking ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Apply'}
                                </button>
                            </div>
                            {couponError && (
                                <p id="checkout-coupon-error" role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                                    <X className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" /> {couponError}
                                </p>
                            )}
                        </form>
                    )}
                </section>

                {/* Summary */}
                <section aria-label="Price summary" className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4">
                    <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-gray-600 dark:text-gray-400">Price</dt>
                            <dd className={`tabular-nums font-medium ${discount > 0 ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                {formatPaise(original, currency)}
                            </dd>
                        </div>
                        {discount > 0 && (
                            <div className="flex items-center justify-between gap-4 text-emerald-700 dark:text-emerald-400 ui-fade-in">
                                <dt className="flex items-center gap-1.5">
                                    <BadgePercent className="w-4 h-4" aria-hidden="true" /> Discount ({applied?.coupon.code})
                                </dt>
                                <dd className="tabular-nums font-semibold">−{formatPaise(discount, currency)}</dd>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-4 pt-2.5 mt-1 border-t border-dashed border-gray-200 dark:border-gray-700">
                            <dt className="font-bold text-gray-900 dark:text-white">Total payable</dt>
                            <dd className="tabular-nums text-xl font-black text-gray-900 dark:text-white" aria-live="polite">
                                {formatPaise(total, currency)}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>
        </Modal>
    );
}

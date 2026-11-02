/**
 * Money helpers. The payment APIs return integer paise (Razorpay's unit);
 * products store rupees. Display rounds to whole rupees unless there are paise.
 */
export function formatPaise(paise: number, currency = 'INR'): string {
    const rupees = paise / 100;
    const hasPaise = Math.round(paise) % 100 !== 0;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: hasPaise ? 2 : 0,
        maximumFractionDigits: 2,
    }).format(rupees);
}

export const rupeesToPaise = (rupees: number): number => Math.round(Number(rupees) * 100);

/**
 * Client-side PREVIEW of a coupon (admin form only). Mirrors the server's
 * arithmetic; the server recomputes everything at checkout.
 */
export function previewDiscount(type: 'percentage' | 'fixed', value: number, originalPaise: number) {
    const raw = type === 'percentage' ? Math.round((originalPaise * value) / 100) : rupeesToPaise(value);
    const discount = Math.max(0, Math.min(Number.isFinite(raw) ? raw : 0, originalPaise));
    const final = originalPaise - discount;
    return { discount, final, belowMinimum: final < 100 };
}

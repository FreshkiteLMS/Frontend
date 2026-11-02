import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { formatPaise, previewDiscount } from '@/lib/money';

const validate = vi.fn();
vi.mock('@/services/api/discount.api', async (orig) => ({
    ...(await orig<typeof import('@/services/api/discount.api')>()),
    discountService: { validate: (...a: unknown[]) => validate(...a) },
}));

import { CheckoutModal, type AppliedCoupon } from '../CheckoutModal';

afterEach(() => { cleanup(); validate.mockReset(); });

function Harness({ onPay = () => undefined }: { onPay?: () => void }) {
    const [applied, setApplied] = useState<AppliedCoupon | null>(null);
    const [error, setError] = useState<string | null>(null);
    return (
        <CheckoutModal
            open
            onClose={() => undefined}
            productName="Java Full Stack"
            itemId="bundle-1"
            listPrice={500000}
            currency="INR"
            applied={applied}
            onApplied={setApplied}
            paying={false}
            couponError={error}
            onCouponError={setError}
            onPay={onPay}
        />
    );
}

const quote = {
    valid: true as const,
    coupon: { code: 'JAVA20', name: 'Java 20', description: '', discountType: 'percentage' as const, value: 20, expiresAt: null },
    product: { type: 'BUNDLE', id: 'bundle-1', name: 'Java Full Stack' },
    currency: 'INR',
    originalAmount: 500000,
    discountAmount: 100000,
    finalAmount: 400000,
};

describe('money helpers', () => {
    test('formats paise as rupees and previews discounts like the server', () => {
        expect(formatPaise(400000)).toBe('₹4,000');
        expect(formatPaise(123456)).toBe('₹1,234.56');
        expect(previewDiscount('percentage', 20, 500000)).toEqual({ discount: 100000, final: 400000, belowMinimum: false });
        expect(previewDiscount('fixed', 500, 300000)).toEqual({ discount: 50000, final: 250000, belowMinimum: false });
        expect(previewDiscount('fixed', 3000, 300000).belowMinimum).toBe(true);
    });
});

describe('CheckoutModal', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    test('renders in <body> (portal) with the full price before a coupon', () => {
        render(<Harness />);
        const dialog = screen.getByRole('dialog');
        expect(dialog.parentElement?.parentElement).toBe(document.body);
        expect(screen.getByRole('button', { name: /Pay ₹5,000/ })).toBeTruthy();
    });

    test('applies a valid coupon using the server quote and can remove it', async () => {
        validate.mockResolvedValue(quote);
        render(<Harness />);
        fireEvent.change(screen.getByRole('textbox', { name: 'Coupon code' }), { target: { value: 'java20' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
        await waitFor(() => expect(screen.getByText(/applied/)).toBeTruthy());
        expect(validate).toHaveBeenCalledWith('JAVA20', 'bundle-1');
        expect(screen.getByText(/You save ₹1,000/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Pay ₹4,000/ })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
        expect(screen.getByRole('button', { name: /Pay ₹5,000/ })).toBeTruthy();
    });

    test('an invalid coupon shows the reason and leaves the amount unchanged', async () => {
        validate.mockResolvedValue({ valid: false, reason: 'COUPON_OTHER_BUNDLE', message: 'This coupon is not valid for this bundle.' });
        render(<Harness />);
        fireEvent.change(screen.getByRole('textbox', { name: 'Coupon code' }), { target: { value: 'REACT10' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
        await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('not valid for this bundle'));
        expect(screen.getByRole('button', { name: /Pay ₹5,000/ })).toBeTruthy();
        // Typing again clears the error so another code can be tried.
        fireEvent.change(screen.getByRole('textbox', { name: 'Coupon code' }), { target: { value: 'JAVA20' } });
        expect(screen.queryByRole('alert')).toBeNull();
    });
});

import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const create = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/services/api/discount.api', async (orig) => ({
    ...(await orig<typeof import('@/services/api/discount.api')>()),
    discountService: {
        products: () => Promise.resolve({
            currency: 'INR',
            masterPlan: { type: 'ALL_IN_ONE', id: 'ALL_IN_ONE', name: 'Master Plan', price: 6000000 },
            bundles: [{ type: 'BUNDLE', id: 'b1', name: 'Java Full Stack', price: 500000, status: 'active' }],
            courses: [
                { type: 'COURSE', id: 'c-uuid-1', name: 'Spring Boot', price: 79900, status: 'active' },
                { type: 'COURSE', id: 'c-uuid-2', name: 'React Basics', price: 120000, status: 'active' },
            ],
        }),
        create: (...a: unknown[]) => create(...a),
    },
}));

import { DiscountForm } from '../discount-form';

afterEach(() => { cleanup(); create.mockReset(); document.body.innerHTML = ''; });

describe('DiscountForm — course coupons', () => {
    test('opens on the Courses tab with the linked course selected and previews its price', async () => {
        render(<DiscountForm open discount={null} initialProduct="COURSE:c-uuid-1" onClose={vi.fn()} onSaved={vi.fn()} />);
        await waitFor(() => expect(screen.getByRole('tab', { name: /Courses \(2\)/ }).getAttribute('aria-selected')).toBe('true'));
        expect(screen.getByRole('radio', { name: /Spring Boot/ }).getAttribute('aria-checked')).toBe('true');
        fireEvent.change(screen.getByRole('textbox', { name: 'Percentage off' }), { target: { value: '25' } });
        expect(screen.getByText('on Spring Boot')).toBeTruthy();
        expect(screen.getByText('₹599.25')).toBeTruthy(); // 799 − 25 %
    });

    test('submits applicable_to COURSE with the Course.id', async () => {
        create.mockResolvedValue({ code: 'REACT10' });
        const onSaved = vi.fn();
        render(<DiscountForm open discount={null} onClose={vi.fn()} onSaved={onSaved} />);
        await waitFor(() => screen.getByRole('tab', { name: /Courses/ }));
        fireEvent.change(screen.getByLabelText('Discount name'), { target: { value: 'React launch' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Coupon code' }), { target: { value: 'react10' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Percentage off' }), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('tab', { name: /Courses/ }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Search courses' }), { target: { value: 'react' } });
        expect(screen.queryByRole('radio', { name: /Spring Boot/ })).toBeNull();
        fireEvent.click(screen.getByRole('radio', { name: /React Basics/ }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Create discount' })); });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            code: 'REACT10', applicable_to: 'COURSE', course_id: 'c-uuid-2', bundle_id: null, value: 10,
        }));
        expect(onSaved).toHaveBeenCalled();
    });
});

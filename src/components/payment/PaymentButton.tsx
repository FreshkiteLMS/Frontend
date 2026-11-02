'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '../../hooks/useRazorpay';
import { paymentService } from '../../services/api/payment.api';
import { RazorpayResponse } from '../../hooks/useRazorpay';
import { env } from '@/config/env';
import toast from 'react-hot-toast';
import { refreshCourseAccess } from '@/hooks/use-course-access';
import { useAuth } from '@/hooks/use-auth';
import { apiErrorMessage } from '@/services/api/discount.api';
import { formatPaise } from '@/lib/money';
import { CheckoutModal, type AppliedCoupon } from './CheckoutModal';

interface PaymentButtonProps {
    amount: number; // Amount in smallest unit (e.g., paise) — display only; the server prices the order
    currency: string;
    courseId: string;
    itemType: 'course' | 'bundle';
    /** Shown in the checkout summary. */
    productName?: string;
    userDetails?: {
        name: string;
        email: string;
        contact: string;
    };
    onSuccess?: (response: RazorpayResponse) => void;
    onFailure?: (error: any) => void;
    className?: string;
    label?: string;
}

export default function PaymentButton({ amount, currency, courseId, itemType, productName, userDetails, onSuccess, onFailure, className, label }: PaymentButtonProps) {
    const { displayRazorpay } = useRazorpay();
    const router = useRouter();
    const { user } = useAuth();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const openCheckout = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (amount <= 0) {
            toast.error('This course has no price set. Please contact support or check back later.');
            return;
        }
        if (!user) {
            toast('Please log in to continue.', { icon: '🔒' });
            router.push('/login');
            return;
        }
        setCheckoutOpen(true);
    };

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            // 1. Create the order. Only WHAT is bought and the coupon CODE are
            //    sent; the server re-validates the coupon and sets the amount.
            const order = await paymentService.createOrder({
                amount: coupon?.finalAmount ?? amount,
                currency,
                receipt: `rcpt_${courseId.slice(-10)}_${Date.now().toString().slice(-8)}`,
                notes: {
                    itemType,
                    itemId: courseId
                },
                couponCode: coupon?.coupon.code,
            });

            const expected = coupon?.finalAmount ?? amount;
            if (order.amount !== expected) {
                toast(`The price was updated to ${formatPaise(order.amount, order.currency)}.`, { icon: 'ℹ️' });
            }

            // 2. Open Razorpay Checkout (our sheet steps aside while it is open)
            setCheckoutOpen(false);
            const options = {
                key: order.keyId || env.RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Freshkite LMS',
                description: productName ? productName.slice(0, 250) : 'Course Purchase',
                order_id: order.orderId,
                handler: async function (response: RazorpayResponse) {
                    try {
                        setIsVerifying(true);

                        // 3. Verify Payment on Backend (triggers enrollment)
                        await paymentService.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        await refreshCourseAccess();
                        setCoupon(null);

                        if (onSuccess) {
                            onSuccess(response);
                        } else {
                            // Default behavior: Redirect to student dashboard with success flag
                            router.push('/student?success=true');
                        }
                    } catch (err: any) {
                        console.error('Verification Error:', err);
                        toast.error('Payment was successful but enrollment setup failed. Please contact support.');
                    } finally {
                        setIsVerifying(false);
                    }
                },
                modal: {
                    // Closed without paying: bring the summary back (coupon kept).
                    ondismiss: () => setCheckoutOpen(true),
                },
                prefill: {
                    name: userDetails?.name || '',
                    email: userDetails?.email || '',
                    contact: userDetails?.contact || '',
                },
                notes: {
                    address: 'Razorpay Corporate Office',
                },
                theme: {
                    color: '#3399cc',
                },
            };

            await displayRazorpay(options);

        } catch (error: any) {
            const code = error.response?.data?.error?.code;
            // The server refuses to charge for something already owned (it prices
            // and checks ownership itself) — take the student to their courses.
            if (code === 'ALREADY_OWNED') {
                setCheckoutOpen(false);
                toast.success('You already have access — no payment needed.');
                await refreshCourseAccess();
                router.push('/student/courses');
                return;
            }
            // The coupon stopped being valid between "Apply" and "Pay" (expired,
            // limit reached…): drop it and say why; the price shown reverts.
            if (typeof code === 'string' && code.startsWith('COUPON_')) {
                setCoupon(null);
                setCouponError(apiErrorMessage(error));
                setCheckoutOpen(true);
                return;
            }
            console.error('Payment Error:', error);
            const errorMessage = apiErrorMessage(error, 'Something went wrong during payment initialization.');

            if (onFailure) {
                onFailure(error);
            } else {
                toast.error(errorMessage || 'Something went wrong during payment. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const baseClass = `bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all min-w-[120px] flex items-center justify-center gap-2`;
    const disabledClass = (isLoading || isVerifying) ? 'opacity-70 cursor-not-allowed' : '';

    return (
        <>
            <button
                onClick={openCheckout}
                disabled={isLoading || isVerifying}
                className={className ? `${className} ${disabledClass}` : `${baseClass} ${disabledClass}`}
            >
                {isLoading || isVerifying ? (
                    <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {isVerifying ? 'Verifying...' : 'Opening...'}
                    </>
                ) : (
                    label ?? 'Buy Now'
                )}
            </button>
            <CheckoutModal
                open={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                productName={productName || (itemType === 'bundle' ? 'Bundle' : 'Course')}
                itemId={courseId}
                listPrice={amount}
                currency={currency}
                applied={coupon}
                onApplied={setCoupon}
                paying={isLoading}
                couponError={couponError}
                onCouponError={setCouponError}
                onPay={handlePayment}
            />
        </>
    );
}

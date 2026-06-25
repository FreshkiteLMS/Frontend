'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '../../hooks/useRazorpay';
import { paymentService } from '../../services/api/payment.api';
import { RazorpayResponse } from '../../hooks/useRazorpay';
import { env } from '@/config/env';
import toast from 'react-hot-toast';

interface PaymentButtonProps {
    amount: number; // Amount in smallest unit (e.g., paise)
    currency: string;
    courseId: string;
    itemType: 'course' | 'bundle';
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

export default function PaymentButton({ amount, currency, courseId, itemType, userDetails, onSuccess, onFailure, className, label }: PaymentButtonProps) {
    const { displayRazorpay } = useRazorpay();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const handlePayment = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (amount <= 0) {
            toast.error('This course has no price set. Please contact support or check back later.');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Create Order via Backend using Service
            const order = await paymentService.createOrder({
                amount,
                currency,
                receipt: `rcpt_${courseId.slice(-10)}_${Date.now().toString().slice(-8)}`,
                notes: {
                    itemType,
                    itemId: courseId
                }
            });

            // 2. Open Razorpay Checkout
            const options = {
                key: env.RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Freshkite LMS',
                description: 'Course Purchase',
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
            console.error('Payment Error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong during payment initialization.';

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
        <button
            onClick={handlePayment}
            disabled={isLoading || isVerifying}
            className={className ? `${className} ${disabledClass}` : `${baseClass} ${disabledClass}`}
        >
            {isLoading || isVerifying ? (
                <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isVerifying ? 'Verifying...' : amount > 0 ? 'Opening...' : 'Processing...'}
                </>
            ) : (
                label ?? 'Buy Now'
            )}
        </button>
    );
}

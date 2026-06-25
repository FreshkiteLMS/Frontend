'use client';

import { useState } from 'react';
import { loadRazorpayScript } from '../lib/razorpay';
import toast from 'react-hot-toast';

export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
        color?: string;
    };
}

export const useRazorpay = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    const displayRazorpay = async (options: RazorpayOptions) => {
        const res = await loadRazorpayScript();

        if (!res) {
            toast.error('Payment service failed to load. Please check your connection and try again.');
            return;
        }

        setIsLoaded(true);

        const rzp = new (window as any).Razorpay(options);

        rzp.on('payment.failed', function (response: any) {
            // This is triggered when payment is failed due to incorrect OTP, insufficient balance, etc.
            const error = response.error;
            console.error('Payment failed:', {
                code: error.code,
                description: error.description,
                source: error.source,
                step: error.step,
                reason: error.reason,
                order_id: error.metadata.order_id,
                payment_id: error.metadata.payment_id
            });
            toast.error(`Payment failed: ${error.description || 'Please try again.'}`);
        });

        rzp.open();
    };

    return { displayRazorpay, isLoaded };
};

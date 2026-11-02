import api from './axios';

export interface CreateOrderParams {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
    /** Only the code is sent; the server validates it and computes the amount. */
    couponCode?: string;
}

export interface RazorpayOrder {
    id: string; // Mongoose _id
    orderId: string; // Razorpay Order ID
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    notes?: Record<string, any>;
    keyId?: string; // Public Razorpay key the order was created with
    pricing?: { originalAmount: number; discountAmount: number; finalAmount: number };
    discount?: { discountId: string; code: string; type: 'percentage' | 'fixed'; value: number } | null;
}

export const paymentService = {
    createOrder: async (params: CreateOrderParams): Promise<RazorpayOrder> => {
        const response = await api.post('/payments/orders', params);
        return response.data;
    },
    verifyPayment: async (data: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }): Promise<any> => {
        const response = await api.post('/payments/verify', data);
        return response.data;
    },
};

import api from './axios';

/** Amounts are integer paise; the server computes every figure. */
export type DiscountType = 'percentage' | 'fixed';
export type DiscountScope = 'BUNDLE' | 'ALL_IN_ONE' | 'COURSE';
export type DiscountState = 'active' | 'inactive' | 'scheduled' | 'expired' | 'exhausted' | 'archived';

export type CouponRejection =
    | 'COUPON_INVALID'
    | 'COUPON_INACTIVE'
    | 'COUPON_NOT_STARTED'
    | 'COUPON_EXPIRED'
    | 'COUPON_MASTER_PLAN_ONLY'
    | 'COUPON_BUNDLE_ONLY'
    | 'COUPON_OTHER_BUNDLE'
    | 'COUPON_COURSE_ONLY'
    | 'COUPON_OTHER_COURSE'
    | 'COUPON_USAGE_LIMIT'
    | 'COUPON_STUDENT_LIMIT'
    | 'COUPON_EXCEEDS_PRICE';

export type CouponQuote =
    | {
        valid: true;
        coupon: { code: string; name: string; description: string; discountType: DiscountType; value: number; expiresAt: string | null };
        product: { type: string; id: string; name: string };
        currency: string;
        originalAmount: number;
        discountAmount: number;
        finalAmount: number;
    }
    | { valid: false; reason: CouponRejection; message: string };

export interface DiscountProduct {
    type: DiscountScope;
    id: string;
    name: string;
    price: number; // paise
    status?: 'active' | 'inactive' | 'archived';
}

export interface AdminDiscount {
    _id: string;
    name: string;
    code: string;
    description: string;
    discount_type: DiscountType;
    value: number;
    applicable_to: DiscountScope;
    bundle_id: string | null;
    /** Course.id (UUID) for course coupons. */
    course_id: string | null;
    product: { type: DiscountScope; id: string | null; name: string; price: number | null; exists: boolean };
    is_active: boolean;
    state: DiscountState;
    starts_at: string | null;
    expires_at: string | null;
    max_usage: number | null;
    max_usage_per_student: number | null;
    usage_count: number;
    reserved_count: number;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
}

export interface AdminDiscountDetail extends AdminDiscount {
    stats: { redeemed: number; totalDiscountGiven: number; revenue: number; pendingCheckouts: number; abandoned: number };
}

export interface DiscountRedemptionRow {
    _id: string;
    status: 'reserved' | 'redeemed' | 'released' | 'expired';
    student: { userId: string; name: string; email: string; studentCode: string | null };
    productName: string;
    code: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    currency: string;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    createdAt: string;
    redeemedAt: string | null;
}

export interface DiscountInput {
    name: string;
    code: string;
    description?: string;
    discount_type: DiscountType;
    value: number;
    applicable_to: DiscountScope;
    bundle_id?: string | null;
    course_id?: string | null;
    is_active?: boolean;
    starts_at?: string | null;
    expires_at?: string | null;
    max_usage?: number | null;
    max_usage_per_student?: number | null;
}

export interface Paged<T> {
    data: T[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}

export const discountService = {
    /** Student: preview a coupon for an item (bundle _id or 'master-subscription'). */
    validate: async (code: string, itemId: string): Promise<CouponQuote> => {
        const res = await api.post('/discounts/validate', { code, itemId });
        return res.data.data;
    },

    list: async (params: {
        q?: string;
        product?: string;
        status?: string;
        sort?: string;
        order?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }): Promise<Paged<AdminDiscount>> => {
        const res = await api.get('/admin/discounts', { params });
        return { data: res.data.data, meta: res.data.meta };
    },
    products: async (): Promise<{ currency: string; masterPlan: DiscountProduct; bundles: DiscountProduct[]; courses: DiscountProduct[] }> => {
        const res = await api.get('/admin/discounts/products');
        return res.data.data;
    },
    get: async (id: string): Promise<AdminDiscountDetail> => {
        const res = await api.get(`/admin/discounts/${id}`);
        return res.data.data;
    },
    redemptions: async (id: string, page = 1, limit = 10): Promise<Paged<DiscountRedemptionRow>> => {
        const res = await api.get(`/admin/discounts/${id}/redemptions`, { params: { page, limit } });
        return { data: res.data.data, meta: res.data.meta };
    },
    create: async (input: DiscountInput): Promise<AdminDiscount> => {
        const res = await api.post('/admin/discounts', input);
        return res.data.data;
    },
    update: async (id: string, input: Partial<DiscountInput>): Promise<AdminDiscount> => {
        const res = await api.put(`/admin/discounts/${id}`, input);
        return res.data.data;
    },
    setActive: async (id: string, isActive: boolean): Promise<AdminDiscount> => {
        const res = await api.patch(`/admin/discounts/${id}/status`, { is_active: isActive });
        return res.data.data;
    },
    remove: async (id: string): Promise<{ mode: 'deleted' | 'archived' }> => {
        const res = await api.delete(`/admin/discounts/${id}`);
        return res.data.data;
    },
};

/** Best message from an API error (the server's `error.message` when present). */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
    const e = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
    return e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || fallback;
}

/** Field-level validation errors from the API, keyed by field name. */
export function apiFieldErrors(err: unknown): Record<string, string> {
    const details = (err as { response?: { data?: { error?: { details?: Array<{ field?: string; message?: string }> } } } })
        ?.response?.data?.error?.details;
    const out: Record<string, string> = {};
    if (Array.isArray(details)) for (const d of details) if (d?.field && d.message && !out[d.field]) out[d.field] = d.message;
    return out;
}

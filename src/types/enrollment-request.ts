export type ProductType = 'COURSE' | 'BUNDLE' | 'ALL_IN_ONE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EnrollmentRequest {
    id: string;
    student_id: string;
    user_id: string;
    student_name: string;
    student_email: string;
    product_type: ProductType;
    product_id: string;
    product_name: string;
    status: ApprovalStatus;
    notes?: string;
    admin_notes?: string;
    rejection_reason?: string;
    requested_at: string;
    reviewed_at?: string;
    reviewed_by_admin_id?: string;
    created_at: string;
    updated_at: string;
}

export interface EnrollmentRequestList {
    rows: EnrollmentRequest[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    counts: { PENDING: number; APPROVED: number; REJECTED: number };
}

/** Stable key for matching a product to its request status on the client. */
export function productKey(productType: ProductType, productId: string): string {
    return `${productType}:${productId}`;
}

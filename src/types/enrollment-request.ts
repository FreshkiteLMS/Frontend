export type ProductType = 'COURSE' | 'BUNDLE' | 'ALL_IN_ONE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface EnrollmentRequest {
    id: string;
    student_id: string;
    user_id: string;
    student_name: string;
    student_email: string;
    /** Requester's human-readable Student ID (admin list). */
    student_code?: string | null;
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
    counts: { PENDING: number; APPROVED: number; REJECTED: number; CANCELLED?: number };
}

import type { ApprovalStatus, ProductType } from './enrollment-request';

/** Enrollment Management types (admin grants, access requests, audit). */

export type ResourceType = ProductType; // 'COURSE' | 'BUNDLE' | 'ALL_IN_ONE'
export type AccessSource = 'PAYMENT' | 'ADMIN_GRANT' | 'STUDENT_REQUEST' | 'PROMOTIONAL';
export type EnrollmentStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'CANCELLED';
export type DurationPreset = '30_DAYS' | '3_MONTHS' | '6_MONTHS' | '1_YEAR' | 'LIFETIME' | 'CUSTOM';

export interface DurationInput {
    preset: DurationPreset;
    startsAt?: string | null;
    expiresAt?: string | null;
}

export interface AdminEnrollment {
    id: string;
    student_id: string;
    user_id: string;
    student_name: string;
    student_email: string;
    student_code?: string | null;
    resource_type: ResourceType;
    resource_id: string;
    resource_name: string;
    access_source: AccessSource;
    status: EnrollmentStatus;
    /** Status right now, even if the expiry sweep hasn't run yet. */
    effective_status: EnrollmentStatus;
    starts_at: string;
    expires_at: string | null;
    granted_by: string | null;
    granted_by_name: string;
    request_id: string | null;
    payment_reference: string | null;
    admin_notes: string | null;
    grant_reason: string | null;
    internal_reference: string | null;
    revoked_at: string | null;
    revoked_by: string | null;
    revoke_reason: string | null;
    expired_at: string | null;
    created_at: string;
    updated_at: string;
}

/** A student's own view of an enrollment — no internal fields. */
export interface MyEnrollment {
    id: string;
    resource_type: ResourceType;
    resource_id: string;
    resource_name: string;
    access_source: AccessSource;
    status: EnrollmentStatus;
    starts_at: string;
    expires_at: string | null;
    request_id: string | null;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
}

export type AuditAction =
    | 'ACCESS_GRANTED' | 'SUBSCRIPTION_ACTIVATED' | 'REQUEST_SUBMITTED' | 'REQUEST_CANCELLED'
    | 'REQUEST_APPROVED' | 'REQUEST_REJECTED' | 'ACCESS_REVOKED' | 'ACCESS_EXTENDED'
    | 'ACCESS_UPDATED' | 'ACCESS_STARTED' | 'ACCESS_EXPIRED' | 'SUBSCRIPTION_EXPIRED';

export interface AuditLogEntry {
    id: string;
    action: AuditAction;
    actor_id: string | null;
    actor_role: 'admin' | 'student' | 'system';
    actor_name: string;
    student_id: string | null;
    user_id: string | null;
    student_name: string;
    resource_type: string | null;
    resource_id: string | null;
    resource_name: string;
    enrollment_id: string | null;
    request_id: string | null;
    previous_status: string | null;
    new_status: string | null;
    notes: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface AdminAccessRequest {
    id: string;
    reference: string;
    student_id: string;
    user_id: string;
    student_name: string;
    student_email: string;
    student_code?: string | null;
    student_phone?: string | null;
    product_type: ResourceType;
    product_id: string;
    product_name: string;
    status: ApprovalStatus;
    notes?: string;
    admin_notes?: string;
    admin_response?: string;
    rejection_reason?: string;
    enrollment_id?: string | null;
    requested_at: string;
    reviewed_at?: string;
    reviewed_by_admin_id?: string;
    cancelled_at?: string;
    created_at: string;
    updated_at: string;
}

export interface MyAccessRequest {
    id: string;
    reference: string;
    product_type: ResourceType;
    product_id: string;
    product_name: string;
    status: ApprovalStatus;
    notes: string | null;
    admin_response: string | null;
    rejection_reason: string | null;
    enrollment_id: string | null;
    requested_at: string;
    reviewed_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface StudentSearchResult {
    id: string; // User id
    name: string;
    email: string;
    phone: string | null;
    student_code: string | null;
    created_at: string | null;
}

export interface StudentAccessProfile {
    student: { userId: string; studentId: string; name: string; email: string; phone: string | null; studentCode: string | null };
    access: {
        fullAccess: boolean;
        fullAccessExpiresAt: string | null;
        bundles: { id: string; name: string; expiresAt: string | null }[];
        courses: { id: string; title: string; status: string; via: string[]; expiresAt: string | null }[];
        grants: { productType: ResourceType; productId: string; source: string; expiresAt: string | null }[];
    };
    enrollments: AdminEnrollment[];
    requests: AdminAccessRequest[];
}

export interface GrantCatalog {
    courses: { id: string; _id: string; title: string; category: string | null; price: number; status: string; template_type?: string }[];
    bundles: { id: string; name: string; price: number; status: string; description: string; courses: { id: string; title: string }[] }[];
    master: { id: string; name: string; price: number; courseCount: number; benefits: string[] };
}

export interface EnrollmentOverview {
    cards: {
        totalActiveEnrollments: number;
        activeBreakdown: { managed: number; paidOrders: number; legacyApprovals: number };
        manuallyGranted: number;
        pendingRequests: number;
        activeMasterSubscriptions: number;
        expiredEnrollments: number;
        recentlyGranted: number;
    };
    recent: AdminEnrollment[];
}

export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface Paged<T> { rows: T[]; meta: PageMeta }

/** One problem per selected item when a grant is refused. */
export interface GrantProblem { resourceId: string; name?: string; code: string; message: string; enrollmentId?: string }

import api from './axios';
import type { ApprovalStatus } from '@/types/enrollment-request';
import type {
    AccessSource, AdminAccessRequest, AdminEnrollment, AuditLogEntry, DurationInput, EnrollmentOverview, EnrollmentStatus,
    GrantCatalog, MyAccessRequest, MyEnrollment, Paged, ResourceType, StudentAccessProfile, StudentSearchResult,
} from '@/types/enrollment';

export { apiErrorMessage, apiErrorCode, apiErrorDetails } from './structured-course.api';

type Params = Record<string, string | number | undefined | null>;
const clean = (p: Params) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''));

async function data<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
    return (await p).data.data;
}
async function paged<T>(p: Promise<{ data: { data: T[]; meta: Paged<T>['meta']; [k: string]: unknown } }>): Promise<Paged<T> & Record<string, unknown>> {
    const { data: body } = await p;
    const { data: rows, meta, success: _s, ...extra } = body as any;
    return { rows, meta, ...extra };
}

export interface GrantRequest {
    studentId: string;
    resourceType: ResourceType;
    resourceIds?: string[];
    accessSource?: Extract<AccessSource, 'ADMIN_GRANT' | 'PROMOTIONAL'>;
    duration: DurationInput;
    adminNotes?: string;
    reason?: string;
    internalReference?: string;
}

/** Admin: Enrollment Management. */
export const enrollmentAdminApi = {
    overview: () => data<EnrollmentOverview>(api.get('/admin/enrollments/overview')),
    catalog: () => data<GrantCatalog>(api.get('/admin/enrollments/catalog')),
    searchStudents: (q: string) => data<StudentSearchResult[]>(api.get('/admin/enrollments/students', { params: clean({ q, limit: 20 }) })),
    studentAccess: (userId: string) => data<StudentAccessProfile>(api.get(`/admin/enrollments/students/${encodeURIComponent(userId)}`)),
    grant: (body: GrantRequest) => data<{ enrollments: AdminEnrollment[] }>(api.post('/admin/enrollments/grant', body)),

    list: (f: { status?: EnrollmentStatus | ''; resourceType?: ResourceType | ''; accessSource?: AccessSource | ''; q?: string; userId?: string; page?: number; limit?: number }) =>
        paged<AdminEnrollment>(api.get('/admin/enrollments', { params: clean(f) })),
    get: (id: string) => data<{ enrollment: AdminEnrollment; request: AdminAccessRequest | null; auditTrail: AuditLogEntry[] }>(api.get(`/admin/enrollments/${encodeURIComponent(id)}`)),
    update: (id: string, body: { expiresAt?: string | null; startsAt?: string; duration?: DurationInput; adminNotes?: string | null }) =>
        data<AdminEnrollment>(api.patch(`/admin/enrollments/${encodeURIComponent(id)}`, body)),
    revoke: (id: string, reason?: string) => data<AdminEnrollment>(api.post(`/admin/enrollments/${encodeURIComponent(id)}/revoke`, { reason: reason || undefined })),

    auditLogs: (f: { action?: string; q?: string; userId?: string; page?: number; limit?: number }) =>
        paged<AuditLogEntry>(api.get('/admin/enrollments/audit-logs', { params: clean(f) })),

    requests: async (f: { status?: ApprovalStatus | ''; product_type?: ResourceType | ''; q?: string; page?: number; limit?: number }) => {
        const r = await paged<AdminAccessRequest>(api.get('/admin/access-requests', { params: clean(f) }));
        return { ...r, counts: (r.counts as Record<ApprovalStatus, number>) ?? { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 } };
    },
    request: (id: string) => data<{
        request: AdminAccessRequest;
        enrollment: AdminEnrollment | null;
        currentAccess: { hasAccess: boolean; until: string | null | undefined; via?: string } | null;
        auditTrail: AuditLogEntry[];
    }>(api.get(`/admin/access-requests/${encodeURIComponent(id)}`)),
    approve: (id: string, body: { duration: DurationInput; adminResponse?: string; adminNotes?: string }) =>
        data<{ request: AdminAccessRequest; enrollment: AdminEnrollment }>(api.post(`/admin/access-requests/${encodeURIComponent(id)}/approve`, body)),
    reject: (id: string, body: { reason: string; adminNotes?: string }) =>
        data<AdminAccessRequest>(api.post(`/admin/access-requests/${encodeURIComponent(id)}/reject`, body)),
};

/** Student: own access requests and managed enrollments. */
export const accessRequestApi = {
    create: (body: { resourceType: ResourceType; resourceId?: string; reason?: string }) =>
        data<MyAccessRequest>(api.post('/student/access-requests', body)),
    mine: () => data<MyAccessRequest[]>(api.get('/student/access-requests')),
    get: (id: string) => data<MyAccessRequest>(api.get(`/student/access-requests/${encodeURIComponent(id)}`)),
    cancel: (id: string) => data<MyAccessRequest>(api.patch(`/student/access-requests/${encodeURIComponent(id)}/cancel`)),
    myEnrollments: () => data<MyEnrollment[]>(api.get('/student/enrollments')),
};

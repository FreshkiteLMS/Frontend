import api from './axios';
import type {
    AdminAttemptRequest,
    AllowanceDetail,
    AllowanceRow,
    AssessmentKind,
    AttemptRequest,
    AttemptsOverview,
} from '@/types/assessment-attempts';

type Paged<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };
const clean = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''));

export interface AttemptItemRef {
    kind: AssessmentKind;
    courseId: string;
    itemId: string;
}

/**
 * Attempt limits: student requests for more attempts (per assessment type)
 * and the admin Assessment Attempt Management API. The server identifies the
 * student from the token; nothing here sends the caller's own id.
 */
export const attemptsService = {
    /** Student: ask for more attempts on an item they have used up. */
    request: async (item: AttemptItemRef, input: { reason: string; requestedCount: number }): Promise<AttemptRequest> => {
        const url = item.kind === 'PROBLEM_LOGIC'
            ? `/problem-courses/${encodeURIComponent(item.courseId)}/problems/${encodeURIComponent(item.itemId)}/attempt-requests`
            : `/structured-courses/${encodeURIComponent(item.courseId)}/my/questions/${encodeURIComponent(item.itemId)}/attempt-requests`;
        const res = await api.post(url, input);
        return res.data.data;
    },

    // ── Admin ──
    overview: async (): Promise<AttemptsOverview> => (await api.get('/admin/assessment-attempts/overview')).data.data,
    allowances: async (params: { q?: string; kind?: string; status?: string; approval?: string; page?: number; limit?: number }): Promise<Paged<AllowanceRow>> => {
        const res = await api.get('/admin/assessment-attempts/allowances', { params: clean(params) });
        return { data: res.data.data, meta: res.data.meta };
    },
    allowanceDetail: async (userId: string, item: AttemptItemRef): Promise<AllowanceDetail> =>
        (await api.get('/admin/assessment-attempts/allowances/detail', { params: { userId, ...item } })).data.data,
    grant: async (userId: string, item: AttemptItemRef, count: number, notes: string): Promise<AllowanceDetail> =>
        (await api.post('/admin/assessment-attempts/allowances/grant', { userId, ...item, count, notes })).data.data,
    requests: async (params: { status?: string; kind?: string; q?: string; page?: number; limit?: number }): Promise<Paged<AdminAttemptRequest>> => {
        const res = await api.get('/admin/assessment-attempts/requests', { params: clean(params) });
        return { data: res.data.data, meta: res.data.meta };
    },
    approve: async (requestId: string, grantCount: number, notes: string): Promise<AttemptRequest> =>
        (await api.post(`/admin/assessment-attempts/requests/${requestId}/approve`, { grantCount, notes })).data.data,
    reject: async (requestId: string, reason: string, notes: string): Promise<AttemptRequest> =>
        (await api.post(`/admin/assessment-attempts/requests/${requestId}/reject`, { reason, notes })).data.data,
};

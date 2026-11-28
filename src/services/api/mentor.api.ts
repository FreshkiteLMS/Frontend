import api from './axios';
import type {
    MentorAccess, MentorActivity, MentorCandidate, MentorDashboard, MentorDetail, MentorList, MentorMe, PermissionCatalog,
} from '@/types/mentor';

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);
const m = (id: string) => `/admin/mentors/${encodeURIComponent(id)}`;

/** Mentor management (administrators only — the API refuses everyone else). */
export const mentorAdminService = {
    catalog: () => data<PermissionCatalog>(api.get('/admin/mentors/permissions-catalog')),
    list: (q: { q?: string; status?: string; batchId?: string; page?: number; limit?: number }) => data<MentorList>(api.get('/admin/mentors', { params: q })),
    candidates: (q: string) => data<MentorCandidate[]>(api.get('/admin/mentors/candidates', { params: { q } })),
    create: (body: { userId?: string; name?: string; email?: string; phone?: string; password?: string } & Partial<MentorAccess>) =>
        data<{ mentor: MentorDetail; temporaryPassword: string | null }>(api.post('/admin/mentors', body)),
    get: (id: string) => data<MentorDetail>(api.get(m(id))),
    update: (id: string, body: { name?: string; email?: string; phone?: string | null }) => data<MentorDetail>(api.patch(m(id), body)),
    activate: (id: string) => data<MentorDetail>(api.post(`${m(id)}/activate`)),
    deactivate: (id: string) => data<MentorDetail>(api.post(`${m(id)}/deactivate`)),
    remove: (id: string) => data<{ removed: boolean; restoredRole: string | null }>(api.delete(m(id))),
    resetPassword: (id: string) => data<{ temporaryPassword: string }>(api.post(`${m(id)}/reset-password`)),
    saveAccess: (id: string, access: Partial<MentorAccess>) => data<MentorDetail>(api.put(`${m(id)}/access`, access)),
    activity: (id: string, page = 1) => data<MentorActivity>(api.get(`${m(id)}/activity`, { params: { page } })),
};

/** The signed-in mentor. */
export const mentorSelfService = {
    me: () => data<MentorMe>(api.get('/mentor/me')),
    dashboard: () => data<MentorDashboard>(api.get('/mentor/dashboard')),
};

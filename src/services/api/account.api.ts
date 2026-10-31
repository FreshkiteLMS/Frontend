import api from './axios';
import type {
    AccountOverview,
    DeletionRequestAdminView,
    GoalView,
    NotificationPrefs,
    Preferences,
    PrivacySettings,
    ProblemStats,
    ProfileDetails,
    ProfileView,
    SessionView,
    SkillEntry,
    TimelineEvent,
} from '@/types/profile';

function unwrap<T>(response: { data: { success: boolean; data: T; message?: string } }, fallback: string): T {
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || fallback);
}

/** Error text from an API failure (backend errors carry `error.message`). */
export function apiErrorMessage(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string };
    return e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || fallback;
}

export type ProfilePreview = 'public' | 'student';

export const profileService = {
    /** Signed-in view (or `preview` as a stranger / another student). */
    get: async (idOrUsername: string, preview?: ProfilePreview): Promise<ProfileView> => {
        const response = await api.get(`/profiles/${encodeURIComponent(idOrUsername)}`, { params: preview ? { as: preview } : undefined });
        return unwrap<ProfileView>(response, 'Failed to load profile');
    },
    /** Shareable link view; works signed out. */
    getPublic: async (username: string): Promise<ProfileView> => {
        const response = await api.get(`/public/profiles/${encodeURIComponent(username)}`);
        return unwrap<ProfileView>(response, 'Failed to load profile');
    },
    problems: async (idOrUsername: string, isPublic = false): Promise<ProblemStats> => {
        const response = await api.get(`/${isPublic ? 'public/profiles' : 'profiles'}/${encodeURIComponent(idOrUsername)}/problems`);
        return unwrap<ProblemStats>(response, 'Failed to load problem stats');
    },
    timeline: async (idOrUsername: string, page: number, isPublic = false): Promise<{ data: TimelineEvent[]; total: number; page: number; limit: number }> => {
        const response = await api.get(`/${isPublic ? 'public/profiles' : 'profiles'}/${encodeURIComponent(idOrUsername)}/timeline`, { params: { page, limit: 15 } });
        return unwrap(response, 'Failed to load activity');
    },
    modules: async (idOrUsername: string, courseId: string): Promise<{ course_id: string; modules: Array<{ title: string; total: number; completed: number }> }> => {
        const response = await api.get(`/profiles/${encodeURIComponent(idOrUsername)}/courses/${courseId}/modules`);
        return unwrap(response, 'Failed to load modules');
    },
};

export const accountService = {
    overview: async (): Promise<AccountOverview> => unwrap<AccountOverview>(await api.get('/account'), 'Failed to load settings'),

    updateAccount: async (dto: { name?: string; username?: string }) =>
        unwrap<{ id: string; name: string; username: string | null; email: string; role: string }>(await api.patch('/account', dto), 'Failed to update account'),

    usernameAvailable: async (username: string) =>
        unwrap<{ username: string; available: boolean; reason: string | null }>(await api.get('/account/username-available', { params: { username } }), 'Failed to check username'),

    changePassword: async (current_password: string, new_password: string) =>
        unwrap<{ changed: boolean; other_sessions_signed_out: number }>(await api.post('/account/password', { current_password, new_password }), 'Failed to change password'),

    updateProfile: async (dto: Partial<Omit<ProfileDetails, 'skills'>> & { skills?: SkillEntry[] }) =>
        unwrap<ProfileDetails>(await api.patch('/account/profile', dto), 'Failed to update profile'),

    updatePrivacy: async (dto: Partial<PrivacySettings>) => unwrap<PrivacySettings>(await api.patch('/account/privacy', dto), 'Failed to update privacy'),

    updatePreferences: async (dto: Partial<Preferences>) => unwrap<Preferences>(await api.patch('/account/preferences', dto), 'Failed to save preferences'),

    updateNotifications: async (dto: Record<string, boolean>) =>
        unwrap<NotificationPrefs>(await api.patch('/account/notifications', dto), 'Failed to save notification preferences'),

    sessions: async () => unwrap<SessionView[]>(await api.get('/account/sessions'), 'Failed to load sessions'),
    revokeSession: async (sid: string) => unwrap<{ revoked: boolean }>(await api.delete(`/account/sessions/${sid}`), 'Failed to sign out session'),
    revokeOtherSessions: async () => unwrap<{ revoked: number }>(await api.post('/account/sessions/revoke-others'), 'Failed to sign out other devices'),
    revokeAllSessions: async () => unwrap<{ revoked: number }>(await api.post('/account/sessions/revoke-all'), 'Failed to sign out everywhere'),

    goals: async () => unwrap<GoalView[]>(await api.get('/account/goals'), 'Failed to load goals'),
    createGoal: async (dto: { type: GoalView['type']; target?: number; course_id?: string; title?: string; deadline?: string | null }) =>
        unwrap<GoalView>(await api.post('/account/goals', dto), 'Failed to add goal'),
    removeGoal: async (id: string) => unwrap<{ removed: boolean }>(await api.delete(`/account/goals/${id}`), 'Failed to remove goal'),

    requestDeletion: async (password: string, reason: string) =>
        unwrap<{ id: string; status: string; created_at: string }>(await api.post('/account/deletion-request', { password, reason }), 'Failed to submit request'),
    cancelDeletion: async () => unwrap<{ cancelled: boolean }>(await api.delete('/account/deletion-request'), 'Failed to cancel request'),

    /** Download a JSON copy of the signed-in user's data. */
    exportData: async (): Promise<Blob> => {
        const response = await api.get('/account/export', { responseType: 'blob' });
        return response.data as Blob;
    },

    adminDeletionRequests: async (status = 'pending') =>
        unwrap<DeletionRequestAdminView[]>(await api.get('/account/admin/deletion-requests', { params: { status } }), 'Failed to load requests'),
    adminResolveDeletion: async (id: string, status: 'completed' | 'rejected') =>
        unwrap(await api.patch(`/account/admin/deletion-requests/${id}`, { status }), 'Failed to update request'),
};

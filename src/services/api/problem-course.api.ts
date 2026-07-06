import api from './axios';
import type {
    ProblemCourse,
    ImportResult,
    PreviewResult,
    SyncResult,
    UpdateStatusResult,
    ProblemStatus,
} from '@/types/problem-course';

/**
 * Client for the problem-solving template endpoints (/problem-courses).
 * Import/sync/publish are admin-only server-side; reading the tracker and
 * updating status work for any authenticated learner (the acting user is
 * resolved from the auth token on the server, not sent from here).
 */
export const problemCourseService = {
    /** Parse a sheet without saving — used to validate/preview before import. */
    preview: async (sheetUrl: string): Promise<PreviewResult> => {
        const response = await api.post('/problem-courses/preview', { sheetUrl });
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to parse sheet');
    },

    /** Create a problem-solving course from a Google Sheet. */
    import: async (payload: {
        title: string;
        description: string;
        coverImage?: string;
        sheetUrl: string;
        publish?: boolean;
        price?: number;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        group?: string;
    }): Promise<ImportResult> => {
        const response = await api.post('/problem-courses/import', payload);
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to import course');
    },

    /** Re-read the linked sheet (optionally a new URL), preserving student progress. */
    sync: async (courseId: string, sheetUrl?: string): Promise<SyncResult> => {
        const response = await api.post(`/problem-courses/${courseId}/sync`, sheetUrl ? { sheetUrl } : {});
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to sync course');
    },

    publish: async (courseId: string): Promise<{ id: string; status: string }> => {
        const response = await api.put(`/problem-courses/${courseId}/publish`);
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to publish course');
    },

    /** Tracker data (sections + problems) merged with the caller's progress. */
    getTracker: async (courseId: string): Promise<ProblemCourse> => {
        const response = await api.get(`/problem-courses/${courseId}`);
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to load tracker');
    },

    updateStatus: async (
        courseId: string,
        problemId: string,
        status: ProblemStatus
    ): Promise<UpdateStatusResult> => {
        const response = await api.patch(`/problem-courses/${courseId}/problems/${problemId}/status`, { status });
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to update status');
    },
};

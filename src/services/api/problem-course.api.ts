import api from './axios';
import type {
    ProblemCourse,
    ImportResult,
    PreviewResult,
    SyncResult,
    UpdateStatusResult,
    ProblemStatus,
    ProblemDetail,
    AdminProblemSection,
    ProblemStatement,
    VideoSolution,
    WorkbookPreview,
    LogicHistory,
    LogicAttemptDetail,
    LogicOverview,
    LogicAssessmentRow,
    AdminLogicDetail,
    ProblemStudentProgressRow,
    ProblemProgressSummary,
} from '@/types/problem-course';
import type { SpeakingAttempt } from '@/types/speaking';

/** A video as the admin editor sends it (id only for existing videos). */
export type VideoSolutionInput = Omit<VideoSolution, 'id' | 'updatedAt'> & { id?: string };

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

    // ── Problem detail & admin content ──
    getProblem: async (courseId: string, problemId: string): Promise<ProblemDetail> =>
        (await api.get(`/problem-courses/${courseId}/problems/${problemId}`)).data.data,
    adminProblems: async (courseId: string): Promise<AdminProblemSection[]> =>
        (await api.get(`/problem-courses/${courseId}/admin/problems`)).data.data,
    /** Replace a problem's statement and/or its complete video list (admin). */
    updateProblem: async (
        courseId: string,
        problemId: string,
        body: { statement?: ProblemStatement; videoSolutions?: VideoSolutionInput[] }
    ): Promise<ProblemDetail> => (await api.put(`/problem-courses/${courseId}/problems/${problemId}`, body)).data.data,

    // ── Structured Excel workbook ──
    /** The sample workbook, as a Blob to save. */
    downloadTemplate: async (): Promise<Blob> =>
        (await api.get('/problem-courses/workbook/template', { responseType: 'blob' })).data,
    previewWorkbook: async (file: File): Promise<WorkbookPreview> => {
        const form = new FormData();
        form.append('file', file);
        return (await api.post('/problem-courses/workbook/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },
    importWorkbook: async (file: File, fields: { title: string; description: string; coverImage?: string; publish?: boolean; price?: number; difficulty?: string; group?: string }): Promise<ImportResult> => {
        const form = new FormData();
        form.append('file', file);
        for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== '') form.append(k, String(v));
        return (await api.post('/problem-courses/workbook/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },
    syncWorkbook: async (courseId: string, file: File): Promise<SyncResult> => {
        const form = new FormData();
        form.append('file', file);
        return (await api.post(`/problem-courses/${courseId}/workbook/sync`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },

    // ── "Explain your approach" (student: own attempts only) ──
    logicHistory: async (courseId: string, problemId: string, page = 1, limit = 20): Promise<LogicHistory> =>
        (await api.get(`/problem-courses/${courseId}/problems/${problemId}/logic-attempts`, { params: { page, limit } })).data,
    createLogicAttempt: async (courseId: string, problemId: string, clientRequestId: string): Promise<SpeakingAttempt> =>
        (await api.post(`/problem-courses/${courseId}/problems/${problemId}/logic-attempts`, { clientRequestId, consent: true })).data.data,
    uploadLogicAudio: async (courseId: string, attemptId: string, blob: Blob, durationSeconds: number, onProgress?: (f: number) => void): Promise<SpeakingAttempt> => {
        const form = new FormData();
        form.append('durationSeconds', String(Math.round(durationSeconds * 10) / 10));
        const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        form.append('audio', blob, `explanation.${ext}`);
        const res = await api.post(`/problem-courses/${courseId}/logic-attempts/${attemptId}/audio`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120_000,
            onUploadProgress: e => { if (onProgress && e.total) onProgress(e.loaded / e.total); },
        });
        return res.data.data;
    },
    logicAttempt: async (courseId: string, attemptId: string): Promise<LogicAttemptDetail> =>
        (await api.get(`/problem-courses/${courseId}/logic-attempts/${attemptId}`)).data.data,
    retryLogicAttempt: async (courseId: string, attemptId: string): Promise<SpeakingAttempt> =>
        (await api.post(`/problem-courses/${courseId}/logic-attempts/${attemptId}/retry`)).data.data,

    // ── Admin: logic assessment results ──
    logicOverview: async (courseId: string): Promise<LogicOverview> =>
        (await api.get(`/problem-courses/${courseId}/logic-assessments/overview`)).data.data,
    logicAssessments: async (courseId: string, params: Record<string, string | number | undefined>): Promise<{ data: LogicAssessmentRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }> => {
        const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
        const res = await api.get(`/problem-courses/${courseId}/logic-assessments`, { params: clean });
        return { data: res.data.data, meta: res.data.meta };
    },
    logicAssessment: async (courseId: string, attemptId: string): Promise<AdminLogicDetail> =>
        (await api.get(`/problem-courses/${courseId}/logic-assessments/${attemptId}`)).data.data,
    /** Admin "Student progress": per-student tracker progress + logic results (scores out of 10). */
    studentProgress: async (courseId: string, params: Record<string, string | number | undefined>): Promise<{ data: ProblemStudentProgressRow[]; meta: { page: number; limit: number; total: number; totalPages: number }; summary: ProblemProgressSummary }> => {
        const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
        const res = await api.get(`/problem-courses/${courseId}/student-progress`, { params: clean });
        return { data: res.data.data, meta: res.data.meta, summary: res.data.summary };
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

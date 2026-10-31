import api from './axios';
import type {
    AdminAttemptDetail,
    AdminAttemptRow,
    AttemptDetail,
    QuestionAnalytics,
    QuestionHistory,
    ReviewDecision,
    SpeakingAttempt,
    SpeakingOverview,
    SpeakingReview,
    SpeakingSettings,
    SpeakingSummary,
    StudentAnalyticsRow,
    StudentSpeakingDetail,
} from '@/types/speaking';
import type { Paginated } from '@/types/structured-questions';

/**
 * Client for the AI speaking assessment endpoints under /structured-courses.
 * The server derives the student from the auth token; nothing here sends a
 * user id for the caller's own data. Recordings are uploaded once and never
 * fetched back — there is no playback endpoint.
 */

export type SpeakingQuery = Record<string, string | number | undefined>;
const clean = (p: SpeakingQuery = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''));
const base = (courseId: string) => `/structured-courses/${encodeURIComponent(courseId)}`;

export const speakingService = {
    // ── Student ──
    settings: async (courseId: string, questionId: string): Promise<SpeakingSettings> => {
        const res = await api.get(`${base(courseId)}/my/questions/${questionId}/speaking/settings`);
        return res.data.data;
    },
    summary: async (courseId: string): Promise<SpeakingSummary> => {
        let tz = 'UTC';
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { /* default */ }
        const res = await api.get(`${base(courseId)}/my/speaking/summary`, { params: { tz } });
        return res.data.data;
    },
    history: async (courseId: string, questionId: string, page = 1, limit = 20): Promise<QuestionHistory> => {
        const res = await api.get(`${base(courseId)}/my/questions/${questionId}/speaking-attempts`, { params: { page, limit } });
        return res.data;
    },
    /** Idempotent: the same clientRequestId always returns the same attempt. */
    createAttempt: async (courseId: string, questionId: string, clientRequestId: string): Promise<SpeakingAttempt> => {
        const res = await api.post(`${base(courseId)}/my/questions/${questionId}/speaking-attempts`, { clientRequestId, consent: true });
        return res.data.data;
    },
    uploadAudio: async (
        courseId: string,
        attemptId: string,
        blob: Blob,
        durationSeconds: number,
        onProgress?: (fraction: number) => void
    ): Promise<SpeakingAttempt> => {
        const form = new FormData();
        form.append('durationSeconds', String(Math.round(durationSeconds * 10) / 10));
        const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        form.append('audio', blob, `answer.${ext}`);
        const res = await api.post(`${base(courseId)}/my/speaking-attempts/${attemptId}/audio`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120_000,
            onUploadProgress: e => { if (onProgress && e.total) onProgress(e.loaded / e.total); },
        });
        return res.data.data;
    },
    attempt: async (courseId: string, attemptId: string): Promise<AttemptDetail> => {
        const res = await api.get(`${base(courseId)}/my/speaking-attempts/${attemptId}`);
        return res.data.data;
    },
    retry: async (courseId: string, attemptId: string): Promise<SpeakingAttempt> => {
        const res = await api.post(`${base(courseId)}/my/speaking-attempts/${attemptId}/retry`);
        return res.data.data;
    },

    // ── Instructor ──
    overview: async (courseId: string): Promise<SpeakingOverview> => {
        const res = await api.get(`${base(courseId)}/speaking/overview`);
        return res.data.data;
    },
    questionAnalytics: async (courseId: string, params: SpeakingQuery = {}): Promise<QuestionAnalytics[]> => {
        const res = await api.get(`${base(courseId)}/speaking/questions`, { params: clean(params) });
        return res.data.data;
    },
    students: async (courseId: string, params: SpeakingQuery): Promise<Paginated<StudentAnalyticsRow>> => {
        const res = await api.get(`${base(courseId)}/speaking/students`, { params: clean(params) });
        return res.data;
    },
    studentDetail: async (courseId: string, userId: string): Promise<StudentSpeakingDetail> => {
        const res = await api.get(`${base(courseId)}/speaking/students/${encodeURIComponent(userId)}`);
        return res.data.data;
    },
    attempts: async (courseId: string, params: SpeakingQuery): Promise<Paginated<AdminAttemptRow>> => {
        const res = await api.get(`${base(courseId)}/speaking/attempts`, { params: clean(params) });
        return res.data;
    },
    attemptDetail: async (courseId: string, attemptId: string): Promise<AdminAttemptDetail> => {
        const res = await api.get(`${base(courseId)}/speaking/attempts/${attemptId}`);
        return res.data.data;
    },
    review: async (courseId: string, attemptId: string, body: { decision: ReviewDecision; adjustedScore?: number | null; notes?: string }): Promise<SpeakingReview> => {
        const res = await api.post(`${base(courseId)}/speaking/attempts/${attemptId}/reviews`, body);
        return res.data.data;
    },
};

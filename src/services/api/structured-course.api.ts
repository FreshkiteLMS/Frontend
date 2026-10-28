import api from './axios';
import type {
    CourseProgressSummary,
    CourseQuestion,
    MySummary,
    Paginated,
    QuestionImport,
    QuestionStatus,
    StatusChangeResult,
    StudentProgressDetail,
    StudentProgressRow,
    StudentQuestion,
} from '@/types/structured-questions';

/**
 * Client for /structured-courses. Role and enrollment checks are enforced on the
 * server; the acting user always comes from the auth token, never from here.
 */

export type QueryParams = Record<string, string | number | undefined>;

const clean = (params: QueryParams = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));

const base = (courseId: string) => `/structured-courses/${encodeURIComponent(courseId)}`;

/** Server error message from an axios error, with a fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
    return e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || fallback;
}

export function apiErrorCode(err: unknown): string | undefined {
    return (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
}

/** `error.details` from a server error response, if any. */
export function apiErrorDetails<T = Record<string, unknown>>(err: unknown): T | undefined {
    return (err as { response?: { data?: { error?: { details?: T } } } })?.response?.data?.error?.details;
}

async function download(path: string, params: QueryParams, fallbackName: string) {
    const res = await api.get(path, { params: clean(params), responseType: 'blob' });
    const disposition = String(res.headers['content-disposition'] || '');
    const name = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackName;
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export const structuredCourseService = {
    // ── Imports (admin) ──
    previewFromSheet: async (courseId: string, sheetUrl: string): Promise<QuestionImport> => {
        const res = await api.post(`${base(courseId)}/question-imports/preview`, { sheetUrl });
        return res.data.data;
    },
    previewFromFile: async (courseId: string, file: File): Promise<QuestionImport> => {
        const form = new FormData();
        form.append('file', file);
        const res = await api.post(`${base(courseId)}/question-imports/preview`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.data;
    },
    commitImport: async (courseId: string, importId: string, acceptPartial: boolean): Promise<QuestionImport> => {
        const res = await api.post(`${base(courseId)}/question-imports/${importId}/commit`, { acceptPartial });
        return res.data.data;
    },
    listImports: async (courseId: string, page = 1, limit = 10): Promise<Paginated<QuestionImport>> => {
        const res = await api.get(`${base(courseId)}/question-imports`, { params: { page, limit } });
        return res.data;
    },
    downloadTemplate: (format: 'xlsx' | 'csv') =>
        download('/structured-courses/question-template', { format }, `structured-course-questions-template.${format}`),

    // ── Question management ──
    listQuestions: async (courseId: string, params: QueryParams): Promise<Paginated<CourseQuestion>> => {
        const res = await api.get(`${base(courseId)}/questions`, { params: clean(params) });
        return res.data;
    },
    updateQuestion: async (courseId: string, questionId: string, patch: Partial<CourseQuestion>): Promise<CourseQuestion> => {
        const res = await api.patch(`${base(courseId)}/questions/${questionId}`, patch);
        return res.data.data;
    },
    setQuestionActive: async (courseId: string, questionId: string, isActive: boolean): Promise<CourseQuestion> => {
        const res = await api.patch(`${base(courseId)}/questions/${questionId}/active`, { isActive });
        return res.data.data;
    },
    reorderQuestions: async (courseId: string, questionIds: string[]): Promise<void> => {
        await api.put(`${base(courseId)}/questions/order`, { questionIds });
    },
    moveQuestion: async (courseId: string, questionId: string, direction: 'up' | 'down'): Promise<{ moved: boolean }> => {
        const res = await api.put(`${base(courseId)}/questions/${questionId}/move`, { direction });
        return res.data.data;
    },

    // ── Current student ──
    myQuestions: async (courseId: string, params: QueryParams): Promise<Paginated<StudentQuestion>> => {
        const res = await api.get(`${base(courseId)}/my/questions`, { params: clean(params) });
        return res.data;
    },
    mySummary: async (courseId: string): Promise<MySummary> => {
        const res = await api.get(`${base(courseId)}/my/summary`);
        return res.data.data;
    },
    setMyStatus: async (courseId: string, questionId: string, status: QuestionStatus, expectedVersion: number): Promise<StatusChangeResult> => {
        const res = await api.put(`${base(courseId)}/my/questions/${questionId}/status`, { status, expectedVersion });
        return res.data.data;
    },

    // ── Instructor reporting & assessment ──
    progressSummary: async (courseId: string): Promise<CourseProgressSummary> => {
        const res = await api.get(`${base(courseId)}/progress/summary`);
        return res.data.data;
    },
    progressStudents: async (courseId: string, params: QueryParams): Promise<Paginated<StudentProgressRow> & { totalQuestions: number }> => {
        const res = await api.get(`${base(courseId)}/progress/students`, { params: clean(params) });
        return res.data;
    },
    studentDetail: async (courseId: string, userId: string): Promise<StudentProgressDetail> => {
        const res = await api.get(`${base(courseId)}/progress/students/${encodeURIComponent(userId)}`);
        return res.data.data;
    },
    assess: async (
        courseId: string,
        userId: string,
        questionId: string,
        body: { status: QuestionStatus; notes?: string | null; expectedVersion?: number }
    ): Promise<StatusChangeResult> => {
        const res = await api.put(`${base(courseId)}/progress/students/${encodeURIComponent(userId)}/questions/${questionId}`, body);
        return res.data.data;
    },
    exportCsv: (courseId: string) => download(`${base(courseId)}/progress/export.csv`, {}, 'question-progress.csv'),
};

import api from './axios';
import type {
    AdminAptitudeConcept,
    AdminAptitudeContent,
    AdminAptitudeQuestion,
    AptitudeAttemptRow,
    AptitudeConceptPage,
    AptitudeImportRun,
    AptitudeOverview,
    AptitudeProgressView,
    AptitudeVerification,
    DocumentCheck,
    AptitudeQuestionPage,
    AptitudeSubmitResult,
    BatchAptitude,
    QuestionInput,
    StudentAptitudeCourse,
    StudentAptitudeOverview,
} from '@/types/aptitude';

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);
const enc = encodeURIComponent;
const base = (courseId: string) => `/aptitude-courses/${enc(courseId)}`;

/** A per-submission id: retries of the same submission reuse it, so it is never counted twice. */
export function newRequestId(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) return `apt-${c.randomUUID()}`;
    return `apt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Aptitude course client. Students only ever receive questions without the
 * answer key; correctness is decided by the server from the option sent.
 */
export const aptitudeService = {
    // ── Student ──
    overview: (courseId: string) => data<AptitudeOverview>(api.get(base(courseId))),
    concept: (courseId: string, conceptId: string) => data<AptitudeConceptPage>(api.get(`${base(courseId)}/concepts/${enc(conceptId)}/questions`)),
    question: (courseId: string, questionId: string) => data<AptitudeQuestionPage>(api.get(`${base(courseId)}/questions/${enc(questionId)}`)),
    start: (courseId: string, questionId: string) => data<AptitudeProgressView>(api.post(`${base(courseId)}/questions/${enc(questionId)}/start`)),
    submit: (courseId: string, questionId: string, selectedOption: string, clientRequestId: string) =>
        data<AptitudeSubmitResult>(api.post(`${base(courseId)}/questions/${enc(questionId)}/attempts`, { selectedOption, clientRequestId })),
    attempts: (courseId: string, questionId: string) => data<AptitudeAttemptRow[]>(api.get(`${base(courseId)}/questions/${enc(questionId)}/attempts`)),

    // ── Admin: document link check, processing and verification ──
    validateDocument: (documentUrl: string) => data<DocumentCheck>(api.post('/aptitude-courses/documents/validate', { documentUrl })),
    verification: (courseId: string) => data<AptitudeVerification>(api.get(`${base(courseId)}/verification`)),
    verify: (courseId: string) => data<AptitudeVerification>(api.post(`${base(courseId)}/verify`)),
    startImport: (courseId: string, documentUrl?: string) => data<AptitudeImportRun>(api.post(`${base(courseId)}/imports`, documentUrl ? { documentUrl } : {})),
    latestImport: (courseId: string) => data<AptitudeImportRun | null>(api.get(`${base(courseId)}/imports/latest`)),
    applyImport: (courseId: string, importId: string, deactivateMissing: boolean) =>
        data<AptitudeImportRun>(api.post(`${base(courseId)}/imports/${enc(importId)}/apply`, { deactivateMissing })),
    discardImport: (courseId: string, importId: string) => data<AptitudeImportRun>(api.delete(`${base(courseId)}/imports/${enc(importId)}`)),

    // ── Admin: content ──
    content: (courseId: string) => data<AdminAptitudeContent>(api.get(`${base(courseId)}/admin/content`)),
    createConcept: (courseId: string, body: { title: string; description?: string }) => data<AdminAptitudeConcept>(api.post(`${base(courseId)}/concepts`, body)),
    updateConcept: (courseId: string, conceptId: string, body: { title?: string; description?: string; isActive?: boolean }) =>
        data<AdminAptitudeConcept>(api.put(`${base(courseId)}/concepts/${enc(conceptId)}`, body)),
    deleteConcept: (courseId: string, conceptId: string) => data<{ deleted: boolean; archived: boolean }>(api.delete(`${base(courseId)}/concepts/${enc(conceptId)}`)),
    reorderConcepts: (courseId: string, conceptIds: string[]) => data<{ order: string[] }>(api.put(`${base(courseId)}/concepts/order`, { conceptIds })),
    createQuestion: (courseId: string, conceptId: string, body: QuestionInput) => data<AdminAptitudeQuestion>(api.post(`${base(courseId)}/concepts/${enc(conceptId)}/questions`, body)),
    updateQuestion: (courseId: string, questionId: string, body: Partial<QuestionInput> & { markReviewed?: boolean }) => data<AdminAptitudeQuestion>(api.put(`${base(courseId)}/questions/${enc(questionId)}`, body)),
    deleteQuestion: (courseId: string, questionId: string) => data<{ deleted: boolean; deactivated: boolean }>(api.delete(`${base(courseId)}/questions/${enc(questionId)}`)),
    reorderQuestions: (courseId: string, conceptId: string, questionIds: string[]) =>
        data<{ order: string[] }>(api.put(`${base(courseId)}/concepts/${enc(conceptId)}/questions/order`, { questionIds })),

    // ── Admin analytics ──
    studentOverview: (studentId: string) => data<StudentAptitudeOverview>(api.get(`/admin/students/${enc(studentId)}/aptitude`)),
    studentCourse: (studentId: string, courseId: string) => data<StudentAptitudeCourse>(api.get(`/admin/students/${enc(studentId)}/aptitude/${enc(courseId)}`)),
    batch: (batchId: string, q: { courseId?: string; conceptId?: string }) =>
        data<BatchAptitude>(api.get(`/admin/batches/${enc(batchId)}/aptitude`, { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) })),
};

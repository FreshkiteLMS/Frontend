/**
 * Structured Course template — imported audio/interview questions and
 * assignments, plus per-student progress. Mirrors the backend contract in
 * Backend/docs/structured-course.md; status values are canonical UPPER_SNAKE.
 */

export const STRUCTURED_COURSE_TEMPLATE = 'structured-course';

export type QuestionType = 'audio_question' | 'assignment';
export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuestionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PASS' | 'FAIL';

export const QUESTION_STATUSES: QuestionStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PASS', 'FAIL'];

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
    NOT_STARTED: 'Not started',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    PASS: 'Passed',
    FAIL: 'Failed',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    audio_question: 'Audio question',
    assignment: 'Assignment',
};

export interface CourseQuestion {
    id: string;
    courseId: string;
    externalId: string;
    type: QuestionType;
    title: string;
    prompt: string;
    topic: string | null;
    difficulty: QuestionDifficulty | null;
    expectedDurationMinutes: number | null;
    resourceUrl: string | null;
    evaluationCriteria: string | null;
    dueDate: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface QuestionProgress {
    status: QuestionStatus;
    version: number;
    updatedAt: string | null;
    updatedByRole: string | null;
    assessmentNotes: string | null;
    assessedAt: string | null;
    allowedStudentStatuses?: QuestionStatus[];
}

export interface StudentQuestion extends CourseQuestion {
    progress: QuestionProgress;
}

export interface Paginated<T> {
    data: T[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    topics?: string[];
}

export interface ProgressMetrics {
    total: number;
    counts: Record<QuestionStatus, number>;
    attempted: number;
    finished: number;
    assessed: number;
    percentAttempted: number;
    percentFinished: number;
    percentPassed: number;
}

export interface MySummary {
    overall: ProgressMetrics;
    byType: Record<QuestionType, ProgressMetrics>;
}

export interface ImportRowError {
    row: number;
    field?: string;
    message: string;
}

export interface ImportRow {
    row: number;
    external_question_id: string;
    external_id_provided: boolean;
    question_type: QuestionType;
    title: string;
    prompt: string;
    topic: string | null;
    difficulty: QuestionDifficulty | null;
    expected_duration_minutes: number | null;
    resource_url: string | null;
    evaluation_criteria: string | null;
    due_date: string | null;
    display_order: number | null;
    action: 'insert' | 'update' | 'unchanged';
}

export interface ImportSummary {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows: number;
    empty_rows: number;
    to_insert: number;
    to_update: number;
    unchanged: number;
}

export interface QuestionImport {
    id: string;
    courseId: string;
    sourceType: 'google_sheet' | 'file_upload';
    sourceRef: string;
    sheetName: string | null;
    status: 'previewed' | 'committing' | 'committed' | 'failed';
    summary: ImportSummary;
    errors: ImportRowError[];
    unmappedColumns: string[];
    result: { inserted: number; updated: number; unchanged: number } | null;
    failureMessage: string | null;
    initiatedBy: string;
    committedBy: string | null;
    committedAt: string | null;
    createdAt: string;
    rows?: ImportRow[];
    alreadyCommitted?: boolean;
}

export interface StudentProgressRow {
    userId: string;
    name: string;
    email: string | null;
    completion: 'not_started' | 'in_progress' | 'finished';
    overall: ProgressMetrics;
    audio: ProgressMetrics;
    assignment: ProgressMetrics;
    lastActivity: string | null;
}

export interface CourseProgressSummary {
    courseId: string;
    courseTitle: string;
    totalStudents: number;
    totalQuestions: number;
    questionsByType: Record<QuestionType, number>;
    statusTotals: Record<QuestionStatus, number>;
    studentsStarted: number;
    studentsFinished: number;
    averagePercentFinished: number;
    percentPairsFinished: number;
    percentPairsPassed: number;
    lastActivity: string | null;
}

export interface ProgressEvent {
    id: string;
    questionId: string;
    fromStatus: QuestionStatus;
    toStatus: QuestionStatus;
    actorId: string;
    actorRole: string;
    kind: 'self_update' | 'assessment' | 'override';
    notes: string | null;
    createdAt: string;
}

export interface StudentProgressDetail {
    student: { userId: string; name: string; email: string | null };
    metrics: { overall: ProgressMetrics; audio: ProgressMetrics; assignment: ProgressMetrics; lastActivity: string | null };
    questions: (CourseQuestion & { progress: QuestionProgress })[];
    history: ProgressEvent[];
}

export interface StatusChangeResult extends QuestionProgress {
    questionId: string;
    studentUserId: string;
    changed: boolean;
}

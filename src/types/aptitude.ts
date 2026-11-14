export const APTITUDE_TEMPLATE = 'aptitude';

export type AptitudeWorkflow = 'not_started' | 'in_progress' | 'completed';
export type AptitudeResult = 'not_evaluated' | 'pass' | 'fail';
export type AptitudeDifficulty = 'easy' | 'medium' | 'hard';
export interface AptitudeOption { id: string; text: string }

/** Every count/percentage the server computes (aptitudeStats.ts). Percentages are null when there is no data. */
export interface AptitudeCounts {
    total: number;
    attempted: number;
    inProgress: number;
    completed: number;
    passed: number;
    failed: number;
    remaining: number;
    attempts: number;
    correctAttempts: number;
    incorrectAttempts: number;
    firstAttemptCorrect: number;
    progress: number;
    accuracy: number | null;
    firstAttemptAccuracy: number | null;
    lastActivityAt: string | null;
}

export interface AptitudeConceptStats extends AptitudeCounts { conceptId: string; title: string; order: number; description?: string }

export interface AptitudeQuestionRef {
    questionId: string;
    conceptId: string;
    conceptTitle: string;
    preview: string;
    result: AptitudeResult;
    attempts: number;
    lastAttemptAt: string | null;
}

export interface AptitudeOverview {
    course: { id: string; title: string; description: string; thumbnailUrl: string | null };
    totals: AptitudeCounts & { concepts: number };
    concepts: AptitudeConceptStats[];
    insights: {
        strongestConcept: { conceptId: string; title: string; accuracy: number; attempts: number } | null;
        weakestConcept: { conceptId: string; title: string; accuracy: number; attempts: number } | null;
        mostIncorrect: { conceptId: string; title: string; incorrectAttempts: number } | null;
        note: string | null;
        recentlyCompleted: AptitudeQuestionRef[];
        needsPractice: AptitudeQuestionRef[];
    };
}

export interface AptitudeProgressView {
    workflowStatus: AptitudeWorkflow;
    latestResult: AptitudeResult;
    firstAttemptResult: AptitudeResult;
    attempts: number;
    lastAttemptAt: string | null;
    completedAt: string | null;
}

export interface AptitudeQuestionRow extends AptitudeProgressView { id: string; number: number; preview: string; difficulty: AptitudeDifficulty | null }

export interface AptitudeConceptPage {
    course: { id: string; title: string };
    concept: { id: string; title: string; description: string };
    stats: AptitudeCounts;
    questions: AptitudeQuestionRow[];
}

export interface AptitudeEvaluation {
    attemptId: string;
    attemptNumber: number;
    selectedOption: string;
    isCorrect: boolean;
    result: 'pass' | 'fail';
    correctOption: string;
    explanation: string;
    submittedAt: string;
    questionChangedSince: boolean;
}

export interface AptitudeQuestionPage {
    course: { id: string; title: string };
    concept: { id: string; title: string };
    question: { id: string; number: number; totalInConcept: number; questionText: string; options: AptitudeOption[]; difficulty: AptitudeDifficulty | null; answerable: boolean };
    previousId: string | null;
    nextId: string | null;
    progress: AptitudeProgressView;
    review: AptitudeEvaluation | null;
}

export type AptitudeSubmitResult = AptitudeEvaluation & { progress: AptitudeProgressView; replayed: boolean };

export interface AptitudeAttemptRow {
    attemptNumber: number;
    selectedOption: string;
    selectedOptionText: string;
    isCorrect: boolean;
    correctOption: string;
    submittedAt: string;
    questionChangedSince?: boolean;
}

// ── Admin ──

/** valid = ready for students; needs_review = flagged, admin must check; invalid = cannot be shown (no answer / options). */
export type QuestionCheck = 'valid' | 'needs_review' | 'invalid';

export interface AdminAptitudeQuestion {
    id: string;
    status: QuestionCheck;
    /** missing_answer, missing_options, duplicate, ambiguous_answer, answer_unverified, wording_mismatch, … */
    issues: string[];
    reviewCodes: string[];
    conceptId: string;
    questionText: string;
    options: AptitudeOption[];
    correctOption: string | null;
    explanation: string;
    difficulty: AptitudeDifficulty | null;
    order: number;
    isActive: boolean;
    needsReview: boolean;
    reviewReasons: string[];
    version: number;
    source: 'ai_import' | 'manual';
    attempts: number;
    students: number;
    updatedAt: string | null;
}

export interface AdminAptitudeConcept {
    id: string;
    title: string;
    description: string;
    order: number;
    isActive: boolean;
    questionCount: number;
    activeQuestionCount: number;
    questions: AdminAptitudeQuestion[];
}

export interface AptitudeVerification {
    verified: boolean;
    verifiedAt: string | null;
    blockers: { code: string; message: string; count?: number }[];
    summary: { concepts: number; questions: number; valid: number; needsReview: number; invalid: number; visible: number };
}

export interface DocumentCheck { url: string; documentId: string; title: string; accessible: boolean }

export interface AdminAptitudeContent {
    course: { id: string; title: string; status: string };
    verification: AptitudeVerification;
    totals: { concepts: number; questions: number; activeQuestions: number; needsReview: number; withoutAnswer: number };
    concepts: AdminAptitudeConcept[];
}

export interface AptitudeImportRun {
    id: string;
    status: 'fetching_document' | 'processing' | 'validating_output' | 'completed' | 'failed' | 'applied' | 'discarded';
    /** Applied by the run itself because the course had no questions yet. */
    autoApplied: boolean;
    active: boolean;
    documentUrl: string;
    documentTitle: string;
    chunksTotal: number;
    chunksDone: number;
    model: string | null;
    stats: { concepts: number; questions: number; needs_review: number; duplicates_removed: number };
    warnings: string[];
    error: { code: string; message: string } | null;
    applyResult: Record<string, number> | null;
    startedAt: string;
    finishedAt: string | null;
    appliedAt: string | null;
    concepts: {
        key: string;
        title: string;
        description: string;
        questions: { key: string; questionText: string; options: AptitudeOption[]; correctOption: string | null; explanation: string; difficulty: AptitudeDifficulty | null; needsReview: boolean; reviewReasons: string[]; reviewCodes: string[] }[];
    }[];
}

export interface QuestionInput {
    questionText: string;
    options: string[];
    correctOption: string | null;
    explanation: string;
    difficulty: AptitudeDifficulty | null;
    isActive: boolean;
    conceptId?: string;
}

// ── Admin analytics ──

export interface StudentAptitudeOverview {
    userId: string;
    courses: (AptitudeCounts & { courseId: string; title: string; status: string; thumbnailUrl: string | null; concepts: number })[];
    totals: AptitudeCounts & { courses: number; concepts: number };
    definitions: Record<string, string>;
}

export interface StudentAptitudeCourse {
    course: { id: string; title: string; status: string };
    totals: AptitudeCounts & { concepts: number };
    concepts: (AptitudeConceptStats & {
        questions: {
            id: string; number: number; questionText: string; difficulty: AptitudeDifficulty | null;
            workflowStatus: AptitudeWorkflow; latestResult: AptitudeResult; firstAttemptResult: AptitudeResult;
            attempts: number; lastAttemptAt: string | null; history: AptitudeAttemptRow[];
        }[];
    })[];
}

export interface BatchAptitudeStudent extends AptitudeCounts { userId: string; name?: string; email?: string; studentCode?: string | null }
export interface BatchAptitudeConcept {
    conceptId: string; title: string; courseId: string | null; questions: number; attempts: number;
    accuracy: number | null; firstAttemptAccuracy: number | null; averageCompletion: number | null; studentsAnswered: number;
}
export interface BatchAptitude {
    batch: { id: string; name: string };
    courses: { id: string; title: string; status: string }[];
    concepts: { id: string; title: string; courseId: string }[];
    filters: { courseId: string | null; conceptId: string | null };
    summary: {
        members: number; eligibleStudents: number; studentsStarted: number; questions: number;
        averageCompletion: number | null; averageAccuracy: number | null; averageFirstAttemptAccuracy: number | null; overallAccuracy: number | null;
    };
    highestConcepts: BatchAptitudeConcept[];
    lowestConcepts: BatchAptitudeConcept[];
    conceptPerformance: BatchAptitudeConcept[];
    notStarted: { userId: string; name?: string; email?: string; studentCode?: string | null }[];
    needsImprovement: { userId: string; name?: string; email?: string; completed: number; accuracy: number | null }[];
    students: BatchAptitudeStudent[];
    definitions: Record<string, string>;
}

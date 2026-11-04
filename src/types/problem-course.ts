// Types for the Problem-Solving (DSA tracker) course template.

export type ProblemStatus = 'not_started' | 'try' | 'completed' | 'pass' | 'fail';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
    not_started: 'Not Started',
    try: 'Try',
    completed: 'Completed',
    pass: 'Pass',
    fail: 'Fail',
};

export const PROBLEM_STATUS_ORDER: ProblemStatus[] = ['not_started', 'try', 'completed', 'pass', 'fail'];

export interface TrackerProblem {
    id: string;
    title: string;
    difficulty: Difficulty;
    solutionUrl: string | null;
    videoUrl: string | null;
    problemUrl: string | null;
    tags: string[];
    order: number;
    externalId: string | null;
    defaultStatus: string;
    userStatus: ProblemStatus;
    /** The problem has a statement to read (opens the problem panel). */
    hasStatement?: boolean;
    /** Published video languages, default first. */
    videoLanguages?: string[];
    /** Published videos, including several in one language. */
    videoCount?: number;
    completed: boolean;
    attempts: number;
    completedAt: string | null;
    lastViewed: string | null;
}

export interface TrackerSection {
    id: string;
    title: string;
    icon: string;
    order: number;
    problems: TrackerProblem[];
}

export interface ProblemCourse {
    id: string;
    title: string;
    description: string;
    coverImage: string | null;
    templateType: string;
    status: string;
    sheet: { url: string; lastSyncedAt: string | null; warnings: string[] } | null;
    upload?: { fileName: string; lastImportedAt: string; warnings: string[] } | null;
    sections: TrackerSection[];
}

export interface ParseStats {
    sectionCount: number;
    problemCount: number;
    duplicatesSkipped: number;
    sectionsMerged: number;
    invalidUrlsSkipped: number;
    difficultyDefaulted: number;
}

export interface ImportResult {
    course: { id?: string; _id?: string; title: string; status: string };
    warnings: string[];
    stats: ParseStats;
}

/** Google Sheet preview: same shape as an uploaded workbook preview. */
export interface PreviewResult extends WorkbookPreview {
    spreadsheetId: string;
}

export interface SyncResult {
    course: { id: string; title: string } | null;
    warnings: string[];
    stats: ParseStats;
    summary: { added: number; removed: number; retained: number; total: number };
}

export interface UpdateStatusResult {
    problemId: string;
    status: ProblemStatus;
    attempts: number;
    completed: boolean;
    completedAt: string | null;
    lastViewed: string | null;
}

// ── Problem detail: statement + multilingual video solutions ──────────────

export interface ProblemExample {
    input: string;
    output: string;
    explanation: string;
}

export interface ProblemStatement {
    description: string;
    constraints: string;
    examples: ProblemExample[];
    solution_approach: string;
    time_complexity: string;
    space_complexity: string;
}

export type VideoStatus = 'published' | 'draft';
/** 'explanation' teaches the concept; 'solution' walks through the answer. */
export type VideoType = 'explanation' | 'solution';

export interface VideoSolution {
    id: string;
    title: string;
    languageCode: string;
    languageName: string;
    url: string;
    description: string;
    isDefault: boolean;
    videoType?: VideoType;
    /** Admin views only. */
    status?: VideoStatus;
    updatedAt?: string;
}

export interface ProblemDetail {
    id: string;
    courseId: string;
    title: string;
    difficulty: Difficulty;
    section: { id: string; title: string };
    tags: string[];
    externalId: string | null;
    problemUrl: string | null;
    solutionUrl: string | null;
    statement: ProblemStatement;
    videoSolutions: VideoSolution[];
    /** Older single link from the sheet, shown when there is no video list. */
    legacyVideoUrl: string | null;
}

export interface AdminProblemSection {
    id: string;
    title: string;
    problems: {
        id: string;
        title: string;
        difficulty: Difficulty;
        externalId: string | null;
        hasStatement: boolean;
        legacyVideoUrl: string | null;
        videoSolutions: VideoSolution[];
    }[];
}

// ── Structured workbook import ────────────────────────────────────────────

export interface WorkbookRowError {
    sheet: string;
    row: number | null;
    column: string | null;
    message: string;
}

export interface WorkbookPreview {
    format: 'structured' | 'legacy';
    errors: WorkbookRowError[];
    warnings: string[];
    stats: ParseStats;
    hasVideoSheet: boolean;
    sections: { title: string; icon: string; problemCount: number }[];
    problems: {
        problemId: string | null;
        title: string;
        category: string;
        difficulty: Difficulty;
        hasDescription: boolean;
        videos: { language: string; isDefault: boolean; status: VideoStatus }[];
    }[];
}

// ── "Explain your approach" AI logic assessment ───────────────────────────

export type LogicVerdict = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' | 'Poor';

export interface LogicCategoryScore {
    category: string;
    label: string;
    applicable: boolean;
    score: number | null;
    maxScore: number;
    weight: number;
    feedback: string;
}

export interface LogicReport {
    id: string;
    overallScore: number;
    maxScore: number;
    verdict: LogicVerdict;
    capped: boolean;
    approachVerdict: 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'NOT_EXPLAINED' | null;
    identifiedApproach: string;
    statedTimeComplexity: string;
    statedSpaceComplexity: string;
    categoryScores: LogicCategoryScore[];
    strengths: string[];
    improvements: string[];
    missingConcepts: string[];
    misconceptions: { statement: string; correction: string }[];
    correctApproach: string;
    finalFeedback: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    usedReferenceSolution: boolean;
    usedProblemStatement: boolean;
    metadata: { evaluationModel: string; transcriptionModel: string; promptVersion: string; rubricVersion: string; createdAt: string };
}

export interface LogicAttemptDetail extends Omit<import('./speaking').SpeakingAttempt, 'performanceLevel'> {
    performanceLevel: LogicVerdict | null;
    problem: { id: string; title: string; difficulty: Difficulty | null; category?: string | null } | null;
    report: LogicReport | null;
}

export interface LogicHistory extends Omit<import('./speaking').QuestionHistory, 'data'> {
    data: (Omit<import('./speaking').SpeakingAttempt, 'performanceLevel'> & { performanceLevel: LogicVerdict | null })[];
}

export interface AdminLogicDetail extends LogicAttemptDetail {
    student: { userId: string; name: string; email: string; studentCode: string | null };
}

export interface LogicOverview {
    studentsAttempted: number;
    totalSubmitted: number;
    completed: number;
    pending: number;
    failed: number;
    averageScore: number | null;
}

/** Admin Student progress row for a Problem Solving course. Scores are out of 10. */
export interface ProblemStudentProgressRow {
    userId: string;
    name: string;
    email: string;
    studentCode: string | null;
    problems: { total: number; solved: number; attempted: number; percentSolved: number };
    logic: {
        attempts: number;
        completed: number;
        problemsExplained: number;
        averageScore: number | null;
        bestScore: number | null;
        latestScore: number | null;
    };
    lastActivity: string | null;
}

export interface ProblemProgressSummary {
    students: number;
    active: number;
    totalProblems: number;
    averageSolvedPercent: number;
    studentsExplained: number;
    averageLogicScore: number | null;
}

export interface LogicAssessmentRow {
    attemptId: string;
    attemptNumber: number;
    student: { userId: string; name: string; email: string; studentCode: string | null };
    problem: { id: string; title: string; category: string | null };
    status: import('./speaking').SpeakingAttemptStatus;
    score: number | null;
    verdict: LogicVerdict | null;
    errorCode: string | null;
    submittedAt: string;
    completedAt: string | null;
}

export type ProblemPanelTab = 'problem' | 'video' | 'explain';
/** Open a problem on a tab (tracker rows). 'video' opens the video player; the others the problem panel. */
export type OpenProblemHandler = (problem: TrackerProblem, tab?: ProblemPanelTab) => void;

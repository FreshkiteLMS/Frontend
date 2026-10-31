/**
 * AI speaking assessment — mirrors Backend/docs/speaking-assessment.md.
 * Recordings are never retained, so no type here carries audio or a URL to it.
 */

export type SpeakingAttemptStatus = 'UPLOADING' | 'UPLOADED' | 'TRANSCRIBING' | 'EVALUATING' | 'COMPLETED' | 'FAILED';
export type PerformanceLevel = 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT';
export type ReviewDecision = 'CONFIRMED' | 'FLAGGED_INCORRECT' | 'SCORE_ADJUSTED';

export interface SpeakingSettings {
    maxRecordingSeconds: number;
    minRecordingSeconds: number;
    maxAudioBytes: number;
    consentNoticeVersion: string;
    audioRetentionMinutes: number;
}

export interface SpeakingAttemptError {
    code: string;
    message: string;
    stage: 'upload' | 'transcription' | 'evaluation' | null;
    willRetry: boolean;
    canRetry: boolean;
}

export interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
    uncertain: boolean;
}

export interface AudioMetrics {
    totalDurationSeconds: number;
    speakingDurationSeconds: number;
    wordCount: number;
    wordsPerMinute: number | null;
    longPauseCount: number;
    longestPauseSeconds: number;
}

export interface SpeakingAttempt {
    id: string;
    courseId: string;
    questionId: string;
    attemptNumber: number | null;
    status: SpeakingAttemptStatus;
    processing: boolean;
    overallScore: number | null;
    performanceLevel: PerformanceLevel | null;
    error: SpeakingAttemptError | null;
    nextRetryAt: string | null;
    audio: { received: boolean; durationSeconds: number | null; deleted: boolean; deletedAt: string | null };
    transcriptLanguage: string | null;
    transcript?: { text: string; language: string | null; durationSeconds: number | null; lowConfidence: boolean; segments: TranscriptSegment[] } | null;
    audioMetrics?: AudioMetrics | null;
    latestReview: { decision: ReviewDecision; adjustedScore: number | null; reviewedAt: string } | null;
    submittedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CategoryScore {
    category: string;
    label: string;
    applicable: boolean;
    score: number | null;
    maxScore: number;
    weight: number;
    feedback: string;
}

export interface SpeakingReport {
    id: string;
    overallScore: number;
    maxScore: number;
    performanceLevel: PerformanceLevel;
    answerRelevance: 'ON_TOPIC' | 'PARTIALLY_ON_TOPIC' | 'OFF_TOPIC' | 'NO_ANSWER' | null;
    summary: string;
    scoreRationale: string;
    adjustments: string[];
    confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; limitations: string[] };
    categoryScores: CategoryScore[];
    strengths: { title: string; description: string; evidence: string }[];
    missedConcepts: { concept: string; description: string; importance: 'HIGH' | 'MEDIUM' | 'LOW'; whyItMatters: string; suggestion: string }[];
    incorrectInformation: { statement: string; explanation: string; correction: string }[];
    improvements: { title: string; description: string }[];
    idealAnswer: string;
    communicationFeedback: {
        clarity: 'CLEAR' | 'MOSTLY_CLEAR' | 'UNCLEAR';
        structure: 'GOOD' | 'FAIR' | 'POOR';
        repetition: 'NONE' | 'SOME' | 'EXCESSIVE';
        feedback: string;
        languageFeedback: string;
        deliveryFeedback: string;
    } | null;
    usedReferenceAnswer: boolean;
    usedEvaluationCriteria: boolean;
    metadata: { evaluationModel: string; transcriptionModel: string; promptVersion: string; rubricVersion: string; createdAt: string };
}

export interface AttemptDetail extends SpeakingAttempt {
    question: { id: string; title: string; prompt: string; topic: string | null; difficulty: string | null } | null;
    report: SpeakingReport | null;
    review: { decision: ReviewDecision; adjustedScore: number | null; notes: string; createdAt: string } | null;
}

export interface AttemptStats {
    totalAttempts: number;
    completedAttempts: number;
    latestScore: number | null;
    bestScore: number | null;
    averageScore: number | null;
    firstScore: number | null;
    improvement: number | null;
    lastPracticedAt: string | null;
}

export interface QuestionHistory {
    data: SpeakingAttempt[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    stats: AttemptStats;
    activeAttemptId: string | null;
    settings: SpeakingSettings | null;
    scoreHistory: { attemptNumber: number; score: number; completedAt: string }[];
}

export interface QuestionPracticeStats extends AttemptStats {
    latestStatus: SpeakingAttemptStatus;
    latestAttemptId: string;
    latestErrorCode: string | null;
    lastActivity: string;
}

export interface SpeakingSummary {
    totals: {
        audioQuestions: number;
        questionsAttempted: number;
        questionsNotAttempted: number;
        totalAttempts: number;
        completedAttempts: number;
        averageScore: number | null;
        bestScore: { score: number; questionId: string; title: string | null } | null;
        completionPercent: number;
        lastActivity: string | null;
    };
    activity: { today: number; daysPracticedLast7: number; trend: { date: string; attempts: number; averageScore: number; bestScore: number }[] };
    recent: { attemptId: string; questionId: string; questionTitle: string | null; attemptNumber: number; status: SpeakingAttemptStatus; overallScore: number | null; performanceLevel: PerformanceLevel | null; at: string }[];
    byQuestion: Record<string, QuestionPracticeStats>;
    suggestions: { questionId: string; title: string; topic: string | null; reason: 'LOW_SCORE' | 'NOT_ATTEMPTED'; latestScore: number | null }[];
}

// ── Instructor ──

export interface SpeakingOverview {
    courseId: string;
    courseTitle: string;
    enrolledStudents: number;
    studentsAttempted: number;
    studentsNotAttempted: number;
    /** Enrolled students who submitted at least one recording in the last 7 days. */
    activeStudents7d: number;
    /** Completed assessments per UTC day, last 30 days (days without any are omitted). */
    activity: { date: string; attempts: number; averageScore: number | null }[];
    /** Score distribution across every assessment. */
    distribution: { range: string; count: number }[];
    notAttemptedSample: { userId: string; name: string; email: string | null }[];
    audioQuestions: number;
    questionsWithReferenceAnswer: number;
    totalAttempts: number;
    completedAttempts: number;
    failedAttempts: number;
    averageScore: number | null;
    highestScore: number | null;
    lastActivity: string | null;
    lowPerformingQuestions: { questionId: string; title: string; averageScore: number; attempts: number; students: number }[];
    recentActivity: { attemptId: string; userId: string; studentName: string; questionId: string; questionTitle: string; attemptNumber: number; status: SpeakingAttemptStatus; overallScore: number | null; at: string }[];
}

export interface QuestionAnalytics {
    questionId: string;
    title: string;
    topic: string | null;
    difficulty: string | null;
    isActive: boolean;
    hasReferenceAnswer: boolean;
    attempts: number;
    uniqueStudents: number;
    averageScore: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    distribution: { range: string; count: number }[];
    commonlyMissedConcepts: { concept: string; count: number }[];
}

export interface StudentAnalyticsRow {
    userId: string;
    name: string;
    email: string | null;
    questionsAttempted: number;
    totalQuestions: number;
    totalAttempts: number;
    averageScore: number | null;
    highestScore: number | null;
    latestScore: number | null;
    improvement: number | null;
    lastActivity: string | null;
}

export interface AdminAttemptRow extends SpeakingAttempt {
    userId: string;
    studentName: string;
    studentEmail: string | null;
    questionTitle: string;
}

export interface SpeakingReview {
    id: string;
    decision: ReviewDecision;
    originalScore: number | null;
    adjustedScore: number | null;
    notes: string;
    reviewerId: string;
    reviewerRole: string;
    reviewerName: string | null;
    createdAt: string;
}

export interface AdminAttemptDetail extends SpeakingAttempt {
    student: { userId: string; name: string; email: string | null };
    question: { id: string; title: string; prompt: string; topic: string | null; difficulty: string | null; expectedAnswer: string | null; keyConcepts: string[]; evaluationCriteria: string | null } | null;
    report: SpeakingReport | null;
    reviews: SpeakingReview[];
    processingMeta: {
        transcriptionAttempts: number;
        evaluationAttempts: number;
        transcriptionModel: string | null;
        statusHistory: { status: string; at: string }[];
        consentNoticeVersion: string;
        consentAt: string;
        audioMimeType: string | null;
        audioSizeBytes: number | null;
        audioDeletionReason: string | null;
    };
}

export interface StudentSpeakingDetail {
    student: { userId: string; name: string; email: string | null; enrolled: boolean };
    questions: {
        questionId: string;
        title: string;
        topic: string | null;
        isActive: boolean;
        attempts: SpeakingAttempt[];
        latestScore: number | null;
        bestScore: number | null;
        latestMissedConcepts: string[];
        latestImprovements: string[];
    }[];
}

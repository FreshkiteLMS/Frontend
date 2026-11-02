/**
 * Attempt limits shared by course audio questions and Problem Solving logic
 * assessments (Backend: services/assessmentAttempts). The server enforces
 * every limit; these types only describe what it reports.
 */

export type AssessmentKind = 'COURSE_QUESTION' | 'PROBLEM_LOGIC';
export type AttemptRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const ASSESSMENT_KIND_LABELS: Record<AssessmentKind, string> = {
    COURSE_QUESTION: 'Course',
    PROBLEM_LOGIC: 'Problem Solving',
};

export interface AttemptRequest {
    id: string;
    status: AttemptRequestStatus;
    kind: AssessmentKind;
    courseId: string;
    itemId: string;
    courseTitle: string;
    itemTitle: string;
    reason: string;
    requestedCount: number;
    approvedCount: number | null;
    attemptsUsedAtRequest: number;
    allowedAtRequest: number;
    rejectionReason: string;
    adminNotes: string;
    reviewedAt: string | null;
    createdAt: string;
}

/** What a student sees for one assessment item. `exempt` = instructors. */
export interface AttemptAllowance {
    exempt: boolean;
    used: number;
    allowed: number;
    defaultAllowed: number;
    additionalGranted: number;
    remaining: number | null;
    limitReached: boolean;
    pendingRequest: AttemptRequest | null;
    latestRequest: AttemptRequest | null;
}

export interface StudentRef {
    name: string;
    email: string;
    studentCode: string | null;
}

export interface AttemptsOverview {
    totalAttempts: number;
    studentsAtLimit: number;
    itemsAtLimit: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    defaultAttempts: number;
}

export interface AllowanceRow {
    userId: string;
    student: StudentRef;
    kind: AssessmentKind;
    courseId: string;
    itemId: string;
    courseTitle: string;
    itemTitle: string;
    attemptsUsed: number;
    allowed: number;
    additionalGranted: number;
    limitReached: boolean;
    approval: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
    lastAttemptAt: string | null;
    updatedAt: string;
}

export interface AllowanceDetail {
    userId: string;
    student: StudentRef;
    kind: AssessmentKind;
    courseId: string;
    itemId: string;
    courseTitle: string;
    itemTitle: string;
    attemptsUsed: number;
    defaultAllowed: number;
    additionalGranted: number;
    allowed: number;
    grants: { count: number; requestId: string | null; grantedBy: string; notes: string; grantedAt: string }[];
    requests: AttemptRequest[];
}

export interface AdminAttemptRequest extends AttemptRequest {
    userId: string;
    student: StudentRef;
    currentUsed: number;
    currentAllowed: number;
    reviewedBy: string | null;
}

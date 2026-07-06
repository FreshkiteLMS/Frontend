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

export interface PreviewResult {
    spreadsheetId: string;
    warnings: string[];
    stats: ParseStats;
    sections: { title: string; icon: string; problemCount: number }[];
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

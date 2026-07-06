import type { TrackerSection, ProblemStatus, Difficulty } from '@/types/problem-course';

// A problem counts as "solved" once completed or passed (mirrors the backend).
const SOLVED: ProblemStatus[] = ['completed', 'pass'];
export const isSolved = (s: ProblemStatus): boolean => SOLVED.includes(s);

export type DifficultyFilter = 'all' | Difficulty;
export type StatusFilter = 'all' | ProblemStatus;

export interface DifficultyStat {
    total: number;
    solved: number;
}

export interface CourseStats {
    total: number;
    solved: number;
    remaining: number;
    percentage: number;
    byDifficulty: Record<Difficulty, DifficultyStat>;
    passed: number;
    failed: number;
    /** Passed ÷ (Passed + Failed), as a whole percentage. 0 when no outcomes yet. */
    accuracy: number;
}

const emptyDifficulty = (): Record<Difficulty, DifficultyStat> => ({
    Easy: { total: 0, solved: 0 },
    Medium: { total: 0, solved: 0 },
    Hard: { total: 0, solved: 0 },
});

/** Aggregate stats across every problem in the course (memoize at call site). */
export function computeStats(sections: TrackerSection[]): CourseStats {
    let total = 0;
    let solved = 0;
    let passed = 0;
    let failed = 0;
    const byDifficulty = emptyDifficulty();

    for (const section of sections) {
        for (const p of section.problems) {
            total++;
            const bucket = byDifficulty[p.difficulty] ?? byDifficulty.Easy;
            bucket.total++;
            if (isSolved(p.userStatus)) {
                solved++;
                bucket.solved++;
            }
            if (p.userStatus === 'pass') passed++;
            if (p.userStatus === 'fail') failed++;
        }
    }

    const remaining = total - solved;
    const percentage = total ? Math.round((solved / total) * 100) : 0;
    const outcomes = passed + failed;
    const accuracy = outcomes ? Math.round((passed / outcomes) * 100) : 0;

    return { total, solved, remaining, percentage, byDifficulty, passed, failed, accuracy };
}

export interface SectionStat {
    total: number;
    solved: number;
    percentage: number;
}

export function sectionStats(section: TrackerSection): SectionStat {
    const total = section.problems.length;
    const solved = section.problems.reduce((n, p) => n + (isSolved(p.userStatus) ? 1 : 0), 0);
    return { total, solved, percentage: total ? Math.round((solved / total) * 100) : 0 };
}

/**
 * True if a problem matches the active search + filters. `query` must be passed
 * pre-lowercased. Search covers problem name, tags, difficulty and section name.
 */
export function problemMatches(
    p: TrackerSection['problems'][number],
    sectionTitle: string,
    query: string,
    difficulty: DifficultyFilter,
    status: StatusFilter
): boolean {
    if (difficulty !== 'all' && p.difficulty !== difficulty) return false;
    if (status !== 'all' && p.userStatus !== status) return false;
    if (query) {
        const haystack = `${p.title} ${p.tags.join(' ')} ${p.difficulty} ${sectionTitle}`.toLowerCase();
        if (!haystack.includes(query)) return false;
    }
    return true;
}

/**
 * Return sections with only the problems that match the filters, dropping
 * sections that end up empty. Pure — memoize at the call site.
 */
export function filterSections(
    sections: TrackerSection[],
    query: string,
    difficulty: DifficultyFilter,
    status: StatusFilter
): TrackerSection[] {
    const q = query.trim().toLowerCase();
    if (!q && difficulty === 'all' && status === 'all') return sections;

    const out: TrackerSection[] = [];
    for (const section of sections) {
        const problems = section.problems.filter(p => problemMatches(p, section.title, q, difficulty, status));
        if (problems.length > 0) out.push({ ...section, problems });
    }
    return out;
}

"use client";

import { Crown, Medal } from 'lucide-react';
import { avatarColorFor, initialsOf } from '@/lib/chat-utils';
import type { LeaderboardPerson, LeaderboardRow } from '@/services/api/leaderboard.api';

/** Points formula shown to students (keep in sync with Backend LeaderboardService). */
export const SCORING_RULES: Array<{ label: string; detail: string }> = [
    { label: 'Course progress', detail: 'Up to 100 pts per course, by the share of lessons, questions or problems you have completed' },
    { label: 'Problem difficulty', detail: 'In problem-solving courses Easy = 1, Medium = 2, Hard = 3 towards that course\'s progress' },
    { label: 'Course completed', detail: '+20 bonus for every course you finish 100%' },
    { label: 'Assessments', detail: 'Up to 50 pts per test (your best attempt) and up to 5 pts per graded question' },
];

export function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center" title="1st"><Crown className="w-4 h-4 text-amber-500" /></span>;
    if (rank === 2) return <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center" title="2nd"><Medal className="w-4 h-4 text-slate-400" /></span>;
    if (rank === 3) return <span className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center" title="3rd"><Medal className="w-4 h-4 text-orange-500" /></span>;
    return <span className="w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 tabular-nums">{rank}</span>;
}

export function LeaderAvatar({ person, size = 36 }: { person: LeaderboardPerson; size?: number }) {
    if (person.avatar_url) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={person.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
    }
    return (
        <span
            className={`rounded-full ${avatarColorFor(person.id)} text-white font-bold flex items-center justify-center shrink-0`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        >
            {initialsOf(person.name)}
        </span>
    );
}

/** One-line learning summary for a row. */
export function rowSummary(row: LeaderboardRow): string {
    const s = row.stats;
    const parts: string[] = [];
    if (s.courses_completed) parts.push(`${s.courses_completed} course${s.courses_completed === 1 ? '' : 's'} completed`);
    else if (s.courses_started) parts.push(`${s.courses_started} course${s.courses_started === 1 ? '' : 's'} in progress`);
    if (s.problems_solved) parts.push(`${s.problems_solved} problem${s.problems_solved === 1 ? '' : 's'} solved`);
    if (s.assessment_average !== null) parts.push(`${Math.round(s.assessment_average)}% avg. assessment`);
    return parts.join(' · ') || 'Getting started';
}

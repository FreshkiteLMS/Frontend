import api from './axios';

export interface LeaderboardPerson {
    id: string;
    name: string;
    avatar_url: string | null;
}

export interface LeaderboardRow {
    rank: number;
    user: LeaderboardPerson;
    points: number;
    breakdown: {
        course_points: number;
        problem_points: number;
        completion_bonus: number;
        assessment_points: number;
    };
    stats: {
        courses_started: number;
        courses_completed: number;
        lessons_completed: number;
        problems_solved: number;
        problems_by_difficulty: { easy: number; medium: number; hard: number };
        questions_completed: number;
        assessments_taken: number;
        assessment_average: number | null;
    };
    last_activity_at: string | null;
    is_me: boolean;
}

export interface LeaderboardPage {
    data: LeaderboardRow[];
    /** The signed-in student's own row (null for staff or before first activity). */
    me: LeaderboardRow | null;
    total: number;
    page: number;
    limit: number;
    total_students: number;
    updated_at: string | null;
}

export const leaderboardService = {
    getPage: async (opts: { page?: number; limit?: number; q?: string } = {}): Promise<LeaderboardPage> => {
        const response = await api.get('/leaderboard', { params: opts });
        if (response.data.success) return response.data.data as LeaderboardPage;
        throw new Error(response.data.message || 'Failed to load leaderboard');
    },

    /** Admin: re-score every student now. */
    rebuild: async (): Promise<{ rescored: number }> => {
        const response = await api.post('/leaderboard/rebuild');
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to rebuild leaderboard');
    },
};

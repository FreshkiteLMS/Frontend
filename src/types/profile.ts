// Mirrors Backend ProfileService / AccountService responses (snake_case as delivered).

export type ProfileVisibility = 'public' | 'students' | 'private';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface SkillEntry {
    name: string;
    level: SkillLevel | null;
    primary: boolean;
}

export interface Education {
    institution: string;
    degree: string;
    field_of_study: string;
    graduation_year: number | null;
}

export interface AchievementView {
    key: string;
    name: string;
    description: string;
    icon: 'footprints' | 'graduation-cap' | 'library' | 'clipboard-check' | 'star' | 'puzzle' | 'brain' | 'mountain' | 'flame' | 'zap' | 'book-open';
    tier: 'bronze' | 'silver' | 'gold';
    earned: boolean;
    earned_at: string | null;
    progress: { current: number; target: number };
}

export interface CertificateView {
    id: string;
    course_id: string | null;
    course_title: string | null;
    issued_at: string;
    certificate_url: string | null;
    title: string;
}

export interface GoalView {
    id: string;
    type: 'complete_courses' | 'solve_problems' | 'complete_lessons' | 'finish_course' | 'assessment_average';
    title: string;
    target: number;
    current: number;
    unit: 'count' | 'percent';
    percent: number;
    status: 'active' | 'completed' | 'missed';
    course_id: string | null;
    course_title: string | null;
    starts_at: string;
    deadline: string | null;
}

export interface ProfileCourse {
    id: string;
    title: string;
    thumbnail_url: string | null;
    template: string;
    progress: number;
    status: 'completed' | 'in-progress' | 'not-started';
    completed_units: number;
    total_units: number;
}

export interface ProfileStats {
    enrolled_courses: number | null;
    completed_courses: number | null;
    in_progress_courses: number | null;
    overall_progress: number | null;
    problems_solved: number | null;
    lessons_completed: number | null;
    assessments_completed: number | null;
    certificates: number | null;
    streak_current: number | null;
    streak_longest: number | null;
    rank: number | null;
    points: number | null;
}

export interface ProfileRestricted {
    restricted: true;
    visibility: ProfileVisibility;
    viewer: { relation: 'self' | 'admin' | 'member' | 'anonymous'; can_edit: boolean };
    user: { id: string; name: string; username: string | null; role: string; avatar_url: string | null };
}

export interface ProfileFull {
    restricted: false;
    visibility: ProfileVisibility;
    viewer: { relation: 'self' | 'admin' | 'member' | 'anonymous'; can_edit: boolean };
    user: {
        id: string;
        name: string;
        username: string | null;
        role: 'student' | 'admin' | 'teacher';
        avatar_url: string | null;
        cover_url: string | null;
        headline: string;
        bio: string;
        location: string;
        email: string | null;
        joined_at: string | null;
        status: 'active';
        links: { github: string; linkedin: string; portfolio: string };
    };
    about: {
        education: Education;
        career_interests: string[];
        career_goals: string;
        learning_areas: string[];
        interests: string[];
    };
    skills: SkillEntry[] | null;
    academic: {
        stats: ProfileStats;
        courses: ProfileCourse[] | null;
        leaderboard: { rank: number; points: number; breakdown: Record<string, number> } | null;
        achievements: AchievementView[] | null;
        certificates: CertificateView[] | null;
        activity: {
            calendar: Array<{ date: string; count: number }>;
            streak: { current: number; longest: number; active_today: boolean };
            timezone: string;
        } | null;
        goals: GoalView[] | null;
    } | null;
    completion: { percent: number; missing: Array<{ key: string; label: string; hint: string }> } | null;
    friendship_status: 'self' | 'friends' | 'request_sent' | 'request_received' | 'none' | null;
    presence: { status: string; last_seen_at: string | null } | null;
    share_path: string | null;
}

export type ProfileView = ProfileFull | ProfileRestricted;

export interface ProblemStats {
    total_solved: number;
    total_problems: number;
    by_difficulty: Record<'easy' | 'medium' | 'hard', { solved: number; total: number }>;
    by_category: Array<{ category: string; course_title: string; solved: number; total: number }>;
    recent: Array<{ title: string; course_title: string | null; difficulty: string | null; category: string | null; at: string }>;
}

export interface TimelineEvent {
    type: 'lesson_completed' | 'problem_solved' | 'assessment_submitted' | 'question_completed' | 'course_enrolled' | 'course_completed' | 'certificate_earned';
    at: string;
    title: string;
    course_id: string | null;
    course_title: string | null;
    detail: { difficulty?: string; category?: string; score?: number; max_score?: number; certificate_url?: string | null } | null;
}

/* ── Settings ── */

export interface SessionView {
    id: string;
    device: string;
    ip: string;
    method: 'password' | 'google';
    created_at: string;
    last_used_at: string;
    current: boolean;
}

export interface PrivacySettings {
    visibility: ProfileVisibility;
    show_email: boolean;
    show_skills: boolean;
    show_progress: boolean;
    show_achievements: boolean;
    show_certificates: boolean;
    show_online: boolean;
    discoverable: boolean;
    allow_dms: 'everyone' | 'friends' | 'none';
}

export interface Preferences {
    theme: 'light' | 'dark' | 'system';
    timezone: string | null;
    date_format: 'DMY' | 'MDY' | 'YMD';
    time_format: '12h' | '24h';
    reduce_motion: boolean;
}

export interface ProfileDetails {
    avatar_url: string | null;
    cover_url: string | null;
    headline: string;
    bio: string;
    location: string;
    education: Education;
    career_interests: string[];
    career_goals: string;
    learning_areas: string[];
    interests: string[];
    skills: SkillEntry[];
    github_url: string;
    linkedin_url: string;
    portfolio_url: string;
}

export interface NotificationPrefs {
    categories: Array<{ key: string; label: string; description: string; in_app: boolean }>;
    mandatory: { label: string; description: string };
    email_available: boolean;
}

export interface AccountOverview {
    account: {
        id: string;
        name: string;
        username: string | null;
        email: string;
        role: string;
        created_at: string | null;
        has_password: boolean;
        email_change_supported: boolean;
        username_rules: string;
    };
    profile: ProfileDetails;
    completion: { percent: number; missing: Array<{ key: string; label: string; hint: string }> };
    privacy: PrivacySettings;
    preferences: Preferences;
    notifications: NotificationPrefs;
    security: { sessions: SessionView[]; last_login: { at: string; device: string } | null };
    deletion_request: { id: string; created_at: string; status: 'pending' } | null;
}

export interface DeletionRequestAdminView {
    id: string;
    user: { id: string; name: string; email: string };
    reason: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
}

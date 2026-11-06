/** Admin Student Management + Batch Management response types (see Backend routes/admin.ts). */

export type ActivityStatus = 'active' | 'inactive' | 'never';

export interface DirectoryRow {
    id: string;
    userId: string;
    studentCode: string | null;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    joinedAt: string | null;
    batches: { id: string; name: string; status: string }[];
    enrolledCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    overallProgress: number;
    lessonsCompleted: number;
    problemsSolved: number;
    assignments: { total: number; finished: number; passed: number; failed: number; pending: number };
    audio: { questions_total: number; practised: number; attempts: number; avg_best: number | null };
    tests: { taken: number; avg_percent: number | null };
    lastActivityAt: string | null;
    activeDays30: number;
    events30: number;
    activityStatus: ActivityStatus;
    points: number | null;
    rank: number | null;
    batchRank: number | null;
    pending: { attemptRequests: number; enrollmentRequests: number; audioProcessing: number };
    summaryComputedAt: string | null;
}

export interface DirectoryPage {
    rows: DirectoryRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export type DirectorySort = 'name' | 'progress' | 'activity' | 'joined' | 'last_active' | 'assignments' | 'performance' | 'student_code';

export interface DirectoryFilters {
    q?: string;
    batchId?: string;
    courseId?: string;
    activity?: '' | ActivityStatus;
    activeDays?: number;
    progressMin?: number;
    progressMax?: number;
    completed?: boolean;
    inProgress?: boolean;
    pendingAssignments?: boolean;
    pendingAudio?: boolean;
    sort?: DirectorySort;
    dir?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface Capabilities {
    meetings: boolean;
    courses: boolean;
    assignments: boolean;
    audio_practice: boolean;
    problem_solving: boolean;
}

export interface BatchGroup {
    key: string;
    template: string;
    name: string;
    description?: string;
    audience: 'all' | 'staff';
    who_can_post: 'everyone' | 'moderators';
    conversation_id?: string | null;
    archived?: boolean;
    member_count?: number | null;
    last_message_at?: string | null;
}

export interface AttentionReason { code: string; message: string; value?: number | string | null }

export interface CourseDetail {
    courseId: string;
    title: string;
    thumbnailUrl: string | null;
    template: string;
    progress: number;
    status: 'completed' | 'in-progress' | 'not-started';
    completedUnits: number;
    totalUnits: number;
    unitLabel: 'lessons' | 'problems';
    enrollment: { via: string[]; enrolledAt: string | null; batches: { id: string; name: string }[]; bundleIds: string[] };
    modules: { total: number; completed: number } | null;
    lessons: { total: number; completed: number } | null;
    assignments: { total: number; finished: number } | null;
    audio: { total: number; practised: number } | null;
    problems: { total: number; solved: number; attempted: number; byDifficulty: Record<string, { solved: number; total: number }> } | null;
    lastActivityAt: string | null;
    completedAt: string | null;
    current: { lastCompleted: { title: string; module: string; at: string } | null; next: { title: string; module: string } | null } | null;
}

export interface TimelineEvent {
    type: string;
    at: string;
    title: string;
    courseId: string | null;
    courseTitle: string | null;
    detail: Record<string, any> | null;
}

export interface StudentOverview {
    identity: {
        userId: string; studentId: string | null; studentCode: string | null; name: string; email: string; phone: string | null;
        avatarUrl: string | null; headline: string | null; joinedAt: string | null; enrolledAt: string | null; studentType: string | null;
        accountStatus: string; hasStudentRecord: boolean;
    };
    batches: {
        id: string; name: string; batchNumber: string; status: string; batchType: string | null; joinedAt: string | null;
        capabilities: Capabilities; memberCount: number; averageProgress: number | null; rank: number | null;
    }[];
    summary: {
        enrolled_courses: number; completed_courses: number; in_progress_courses: number; overall_progress: number;
        lessons_completed: number; problems_solved: number; problems_attempted: number; questions_completed: number;
        assignments: { total: number; finished: number; passed: number; failed: number; pending: number };
        audio: { questions_total: number; practised: number; attempts: number; avg_best: number | null };
        logic: { attempts: number; avg_score: number | null };
        tests: { taken: number; avg_percent: number | null };
        points: number; last_activity_at: string | null; first_activity_at: string | null; active_days_30: number; events_30: number;
        modules: { total: number; completed: number }; lessons: { total: number; completed: number };
        problems: { total: number; solved: number; attempted: number };
    };
    courses: CourseDetail[];
    leaderboard: { rank: number; points: number; breakdown: Record<string, number>; stats: Record<string, any> } | null;
    streak: { currentStreak: number; longestStreak: number; lastActiveDay: string | null };
    attention: { rules: Record<string, number>; reasons: AttentionReason[] };
    pending: {
        attemptRequests: { id: string; course_title: string; item_title: string; requested_count: number; created_at: string; kind: string }[];
        enrollmentRequests: { id: string; kind: string; name: string; createdAt: string }[];
    };
    recentActivity: TimelineEvent[];
    trackingSince: string | null;
}

export interface LessonNode { id: string; title: string; completed: boolean; completedAt: string | null }
export interface CourseTree extends Omit<CourseDetail, 'modules'> {
    modules: { id: string; title: string; lessons: LessonNode[]; total: number; completed: number }[] | null;
    problemSections: ProblemSection[] | null;
    activities: { topic: string; items: { id: string; title: string; type: string; isActive: boolean; status: string; updatedAt: string | null; attempts: number; bestScore: number | null; dueDate: string | null }[] }[] | null;
}

export interface ProblemRow {
    id: string; title: string; difficulty: string | null; status: string; attempts: number; completedAt: string | null;
    lastViewedAt: string | null; lastAttemptAt: string | null; problemUrl: string | null; solutionUrl: string | null;
    videos: { title: string; url: string; language: string | null }[];
    logic: { attempts: number; best: number | null; latestAttemptId: string | null };
}
export interface ProblemSection { id: string; title: string; problems: ProblemRow[] }

export interface AssignmentItem {
    courseId: string; courseTitle: string; questionId: string; title: string; prompt: string; topic: string | null; isActive: boolean;
    dueDate: string | null; overdue: boolean; resourceUrl: string | null; evaluationCriteria: string | null; status: string; version: number;
    updatedAt: string | null; updatedByRole: string | null; assessmentNotes: string | null; assessedAt: string | null; assessedBy: string | null;
    marks: number | null; maxMarks: number | null;
    history: { at: string; from: string; to: string; kind: string; notes: string | null; actor: string }[];
}
export interface AssignmentsResponse {
    summary: { total: number; finished: number; passed: number; failed: number; awaitingAssessment: number; overdue: number; testsTaken: number };
    courses: { courseId: string; title: string }[];
    assignments: AssignmentItem[];
    tests: { submissionId: string; testId: string; title: string; courseId: string | null; courseTitle: string | null; status: string; submittedAt: string; score: number; maxScore: number; percent: number | null }[];
    limitations: string[];
}
export interface TestSubmissionDetail {
    submissionId: string; title: string; submittedAt: string; status: string; score: number; maxScore: number;
    questions: { id: string; type: string; text: string; points: number; options: Record<string, string> | null; correctAnswer: string | null; answer: string | null; isCorrect: boolean | null; pointsEarned: number }[];
}

export interface AudioAttempt {
    id: string; attemptNumber: number; status: string; submittedAt: string; completedAt: string | null; score: number | null;
    performanceLevel: string | null; reviewedScore: number | null; reviewDecision: string | null; refunded: boolean; errorCode: string | null;
}
export interface AudioItem {
    questionId: string; title: string; difficulty?: string; isActive: boolean; best: number | null; latest: number | null; attempts: AudioAttempt[];
    limit: { used: number; allowed: number; remaining: number; additionalGranted: number; limitReached: boolean; latestRequest: { id: string; status: string; requested: number; approved: number | null; reason: string; createdAt: string; reviewedAt: string | null } | null };
}
export interface AudioCourse { courseId: string; kind: 'COURSE_QUESTION' | 'PROBLEM_LOGIC'; title: string; questions: number; practised: number; attempts: number; groups: { title: string; items: AudioItem[] }[] }
export interface AudioResponse {
    summary: { questions_total: number; practised: number; attempts: number; avg_best: number | null };
    logic: { attempts: number; avg_score: number | null };
    pendingRequests: number;
    processing: number;
    courses: AudioCourse[];
    logicCourses: AudioCourse[];
    playback: { available: boolean; reason: string };
    limitations: string[];
}

export interface ActivityResponse {
    timezone: string;
    range: { from: string; to: string };
    days: { date: string; count: number; types: Record<string, number> }[];
    levels: number[];
    totals: { events: number; activeDays: number; currentStreak: number; longestStreak: number; lastActiveDay: string | null };
    weeks: { start: string; count: number; activeDays: number }[];
    months: { month: string; count: number; activeDays: number }[];
    trackingSince: string | null;
    timeline: { data: TimelineEvent[]; total: number; page: number; limit: number };
    countedTypes: string[];
    limitations: string[];
}

export interface MeetingOcc {
    id: string; title: string; batchId: string; batchName?: string; meetLink: string; type: string; status: string; start: string; end: string;
    timezone: string; attendance?: string | null;
}
export interface MeetingsResponse {
    applicable: boolean;
    batches: { id: string; name: string; meetingsEnabled: boolean }[];
    upcoming: MeetingOcc[];
    past: MeetingOcc[];
    cancelled: { id: string; title: string; batchId: string; startDate: string; startTime: string; cancelledAt: string }[];
    attendance: { recorded: number; present: number; late: number; absent: number; excused: number; rate: number | null } | null;
    limitations?: string[];
}

export interface BatchOverview {
    batch: { id: string; name: string; description: string; batchNumber: string; status: string; batchType: string | null; startDate: string; endDate: string | null; createdAt: string; legacyConfig: { capabilities: boolean; groups: boolean } };
    capabilities: Capabilities;
    groups: BatchGroup[];
    courses: { id: string; title: string; template: string; status: string; thumbnailUrl: string | null }[];
    counts: { students: number; active: number; inactive: number; courses: number; groups: number };
    progress: { average: number | null; averageCourseCompletion: number | null; studentsCompletedAll: number };
    assignments: { total: number; finished: number; rate: number | null; studentsWithPending: number };
    audio: { questions: number; practised: number; attempts: number; rate: number | null; studentsPractising: number };
    problems: { solved: number; attempted: number; studentsSolving: number };
    meetings: { scheduled: number; recurring: number; cancelled: number; next: { id: string; title: string; start: string; end: string } | null } | null;
    actions: string[];
    rules: Record<string, number>;
    recentActivity: { type: string; at: string; userId: string; student: string; courseId: string | null; courseTitle: string | null; title: string | null; score: number | null }[];
}

export interface PersonRef { userId: string; name?: string; email?: string; studentCode?: string | null }
export interface BatchAnalytics {
    batchId: string;
    capabilities: Capabilities;
    window: { days: number; since: string };
    rules: Record<string, number>;
    engagement: { totalStudents: number; active7: number; active30: number; activeInWindow: number; inactive: number; series: { date: string; events: number; activeStudents: number }[]; weekly: { start: string; events: number; activeStudents: number }[] };
    distribution: { progress: { label: string; count: number }[]; completedCourses: { label: string; count: number }[] };
    courses: { courseId: string; title: string; template: string; inBatch: boolean; enrolled: number; averageProgress: number | null; completed: number; inProgress: number; notStarted: number; fallingBehind: number; averageUnits: number | null; totalUnits: number | null; modules: { title: string; lessons: number; studentsCompleted: number; lessonCompletionRate: number | null }[] | null }[];
    assignments: { total: number; finished: number; pending: number; passed: number; failed: number; awaitingAssessment: number; passRate: number | null; overdue: number; studentsWithPending: (PersonRef & { pending: number; overdue: number })[]; completionDistribution: { label: string; count: number }[] };
    audio: { questions: number; recordings: number; practised: number; completionRate: number | null; averageAttempts: number | null; pendingEvaluations: number; failedRecordings: number; averageBestScore: number | null; studentsPractising: number; needsPractice: (PersonRef & { practised: number; questions: number; averageBest: number | null })[] };
    problems: { attempted: number; solved: number; completionRate: number | null; byDifficulty: Record<string, { attempted: number; solved: number }>; participants: number; eligible: number };
    meetings: { scheduled: number; recurring: number; cancelled: number; heldInWindow: number; upcoming: number; sessionsWithAttendance: number; attendanceRate: number | null; students: (PersonRef & { recorded: number; attended: number; rate: number | null })[] } | null;
    leaderboard: (PersonRef & { points: number; batchRank: number; globalRank: number; overallProgress: number | null })[];
    attention: { total: number; students: (PersonRef & { overallProgress: number | null; lastActivityAt: string | null; reasons: AttentionReason[] })[] };
}

export interface AttendanceRoster {
    meeting: { id: string; title: string; batchId: string; batchName: string };
    occurrence: { start: string; end: string };
    canMark: boolean;
    students: { userId: string; name: string; email: string; studentCode: string | null; status: AttendanceStatus | null }[];
    summary: { present: number; late: number; absent: number; excused: number; notRecorded: number };
}
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

/* ───── Audio practice (overview-first) ───── */
export interface AudioCourseCard {
    courseId: string; kind: 'COURSE_QUESTION' | 'PROBLEM_LOGIC'; title: string; thumbnailUrl: string | null;
    activities: number | null; completed: number; pending: number | null; recordings: number; evaluated: number;
    awaitingEvaluation: number; failed: number; completion: number | null; limitReached: number; pendingRequests: number;
    lastRecordingAt: string | null;
}
export interface RecentRecording extends AudioAttempt {
    kind: 'COURSE_QUESTION' | 'PROBLEM_LOGIC'; courseId: string; courseTitle: string; group: string; questionId: string; questionTitle: string; allowed: number;
}
export interface Paged<T> { data: T[]; total: number; page: number; limit: number }
export interface AudioOverview {
    metrics: {
        activities: number; completed: number; pending: number; recordings: number; evaluated: number; awaitingEvaluation: number;
        failed: number; reviewedByAdmin: number; averageBest: number | null; logicAttempts: number; logicAverage: number | null;
        limitReached: number; pendingRequests: number;
    };
    evaluation: { label: string; value: number }[];
    weeks: { start: string; recordings: number; averageScore: number | null }[];
    courses: AudioCourseCard[];
    recent: Paged<RecentRecording>;
    playback: { available: boolean; reason: string };
}
export type AudioCourseDetail = AudioCourse & { limitations: string[] };

/* ───── Dashboard lists ───── */
export interface BatchListRow {
    id: string; name: string; description?: string; batch_number?: string; students: number; activeStudents: number;
    courses: number; courseTitles: string[]; progress: number; completedAll: number; completionRate: number;
    meetingsScheduled: number; recurringMeetings: number; startDate?: string; endDate?: string; createdAt?: string; updatedAt?: string;
    status: string; batchType: string | null; capabilities: Capabilities; groupCount: number;
}
export interface CourseListRow {
    id: string; title: string; description?: string; template: string; thumbnailUrl: string | null; enrolled: number; avgProgress: number;
    completedStudents: number; inProgressStudents: number; modules: number | null; lessons: number | null; problems: number | null;
    status: string; category?: string; difficulty?: string; createdAt?: string; updatedAt?: string;
}
export interface ListPage<T, F> { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number }; facets: F }

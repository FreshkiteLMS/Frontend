/** Mentor management and the mentor's own access. */

export interface PermissionDef {
    key: string;
    label: string;
    description: string;
    scope: 'batch' | 'student' | 'global';
    finance?: boolean;
}

export interface PermissionGroup {
    key: string;
    label: string;
    permissions: PermissionDef[];
}

export interface PermissionCatalog {
    groups: PermissionGroup[];
    defaults: string[];
}

export interface MentorAccess {
    fullAdmin: boolean;
    batchScope: 'assigned' | 'all';
    studentScope: 'assigned' | 'all';
    permissions: string[];
    batchIds: string[];
}

export interface EffectiveAccess {
    status: string;
    fullAdmin: boolean;
    batches: { scope: 'all' | 'assigned'; label: string; names?: string[] };
    students: { scope: 'all' | 'assigned'; label: string };
    groups: { key: string; label: string; allowed: string[]; denied: string[] }[];
    notes: string[];
}

export interface MentorRow extends MentorAccess {
    id: string;
    userId: string;
    mentorCode: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    status: 'active' | 'inactive';
    batches: { id: string; name: string }[];
    permissionCount: number;
    createdAt: string;
    lastActiveAt: string | null;
}

export interface MentorDetail extends MentorRow {
    previousRole: 'student' | 'teacher' | null;
    updatedAt: string;
    deactivatedAt: string | null;
    effective: EffectiveAccess;
}

export interface MentorStats {
    total: number;
    active: number;
    inactive: number;
    assignedBatches: number;
}

export interface MentorList {
    stats: MentorStats;
    rows: MentorRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface MentorCandidate {
    userId: string;
    name: string;
    email: string;
    role: 'student' | 'teacher';
    studentCode: string | null;
}

export interface MentorActivity {
    actions: { rows: { id: string; action: string; at: string; batchId: string | null; metadata: Record<string, unknown>; subjectUserId: string | null }[]; total: number; page: number; totalPages: number };
    accessChanges: { id: string; action: string; actorName: string; at: string; before: unknown; after: unknown }[];
    signIns: { at: string; lastUsedAt: string; method: string; revokedAt: string | null }[];
}

/** GET /mentor/me — drives the mentor UI. */
export interface MentorMe {
    mentorCode: string | null;
    name: string;
    email: string;
    fullAdmin: boolean;
    batchScope: 'assigned' | 'all';
    studentScope: 'assigned' | 'all';
    batches: { id: string; name: string }[];
    can: Record<string, boolean>;
    effective: EffectiveAccess | null;
}

export interface MentorDashboard {
    overview: {
        batches: number | null;
        activeBatches: number | null;
        students: number | null;
        activeStudents: number | null;
        needAttention: number | null;
        averageProgress: number | null;
        pendingRequests: number | null;
        activeDays: number;
        studentScope: 'all' | 'assigned';
    };
    batches: {
        id: string;
        name: string;
        batchCode: string;
        lifecycle: 'upcoming' | 'active' | 'completed' | 'archived';
        startDate: string;
        endDate: string | null;
        students: number;
        maxStudents: number | null;
        courses: string[];
        progress: number | null;
        activeStudents: number;
    }[] | null;
    recentActivity: { action: string; at: string; student: string; batchId: string; batchName: string; actorName: string }[];
}

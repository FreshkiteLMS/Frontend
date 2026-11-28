/** Batch membership, invitations, joining requests, courses and mentors (staff views). */

export type BatchLifecycle = 'upcoming' | 'active' | 'completed' | 'archived';
export type MembershipStatus = 'active' | 'disabled' | 'removed';
export type MembershipSource = 'admin' | 'invitation' | 'join_request' | 'transfer' | 'legacy';
export type JoinMode = 'direct' | 'approval';

export interface MemberRow {
    userId: string;
    studentId: string | null;
    studentCode: string | null;
    name: string;
    email: string;
    avatarUrl: string | null;
    status: MembershipStatus;
    source: MembershipSource;
    joinedAt: string | null;
    statusChangedAt: string | null;
    reason: string | null;
    transferredTo: string | null;
    lastActiveAt: string | null;
    overallProgress: number | null;
    batchCourses: { total: number; accessible: number; completed: number; averageProgress: number | null };
}

export interface MembersPage {
    counts: { active: number; disabled: number; removed: number };
    rows: MemberRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface MembershipEvent {
    at: string;
    action: 'joined' | 'added' | 'disabled' | 'enabled' | 'removed' | 'transferred_in' | 'transferred_out' | 'rejoined';
    by: string | null;
    note: string | null;
}

export interface Invitation {
    id: string;
    state: 'active' | 'revoked' | 'expired' | 'exhausted';
    active: boolean;
    expiresAt: string | null;
    maxUses: number | null;
    useCount: number;
    createdAt: string;
    revokedAt: string | null;
    revokedReason: string | null;
    lastUsedAt: string | null;
    token: string | null;
    path: string | null;
}

export interface JoinRequestRow {
    id: string;
    batchId: string;
    batchName?: string;
    userId: string;
    name?: string;
    email?: string;
    studentCode?: string | null;
    avatarUrl?: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    message: string;
    decisionReason: string | null;
    decidedAt: string | null;
    createdAt: string;
}

export interface BatchCourse {
    id: string;
    title: string;
    status: string;
    category: string | null;
    thumbnail: string | null;
    template: string | null;
}

export interface BatchMentor {
    id: string;
    userId: string;
    mentorCode: string;
    name: string;
    email: string;
    status: 'active' | 'inactive';
    fullAdmin: boolean;
    permissionCount: number;
}

export interface Announcement {
    id: string;
    batchId: string;
    title: string;
    body: string;
    authorName: string;
    authorRole: string;
    recipients: number;
    createdAt: string;
}

export interface AuditRow {
    id: string;
    action: string;
    actorId: string | null;
    actorRole: string;
    actorName: string;
    resourceType: string;
    resourceId: string | null;
    batchId: string | null;
    subjectUserId: string | null;
    before: unknown;
    after: unknown;
    metadata: Record<string, unknown>;
    at: string;
}

export interface Paged<T> { rows: T[]; total: number; page: number; totalPages: number; limit?: number }

export interface BatchSummary {
    total: number;
    upcoming: number;
    active: number;
    completed: number;
    archived: number;
    totalStudents: number;
}

/** Student-facing views. */
export interface InvitationPreview {
    batch: {
        id: string;
        name: string;
        description: string;
        batchCode: string;
        startDate: string;
        endDate: string | null;
        lifecycle: BatchLifecycle;
        batchType: string | null;
        courses: { id: string; title: string; description: string; thumbnail: string | null; category: string | null }[];
        mentors: string[];
        seatsLeft: number | null;
    };
    joinMode: JoinMode;
    state: 'can_join' | 'member' | 'disabled' | 'pending' | 'full' | 'not_student';
}

export type JoinResult = { result: 'joined' | 'already_member' | 'request_submitted' | 'request_pending'; batchId: string; requestId?: string | null };

export interface MyBatch {
    id: string;
    name: string;
    description: string;
    batchCode: string;
    lifecycle: BatchLifecycle;
    startDate: string;
    endDate: string | null;
    membership: 'active' | 'disabled';
    courseAccess: boolean;
    courses: { id: string; title: string; available: boolean }[];
    mentors: string[];
    announcements?: Announcement[];
}

export const LIFECYCLE_LABEL: Record<BatchLifecycle, string> = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed', archived: 'Archived' };
export const LIFECYCLE_TONE: Record<BatchLifecycle, string> = { upcoming: 'info', active: 'active', completed: 'neutral', archived: 'inactive' };
export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = { active: 'Active', disabled: 'Disabled', removed: 'Removed' };
export const SOURCE_LABEL: Record<MembershipSource, string> = {
    admin: 'Added by staff', invitation: 'Invitation link', join_request: 'Approved request', transfer: 'Transferred in', legacy: 'Added earlier',
};

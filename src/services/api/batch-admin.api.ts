import api from './axios';
import type {
    Announcement, AuditRow, BatchCourse, BatchMentor, Invitation, InvitationPreview, JoinRequestRow, JoinResult,
    MembersPage, MembershipEvent, MyBatch, Paged,
} from '@/types/batch-admin';

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);
const b = (id: string) => `/batches/${encodeURIComponent(id)}`;

/** Batch membership, invitations, requests, courses, mentors and announcements (staff). */
export const batchAdminService = {
    // Members
    members: (batchId: string, q: { status?: string; q?: string; page?: number; limit?: number }) =>
        data<MembersPage>(api.get(`${b(batchId)}/members`, { params: q })),
    addMembers: (batchId: string, userIds: string[]) =>
        data<{ added: string[]; already: string[]; invalid: string[] }>(api.post(`${b(batchId)}/members`, { userIds })),
    disable: (batchId: string, userId: string, reason?: string) => data(api.post(`${b(batchId)}/members/${encodeURIComponent(userId)}/disable`, { reason })),
    enable: (batchId: string, userId: string) => data(api.post(`${b(batchId)}/members/${encodeURIComponent(userId)}/enable`, {})),
    remove: (batchId: string, userId: string, reason?: string) => data(api.delete(`${b(batchId)}/members/${encodeURIComponent(userId)}`, { data: { reason } })),
    transfer: (batchId: string, userId: string, toBatchId: string, reason?: string) =>
        data<{ from: { id: string; name: string }; to: { id: string; name: string } }>(api.post(`${b(batchId)}/members/${encodeURIComponent(userId)}/transfer`, { toBatchId, reason })),
    history: (batchId: string, userId: string) =>
        data<{ status: string | null; source: string; joinedAt: string | null; history: MembershipEvent[] }>(api.get(`${b(batchId)}/members/${encodeURIComponent(userId)}/history`)),

    // Courses
    courses: (batchId: string) => data<BatchCourse[]>(api.get(`${b(batchId)}/courses`)),
    setCourses: (batchId: string, courseIds: string[]) => data<{ courseIds: string[]; added: string[]; removed: string[] }>(api.put(`${b(batchId)}/courses`, { courseIds })),

    // Mentors
    mentors: (batchId: string) => data<{ mentors: BatchMentor[]; allBatchMentors: number }>(api.get(`${b(batchId)}/mentors`)),
    mentorOptions: (batchId: string, q = '') => data<{ id: string; mentorCode: string; name: string; email: string }[]>(api.get(`${b(batchId)}/mentor-options`, { params: { q } })),
    setMentors: (batchId: string, mentorIds: string[]) => data<{ mentors: BatchMentor[]; allBatchMentors: number }>(api.put(`${b(batchId)}/mentors`, { mentorIds })),

    // Invitation link
    invitation: (batchId: string) => data<Invitation | null>(api.get(`${b(batchId)}/invitation`)),
    invitations: (batchId: string) => data<Invitation[]>(api.get(`${b(batchId)}/invitations`)),
    generateInvitation: (batchId: string, settings: { expiresAt?: string | null; maxUses?: number | null }) => data<Invitation>(api.post(`${b(batchId)}/invitation`, settings)),
    updateInvitation: (batchId: string, settings: { expiresAt?: string | null; maxUses?: number | null }) => data<Invitation>(api.patch(`${b(batchId)}/invitation`, settings)),
    revokeInvitation: (batchId: string) => data<{ revoked: boolean }>(api.delete(`${b(batchId)}/invitation`)),

    // Joining configuration + lifecycle
    setJoining: (batchId: string, settings: { joinMode?: 'direct' | 'approval'; maxStudents?: number | null }) => data(api.patch(`${b(batchId)}/joining`, settings)),
    archive: (batchId: string) => data(api.post(`${b(batchId)}/archive`)),
    restore: (batchId: string) => data(api.post(`${b(batchId)}/restore`)),

    // Joining requests
    requests: (batchId: string, status = 'pending', page = 1) =>
        data<Paged<JoinRequestRow> & { pending: number }>(api.get(`${b(batchId)}/join-requests`, { params: { status, page } })),
    approve: (batchId: string, requestId: string) => data(api.post(`${b(batchId)}/join-requests/${encodeURIComponent(requestId)}/approve`)),
    reject: (batchId: string, requestId: string, reason: string) => data(api.post(`${b(batchId)}/join-requests/${encodeURIComponent(requestId)}/reject`, { reason })),

    // Announcements
    announcements: (batchId: string, page = 1) => data<Paged<Announcement>>(api.get(`${b(batchId)}/announcements`, { params: { page } })),
    announce: (batchId: string, title: string, body: string) => data<Announcement>(api.post(`${b(batchId)}/announcements`, { title, body })),

    // History
    audit: (batchId: string, page = 1) => data<Paged<AuditRow>>(api.get(`${b(batchId)}/audit`, { params: { page } })),
};

/** Student-side: invitation links, my batches, my joining requests. */
export const studentBatchService = {
    preview: (token: string) => data<InvitationPreview>(api.get(`/batch-invitations/${encodeURIComponent(token)}`)),
    join: (token: string, message?: string) => data<JoinResult>(api.post(`/batch-invitations/${encodeURIComponent(token)}/join`, { message })),
    myBatches: () => data<MyBatch[]>(api.get('/student/batches')),
    myBatch: (id: string) => data<MyBatch>(api.get(`/student/batches/${encodeURIComponent(id)}`)),
    myRequests: () => data<JoinRequestRow[]>(api.get('/student/batch-requests')),
    cancelRequest: (id: string) => data<JoinRequestRow>(api.post(`/student/batch-requests/${encodeURIComponent(id)}/cancel`)),
};

/** Full URL of an invitation path, for copying. */
export const invitationUrl = (path: string) => (typeof window !== 'undefined' ? `${window.location.origin}${path}` : path);

/** Human text for audit actions. */
export const AUDIT_LABEL: Record<string, string> = {
    'batch.created': 'Created the batch',
    'batch.updated': 'Updated batch details',
    'batch.archived': 'Archived the batch',
    'batch.restored': 'Restored the batch',
    'batch.deleted': 'Deleted the batch',
    'batch.courses_changed': 'Changed the courses',
    'batch.announcement_sent': 'Sent an announcement',
    'invitation.created': 'Created the invitation link',
    'invitation.regenerated': 'Regenerated the invitation link',
    'invitation.updated': 'Changed the invitation link settings',
    'invitation.revoked': 'Turned off the invitation link',
    'membership.added': 'Added a student',
    'membership.joined': 'Student joined',
    'membership.disabled': 'Disabled a membership',
    'membership.removed': 'Removed a student',
    'membership.transferred_in': 'Student transferred in',
    'membership.transferred_out': 'Student transferred out',
    'join_request.submitted': 'Joining request submitted',
    'join_request.approved': 'Approved a joining request',
    'join_request.rejected': 'Rejected a joining request',
    'join_request.cancelled': 'Joining request cancelled',
    'mentor.created': 'Mentor created',
    'mentor.access_updated': 'Mentor access changed',
    'mentor.details_updated': 'Mentor details changed',
    'mentor.activated': 'Mentor activated',
    'mentor.deactivated': 'Mentor deactivated',
    'mentor.removed': 'Mentor access removed',
    'mentor.password_reset': 'Mentor password reset',
    'mentor.batch_assigned': 'Mentor assigned to a batch',
    'mentor.batch_unassigned': 'Mentor removed from a batch',
    'mentor.admin_request': 'Used an admin tool',
};

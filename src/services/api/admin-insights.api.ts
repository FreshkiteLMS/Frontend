import api from './axios';
import type {
    ActivityResponse,
    AssignmentsResponse,
    AttendanceRoster,
    AttendanceStatus,
    AudioCourseDetail,
    AudioOverview,
    BatchListRow,
    CourseListRow,
    ListPage,
    Paged,
    RecentRecording,
    BatchAnalytics,
    BatchGroup,
    BatchOverview,
    CourseDetail,
    CourseTree,
    DirectoryFilters,
    DirectoryPage,
    MeetingsResponse,
    ProblemSection,
    StudentOverview,
    TestSubmissionDetail,
} from '@/types/admin-insights';

/** Drop empty / false values so URLs stay short and filters stay explicit. */
export function directoryParams(f: DirectoryFilters): Record<string, string | number | boolean> {
    const out: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(f)) {
        if (v === undefined || v === null || v === '' || v === false) continue;
        out[k] = v as string | number | boolean;
    }
    return out;
}

const clean = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '' && v !== null));

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);

async function download(path: string, params: Record<string, unknown>, filename: string) {
    const res = await api.get(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export const adminInsightsService = {
    // ── Student Management ──
    directory: (f: DirectoryFilters) => data<DirectoryPage>(api.get('/admin/students-directory', { params: directoryParams(f) })),
    exportDirectory: (f: DirectoryFilters) => download('/admin/students-directory/export.csv', directoryParams({ ...f, page: undefined, limit: undefined }), `students-${new Date().toISOString().slice(0, 10)}.csv`),
    rebuildSummaries: () => data<{ started: boolean; alreadyRunning: boolean }>(api.post('/admin/students-directory/rebuild')),

    // ── Student 360 ──
    overview: (id: string) => data<StudentOverview>(api.get(`/admin/students/${encodeURIComponent(id)}/overview`)),
    courses: (id: string) => data<{ courses: CourseDetail[] }>(api.get(`/admin/students/${encodeURIComponent(id)}/courses`)),
    courseTree: (id: string, courseId: string) => data<CourseTree>(api.get(`/admin/students/${encodeURIComponent(id)}/courses/${encodeURIComponent(courseId)}`)),
    assignments: (id: string) => data<AssignmentsResponse>(api.get(`/admin/students/${encodeURIComponent(id)}/assignments`)),
    testSubmission: (id: string, submissionId: string) => data<TestSubmissionDetail>(api.get(`/admin/students/${encodeURIComponent(id)}/tests/${encodeURIComponent(submissionId)}`)),
    audio: (id: string) => data<AudioOverview>(api.get(`/admin/students/${encodeURIComponent(id)}/audio`)),
    audioRecent: (id: string, page: number, limit = 10) => data<Paged<RecentRecording>>(api.get(`/admin/students/${encodeURIComponent(id)}/audio/recent`, { params: { page, limit } })),
    audioCourse: (id: string, courseId: string) => data<AudioCourseDetail>(api.get(`/admin/students/${encodeURIComponent(id)}/audio/courses/${encodeURIComponent(courseId)}`)),
    problems: (id: string) => data<{ courses: (CourseDetail & { sections: ProblemSection[] })[]; limitations: string[] }>(api.get(`/admin/students/${encodeURIComponent(id)}/problems`)),
    activity: (id: string, q: { from?: string; to?: string; page?: number; limit?: number; type?: string }) =>
        data<ActivityResponse>(api.get(`/admin/students/${encodeURIComponent(id)}/activity`, { params: directoryParams(q as DirectoryFilters) })),
    meetings: (id: string) => data<MeetingsResponse>(api.get(`/admin/students/${encodeURIComponent(id)}/meetings`)),

    // ── Dashboard lists (server-side filters / sorting / paging) ──
    batchList: (params: Record<string, string | number | undefined>) =>
        api.get('/admin/batches', { params: clean(params) }).then(r => r.data as ListPage<BatchListRow, { types: string[] }>),
    courseList: (params: Record<string, string | number | undefined>) =>
        api.get('/admin/courses', { params: clean(params) }).then(r => r.data as ListPage<CourseListRow, { categories: string[] }>),

    // ── Batch Management ──
    batchOverview: (batchId: string, rules: Record<string, number> = {}) => data<BatchOverview>(api.get(`/admin/batches/${encodeURIComponent(batchId)}/overview`, { params: rules })),
    batchStudents: (batchId: string, f: DirectoryFilters) => data<DirectoryPage>(api.get(`/admin/batches/${encodeURIComponent(batchId)}/students`, { params: directoryParams(f) })),
    exportBatchStudents: (batchId: string, f: DirectoryFilters) => download(`/admin/batches/${encodeURIComponent(batchId)}/students/export.csv`, directoryParams({ ...f, page: undefined, limit: undefined }), `batch-students-${new Date().toISOString().slice(0, 10)}.csv`),
    batchAnalytics: (batchId: string, q: Record<string, number>) => data<BatchAnalytics>(api.get(`/admin/batches/${encodeURIComponent(batchId)}/analytics`, { params: q })),
    saveGroups: (batchId: string, groups: Partial<BatchGroup>[]) => data<BatchGroup[]>(api.put(`/admin/batches/${encodeURIComponent(batchId)}/groups`, { communication_groups: groups })),

    // ── Attendance ──
    attendance: (meetingId: string, occurrence: string) => data<AttendanceRoster>(api.get(`/meetings/${encodeURIComponent(meetingId)}/attendance`, { params: { occurrence } })),
    recordAttendance: (meetingId: string, occurrence: string, marks: { user_id: string; status: AttendanceStatus | null }[]) =>
        data<AttendanceRoster>(api.put(`/meetings/${encodeURIComponent(meetingId)}/attendance`, { occurrence, marks })),
    attendanceCounts: (batchId: string) => data<{ meetingId: string; start: string; recorded: number; attended: number }[]>(api.get(`/meetings/batch/${encodeURIComponent(batchId)}/attendance-counts`)),
};

/** HTTP status of an axios error, if any. */
export function httpStatus(err: unknown): number | undefined {
    return (err as { response?: { status?: number } })?.response?.status;
}

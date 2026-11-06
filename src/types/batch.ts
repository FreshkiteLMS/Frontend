import type { Capabilities } from './admin-insights';

export interface Batch {
    id: string;
    name: string;
    description?: string;
    batch_number?: string;
    /** Distinct members (every membership source, one per student). */
    students: number;
    /** Members with learning activity in the last 14 days. */
    activeStudents?: number;
    /** Courses assigned to the batch. */
    courses: number;
    /** Mean overall progress of the members (student-app formula). */
    progress: number;
    /** % of members who finished every course they are enrolled in. */
    completionRate?: number;
    completedAll?: number;
    meetingsScheduled?: number;
    recurringMeetings?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    batchType?: string | null;
    capabilities?: Capabilities;
    groupCount?: number;
}

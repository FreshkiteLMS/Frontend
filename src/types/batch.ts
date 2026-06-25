
export interface Batch {
    id: string;
    name: string;
    description?: string;
    batch_number?: string;
    students: number;
    activeStudents?: number;
    courses: number;
    progress: number;
    completionRate?: number;
    meetingsScheduled?: number;
    recurringMeetings?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
}

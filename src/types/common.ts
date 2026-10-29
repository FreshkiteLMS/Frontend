
export interface DashboardStats {
    totalBatches: number;
    totalStudents: number;
    totalCourses: number;
    activeCourses: number;
    // Optional so an older backend still renders.
    newStudentsLast30Days?: number;
    newBatchesLast30Days?: number;
    /** Offline-approval + per-course purchase requests awaiting review. */
    pendingApprovals?: number;
    paidOrdersLast30Days?: number;
    revenueLast30DaysInr?: number;
}

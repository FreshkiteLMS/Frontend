
export interface StudentEnrollmentData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    batch?: string;
}

export interface Student {
    id: string;
    name: string;
    email: string;
    batch: string;
    enrolled: string;
}

/** Rich row returned by GET /admin/students (listing page). */
export interface AdminStudentRow {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone?: string | null;
    purchasedCourses: number;
    batches: string[];
    batch: string;
    overallProgress: number;
    lastActive?: string | null;
    joinDate: string;
    enrolled: string;
}

export interface PaginatedStudents {
    rows: AdminStudentRow[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Aggregated student profile returned by GET /students/:id/details */
export interface StudentCourseDetail {
    courseId: string;
    courseName: string;
    thumbnailUrl?: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    lastViewed?: string | null;
    purchasedAt?: string | null;
    status: 'completed' | 'in-progress' | 'not-started';
}

export interface StudentBatchDetail {
    batchId: string;
    batchName: string;
    batchNumber?: string;
    joinDate: string;
    status: string;
}

export interface StudentDetails {
    id: string;
    userId: string;
    personalInfo: {
        name: string;
        email: string;
        phone?: string | null;
        registrationDate: string;
        studentType: string;
    };
    courses: StudentCourseDetail[];
    batches: StudentBatchDetail[];
    stats: {
        enrolledCourses: number;
        completedCourses: number;
        averageProgress: number;
    };
}

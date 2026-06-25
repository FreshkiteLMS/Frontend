
import api from './axios';
import { Student, StudentEnrollmentData, StudentDetails, PaginatedStudents } from '@/types/student';

export const studentService = {
    /** Rich aggregated profile for the admin student-detail page. */
    getDetails: async (studentId: string): Promise<StudentDetails> => {
        const response = await api.get(`/students/${studentId}/details`);
        if (response.data.success) return response.data.data as StudentDetails;
        throw new Error(response.data.message || 'Failed to fetch student details');
    },

    /** Paginated, searchable admin student listing (rich rows). */
    listAdmin: async (
        page = 1,
        limit = 10,
        search?: string,
        searchType: string = 'q'
    ): Promise<PaginatedStudents> => {
        const params: any = { page, limit };
        if (search) params[searchType] = search;
        const response = await api.get('/admin/students', { params });
        if (response.data.success) {
            return { rows: response.data.data, meta: response.data.meta };
        }
        throw new Error(response.data.message || 'Failed to fetch students');
    },

    getAll: async (page: number = 1, limit: number = 10, search?: string, searchType: string = 'q'): Promise<Student[] & { data: Student[], meta: any }> => {
        try {
            const params: any = { page, limit };
            if (search) params[searchType] = search;
            const response = await api.get('/admin/students', { params });
            if (response.data.success) {
                const students = response.data.data;
                const meta = response.data.meta;
                return Object.assign([...students], { data: students, meta });
            }
            throw new Error(response.data.message || 'Failed to fetch students');
        } catch (error) {
            console.error('Error fetching students:', error);
            throw error;
        }
    },

    enrollStudent: async (data: StudentEnrollmentData) => {
        try {
            const payload = {
                ...data,
                batchId: data.batch // Map batch to batchId matches backend expectation
            };
            const response = await api.post('/students/enroll', payload);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to enroll student');
        } catch (error: any) {
            console.error('Error enrolling student:', error);
            throw error;
        }
    },

    getDashboardStats: async () => {
        try {
            const response = await api.get('/students/dashboard');
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to fetch dashboard');
        } catch (error: any) {
            console.error('Error fetching dashboard:', error);
            throw error;
        }
    },

    getStudentCourses: async (studentId: string) => {
        try {
            const response = await api.get(`/students/${studentId}/courses`);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to fetch courses');
        } catch (error: any) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    },

    getPendingTests: async (courses: any[]) => {
        try {
            const allTests: any[] = [];
            for (const course of courses) {
                try {
                    const response = await api.get(`/tests?courseId=${course.id}`);
                    if (response.data.success && Array.isArray(response.data.data)) {
                        // Add courseName to each test for display purposes
                        const testsWithCourse = response.data.data.map((t: any) => ({
                            ...t,
                            courseName: course.title
                        }));
                        allTests.push(...testsWithCourse);
                    }
                } catch (err) {
                    console.warn(`Failed to fetch tests for course ${course.id}`, err);
                }
            }
            return allTests;
        } catch (error: any) {
            console.error('Error fetching pending tests:', error);
            return [];
        }
    }
};

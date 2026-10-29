import api from './axios';
import { CourseGroup } from '@/types/course';

export interface BundleCourseRef {
    _id: string;
    id?: string;
    title: string;
    status?: string;
}

export const courseGroupService = {
    /**
     * Fetch all groups with their courses
     */
    getGroupedCourses: async (): Promise<CourseGroup[]> => {
        const response = await api.get('/course-groups');
        // Based on backend QueryUtils.formatResponse, the data is usually in response.data.data
        return response.data.data;
    },
    getGroupById: async (id: string): Promise<CourseGroup> => {
        const response = await api.get(`/course-groups/${id}`);
        return response.data.data;
    },

    /**
     * Create a new course group
     */
    createGroup: async (data: Partial<CourseGroup>) => {
        const response = await api.post('/course-groups', data);
        return response.data.data;
    },

    /**
     * Update a course group
     */
    updateGroup: async (id: string, data: Partial<CourseGroup>) => {
        const response = await api.put(`/course-groups/${id}`, data);
        return response.data.data;
    },

    /**
     * Delete a course group
     */
    deleteGroup: async (id: string) => {
        const response = await api.delete(`/course-groups/${id}`);
        return response.data;
    },

    /**
     * Get all course groups (shallow — admin use)
     */
    getAllGroups: async () => {
        const response = await api.get('/course-groups/all');
        return response.data.data;
    },

    /**
     * Add an existing course into a group
     */
    addCourseToGroup: async (groupId: string, courseId: string, courseName: string) => {
        const response = await api.post(`/course-groups/${groupId}/courses`, {
            courseId,
            name: courseName,
        });
        return response.data.data;
    },

    /**
     * Remove a course from a group
     */
    removeCourseFromGroup: async (groupId: string, courseId: string) => {
        const response = await api.delete(`/course-groups/${groupId}/courses/${courseId}`);
        return response.data;
    },

    /**
     * The bundle's courses in the order students see them (admin).
     */
    getOrderedCourses: async (groupId: string): Promise<BundleCourseRef[]> => {
        const response = await api.get(`/course-groups/${groupId}/courses`);
        return response.data.data;
    },

    /**
     * Save the order students see the bundle's courses in. Courses left out
     * keep their relative order after the listed ones.
     */
    reorderCourses: async (groupId: string, courseIds: string[]): Promise<BundleCourseRef[]> => {
        const response = await api.put(`/course-groups/${groupId}/courses/order`, { courseIds });
        return response.data.data;
    },

    /**
     * Re-run the enrollment backfill for everyone who holds this bundle
     * (idempotent; for retrying after a reported failure).
     */
    syncAccess: async (groupId: string): Promise<{ holders: number; enrolled: number; skipped: number; failed: number }> => {
        const response = await api.post(`/course-groups/${groupId}/sync-access`);
        return response.data.data;
    },
};

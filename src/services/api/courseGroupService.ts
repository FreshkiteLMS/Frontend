import api from './axios';
import { CourseGroup } from '@/types/course';

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
};

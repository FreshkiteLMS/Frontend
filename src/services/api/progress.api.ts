
import api from './axios';

export const progressService = {
    completeSection: async (sectionId: string, studentId: string, courseId: string, timeSpent: number = 0) => {
        try {
            const response = await api.post(`/progress/sections/${sectionId}/complete`, {
                studentId,
                courseId,
                timeSpent
            });
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to mark section as complete');
        } catch (error: any) {
            console.error('Error completing section:', error);
            throw error;
        }
    },

    getStudentProgress: async (studentId: string, courseId: string) => {
        try {
            const response = await api.get(`/progress/students/${studentId}/courses/${courseId}`);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to fetch progress');
        } catch (error: any) {
            console.error('Error fetching progress:', error);
            throw error;
        }
    }
};

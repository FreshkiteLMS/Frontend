import api from './axios';
import { Meeting, MeetingFeed, MeetingInput } from '@/types/meeting';

export const meetingService = {
    /** Caller-scoped feed. Students → own meetings; admins must pass batchId. */
    getMyMeetings: async (windowDays = 60): Promise<MeetingFeed> => {
        const response = await api.get('/meetings', { params: { windowDays } });
        if (response.data.success) return response.data.data as MeetingFeed;
        throw new Error(response.data.message || 'Failed to fetch meetings');
    },

    /** Raw meeting templates for a batch (admin management). */
    getBatchMeetings: async (batchId: string): Promise<Meeting[]> => {
        const response = await api.get(`/meetings/batch/${batchId}`);
        if (response.data.success) return response.data.data as Meeting[];
        throw new Error(response.data.message || 'Failed to fetch batch meetings');
    },

    /** Occurrence-expanded upcoming/past for a batch. */
    getBatchMeetingFeed: async (batchId: string, windowDays = 60): Promise<MeetingFeed> => {
        const response = await api.get(`/meetings/batch/${batchId}`, { params: { expand: true, windowDays } });
        if (response.data.success) return response.data.data as MeetingFeed;
        throw new Error(response.data.message || 'Failed to fetch batch meetings');
    },

    /** Meetings for a specific student (admin view). */
    getStudentMeetings: async (studentId: string, windowDays = 60): Promise<MeetingFeed> => {
        const response = await api.get(`/students/${studentId}/meetings`, { params: { windowDays } });
        if (response.data.success) return response.data.data as MeetingFeed;
        throw new Error(response.data.message || 'Failed to fetch student meetings');
    },

    getById: async (id: string): Promise<Meeting> => {
        const response = await api.get(`/meetings/${id}`);
        if (response.data.success) return response.data.data as Meeting;
        throw new Error(response.data.message || 'Failed to fetch meeting');
    },

    create: async (input: MeetingInput): Promise<Meeting> => {
        const response = await api.post('/meetings', input);
        if (response.data.success) return response.data.data as Meeting;
        throw new Error(response.data.message || 'Failed to create meeting');
    },

    update: async (id: string, input: Partial<MeetingInput>): Promise<Meeting> => {
        const response = await api.put(`/meetings/${id}`, input);
        if (response.data.success) return response.data.data as Meeting;
        throw new Error(response.data.message || 'Failed to update meeting');
    },

    cancel: async (id: string): Promise<Meeting> => {
        const response = await api.patch(`/meetings/${id}/cancel`);
        if (response.data.success) return response.data.data as Meeting;
        throw new Error(response.data.message || 'Failed to cancel meeting');
    },

    remove: async (id: string): Promise<boolean> => {
        const response = await api.delete(`/meetings/${id}`);
        return response.data.success;
    },
};

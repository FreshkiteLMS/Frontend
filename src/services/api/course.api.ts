import api from './axios';

import { Course } from '@/types/course';
import type { ProcessingState } from '@/types/structured-course';

export const courseService = {
    getAll: async (filters: any = {}): Promise<Course[] & { data: Course[], meta: any }> => {
        try {
            const response = await api.get('/courses/search', { params: filters });
            if (response.data.success) {
                const courses = response.data.data;
                const meta = response.data.meta;
                // Return a hybrid that works as an array and as an object with .data property
                return Object.assign([...courses], { data: courses, meta });
            }
            throw new Error(response.data.message || 'Failed to fetch courses');
        } catch (error: any) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    },

    getAllCourses: async (filters: any = {}): Promise<Course[]> => {
        // Increase limit to ensure selling page sees all courses, not just the first 10
        const result = await courseService.getAll({ ...filters, limit: 100 });
        return result.data;
    },

    getCourseById: async (id: string): Promise<Course> => {
        try {
            const response = await api.get(`/courses/${id}`);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to fetch course');
        } catch (error: any) {
            console.error(`Error fetching course ${id}:`, error);
            throw error;
        }
    },

    getCourseWithSections: async (id: string): Promise<Course> => {
        return courseService.getCourseById(id);
    },

    getGroupedCourses: async (filters: any = {}): Promise<Record<string, Course[]>> => {
        try {
            const response = await api.get('/courses/grouped', { params: filters });
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to fetch grouped courses');
        } catch (error: any) {
            console.error('Error fetching grouped courses:', error);
            throw error;
        }
    },

    assign: async (courseId: string, payload: any): Promise<any> => {
        try {
            const response = await api.post(`/courses/${courseId}/assign`, payload);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to assign course');
        } catch (error: any) {
            console.error('Error assigning course:', error);
            throw error;
        }
    },

    create: async (courseData: any): Promise<Course> => {
        try {
            const payload = {
                title: courseData.title,
                description: courseData.description,
                group: courseData.groupId || undefined,
                category: courseData.category || 'other',
                difficulty: courseData.difficulty,
                estimated_duration: Number(courseData.estimated_duration || courseData.estimatedDuration),
                template_type: courseData.template_type || courseData.templateType,
                price: Number(courseData.price),
                thumbnail_url: courseData.thumbnail_url,
                // Source document link. Sent as metadata only — AI processing is
                // the separate processDocument() call the admin triggers explicitly.
                document_url: courseData.document_url ?? null,
                status: 'inactive'
            };

            // Remove undefined group
            if (!payload.group) delete payload.group;

            const response = await api.post('/courses', payload);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to create course');
        } catch (error: any) {
            console.error('Error creating course:', error);
            throw error;
        }
    },

    /**
     * Start AI processing (or reprocessing) of a course's source document.
     * Server-side only — the AI runs in the backend and the result is stored;
     * returns the initial processing state immediately (HTTP 202).
     */
    processDocument: async (courseId: string, documentUrl?: string | null): Promise<ProcessingState> => {
        const response = await api.post(`/courses/${courseId}/process`, documentUrl ? { document_url: documentUrl } : {});
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to start document processing');
    },

    /** Current processing state, or null if the course was never processed. */
    getProcessingStatus: async (courseId: string): Promise<ProcessingState | null> => {
        const response = await api.get(`/courses/${courseId}/processing`);
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch processing status');
    },

    addSection: async (courseId: string, sectionData: any): Promise<any> => {
        try {
            const payload = {
                title: sectionData.title,
                description: sectionData.description || sectionData.title,
                content: sectionData.content || '',
                video_url: sectionData.video_url || sectionData.videoUrl,
                youtube_videos: sectionData.youtube_videos || sectionData.youtubeVideos || [],
                assignments: sectionData.assignments || [],
                resources: sectionData.resources || [],
                duration: sectionData.duration || 0
            };

            const response = await api.post(`/courses/${courseId}/sections`, payload);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to add section');
        } catch (error: any) {
            console.error('Error adding section:', error);
            throw error;
        }
    },

    deleteSection: async (courseId: string, sectionId: string): Promise<any> => {
        try {
            const response = await api.delete(`/courses/${courseId}/sections/${sectionId}`);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to delete section');
        } catch (error: any) {
            console.error('Error deleting section:', error);
            throw error;
        }
    },

    /**
     * Publish via the dedicated, server-validated endpoint (checks title,
     * description, price, and at least one section before going live).
     */
    publish: async (id: string): Promise<Course> => {
        try {
            const response = await api.put(`/courses/${id}/publish`);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to publish course');
        } catch (error: any) {
            console.error('Error publishing course:', error);
            throw error;
        }
    },

    /**
     * Unpublish (take a live course offline). Sets status back to 'inactive'.
     */
    unpublish: async (id: string): Promise<Course> => {
        try {
            const response = await api.put(`/courses/${id}`, { status: 'inactive' });
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to unpublish course');
        } catch (error: any) {
            console.error('Error unpublishing course:', error);
            throw error;
        }
    },
    update: async (id: string, courseData: any): Promise<Course> => {
        try {
            const response = await api.put(`/courses/${id}`, courseData);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to update course');
        } catch (error: any) {
            console.error('Error updating course:', error);
            throw error;
        }
    },
    delete: async (id: string): Promise<boolean> => {
        try {
            const response = await api.delete(`/courses/${id}`);
            return response.data.success;
        } catch (error: any) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }
};

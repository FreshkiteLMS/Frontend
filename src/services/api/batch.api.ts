
import api from './axios';
import { Batch } from '@/types/batch';

export const batchService = {
    getAll: async (page: number = 1, limit: number = 10, search?: string, searchType: string = 'q'): Promise<Batch[] & { data: Batch[], meta: any }> => {
        try {
            const params: any = { page, limit };
            if (search) params[searchType] = search;
            const response = await api.get('/admin/batches', { params });
            if (response.data.success) {
                const batches = response.data.data;
                const meta = response.data.meta;
                return Object.assign([...batches], { data: batches, meta });
            }
            throw new Error(response.data.message || 'Failed to fetch batches');
        } catch (error) {
            console.error('Error fetching batches:', error);
            throw error;
        }
    },

    create: async (batchData: any): Promise<Batch> => {
        try {
            const response = await api.post('/batches', batchData);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to create batch');
        } catch (error: any) {
            console.error('Error creating batch:', error);
            throw error;
        }
    },

    assignStudents: async (batchId: string, studentIds: string[]): Promise<any> => {
        try {
            const response = await api.post(`/batches/${batchId}/students`, { studentIds });
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to assign students');
        } catch (error: any) {
            console.error('Error assigning students:', error);
            throw error;
        }
    },
    update: async (id: string, batchData: any): Promise<Batch> => {
        try {
            const response = await api.put(`/batches/${id}`, batchData);
            if (response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Failed to update batch');
        } catch (error: any) {
            console.error('Error updating batch:', error);
            throw error;
        }
    },
    delete: async (id: string): Promise<boolean> => {
        try {
            const response = await api.delete(`/batches/${id}`);
            return response.data.success;
        } catch (error: any) {
            console.error('Error deleting batch:', error);
            throw error;
        }
    },

    getById: async (id: string): Promise<Batch> => {
        const response = await api.get(`/batches/${id}`);
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to fetch batch');
    },

    /** Batch with enrolled student + course details (aggregated). */
    getDetails: async (id: string): Promise<any> => {
        const response = await api.get(`/batches/${id}/details`);
        if (response.data.success) return response.data.data;
        throw new Error(response.data.message || 'Failed to fetch batch details');
    },

    removeStudent: async (batchId: string, studentId: string): Promise<boolean> => {
        const response = await api.delete(`/batches/${batchId}/students/${studentId}`);
        return response.data.success;
    },

    getStudents: async (batchId: string): Promise<BatchStudentRow[]> => {
        const response = await api.get(`/batches/${batchId}/students`);
        if (response.data.success) return response.data.data as BatchStudentRow[];
        throw new Error(response.data.message || 'Failed to fetch batch students');
    },
};

export interface BatchStudentRow {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone?: string | null;
    coursesAssigned: number;
    progress: number;
}

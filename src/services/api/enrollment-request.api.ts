import api from './axios';
import { EnrollmentRequest, EnrollmentRequestList, ProductType, ApprovalStatus } from '@/types/enrollment-request';

export const enrollmentRequestService = {
    /** Student: submit an offline-payment approval request. */
    create: async (params: { productType: ProductType; productId: string; notes?: string }): Promise<EnrollmentRequest> => {
        const response = await api.post('/enrollment-requests', params);
        if (response.data.success) return response.data.data as EnrollmentRequest;
        throw new Error(response.data.message || 'Failed to submit request');
    },

    /** Student: own request history. */
    getMine: async (): Promise<EnrollmentRequest[]> => {
        const response = await api.get('/enrollment-requests/mine');
        if (response.data.success) return response.data.data as EnrollmentRequest[];
        throw new Error(response.data.message || 'Failed to fetch requests');
    },

    /** Admin: paginated, filterable list with per-status counts. */
    listAdmin: async (params: {
        status?: ApprovalStatus;
        q?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<EnrollmentRequestList> => {
        const response = await api.get('/enrollment-requests', { params });
        if (response.data.success) {
            return {
                rows: response.data.data,
                meta: response.data.meta,
                counts: response.data.counts || { PENDING: 0, APPROVED: 0, REJECTED: 0 },
            };
        }
        throw new Error(response.data.message || 'Failed to fetch requests');
    },

    approve: async (id: string): Promise<EnrollmentRequest> => {
        const response = await api.post(`/enrollment-requests/${id}/approve`);
        if (response.data.success) return response.data.data as EnrollmentRequest;
        throw new Error(response.data.message || 'Failed to approve request');
    },

    reject: async (id: string, adminNotes?: string): Promise<EnrollmentRequest> => {
        const response = await api.post(`/enrollment-requests/${id}/reject`, { adminNotes });
        if (response.data.success) return response.data.data as EnrollmentRequest;
        throw new Error(response.data.message || 'Failed to reject request');
    },
};

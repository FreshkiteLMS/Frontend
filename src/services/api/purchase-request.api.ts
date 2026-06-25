import api from './axios';

export const purchaseRequestService = {
    createRequest: async (params: {
        student_id: string;
        course_id: string;
        purchase_type: 'full_course' | 'from_list';
        notes?: string;
    }): Promise<any> => {
        try {
            const response = await api.post('/course-purchase-requests', params);
            return response.data;
        } catch (error: any) {
            console.error('Error creating purchase request:', error);
            throw error;
        }
    }
};


import api from './axios';
import { DashboardStats } from '@/types/common';

export const adminService = {
    getDashboardStats: async (): Promise<DashboardStats> => {
        try {
            const response = await api.get('/admin/dashboard');
            if (response.data.success) {
                return response.data.data.overview;
            }
            throw new Error(response.data.message || 'Failed to fetch dashboard stats');
        } catch (error: any) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }
};

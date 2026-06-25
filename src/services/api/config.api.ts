import api from './axios';

export interface PublicConfig {
    subscriptionPrice: number;
    totalCourseCount: number;
    currency: string;
}

export const configService = {
    getPublicConfig: async (): Promise<PublicConfig> => {
        const response = await api.get('/config');
        return response.data.data;
    },
};

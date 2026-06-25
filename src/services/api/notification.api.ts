import api from './axios';

export type NotificationType =
    | 'NEW_STUDENT'
    | 'COURSE_PURCHASE'
    | 'request_approved'
    | 'request_rejected'
    | 'system'
    | 'BATCH_ADDED'
    | 'BATCH_REMOVED'
    | 'MEETING_CREATED'
    | 'MEETING_UPDATED'
    | 'MEETING_CANCELLED'
    | 'MEETING_REMINDER'
    | 'COURSE_ASSIGNED'
    | 'COURSE_UPDATED';

export interface Notification {
    _id?: string;
    id?: string;
    type: NotificationType | string;
    title: string;
    message: string;
    user_id?: string;
    course_id?: string;
    batch_id?: string;
    meeting_id?: string;
    status?: 'read' | 'unread';
    isRead?: boolean;
    createdAt?: string;
    created_at?: string;
}

export interface NotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
}

export const notificationService = {
    /** All notifications for the current user + unread count (newest first). */
    list: async (): Promise<NotificationsResponse> => {
        const response = await api.get('/notifications');
        if (response.data.success) {
            const data = response.data.data || {};
            return {
                notifications: data.notifications || [],
                unreadCount: data.unreadCount ?? 0,
            };
        }
        throw new Error(response.data.message || 'Failed to fetch notifications');
    },

    markAsRead: async (id: string): Promise<boolean> => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data.success;
    },

    markAllRead: async (): Promise<boolean> => {
        const response = await api.patch('/notifications/read-all');
        return response.data.success;
    },

    deleteNotification: async (id: string): Promise<boolean> => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data.success;
    },

    clearAll: async (): Promise<boolean> => {
        const response = await api.delete('/notifications');
        return response.data.success;
    },
};

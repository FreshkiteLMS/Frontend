import api from './axios';
import type {
    BlockedUserView,
    ChatProfileView,
    ChatUserSummary,
    FriendRequestView,
    FriendSuggestion,
    FriendView,
    LeaderboardEntry,
    UpdateChatProfileInput,
} from '@/types/chat';

/** Unwrap the standard `{success, data, message}` envelope. */
function unwrap<T>(response: { data: { success: boolean; data: T; message?: string } }, fallback: string): T {
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || fallback);
}

export const chatSocialService = {
    // ------------------------------------------------------------------
    // Friend requests
    // ------------------------------------------------------------------
    sendFriendRequest: async (toUserId: string, message?: string): Promise<FriendRequestView> => {
        const response = await api.post('/chat/friends/requests', { to_user_id: toUserId, message });
        return unwrap<FriendRequestView>(response, 'Failed to send friend request');
    },

    listFriendRequests: async (direction: 'in' | 'out'): Promise<FriendRequestView[]> => {
        const response = await api.get('/chat/friends/requests', { params: { direction } });
        return unwrap<FriendRequestView[]>(response, 'Failed to load friend requests');
    },

    acceptFriendRequest: async (requestId: string): Promise<unknown> => {
        const response = await api.post(`/chat/friends/requests/${requestId}/accept`);
        return unwrap<unknown>(response, 'Failed to accept friend request');
    },

    rejectFriendRequest: async (requestId: string): Promise<unknown> => {
        const response = await api.post(`/chat/friends/requests/${requestId}/reject`);
        return unwrap<unknown>(response, 'Failed to reject friend request');
    },

    cancelFriendRequest: async (requestId: string): Promise<unknown> => {
        const response = await api.post(`/chat/friends/requests/${requestId}/cancel`);
        return unwrap<unknown>(response, 'Failed to cancel friend request');
    },

    // ------------------------------------------------------------------
    // Friends
    // ------------------------------------------------------------------
    listFriends: async (): Promise<FriendView[]> => {
        const response = await api.get('/chat/friends');
        return unwrap<FriendView[]>(response, 'Failed to load friends');
    },

    unfriend: async (userId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/friends/${userId}`);
        return unwrap<unknown>(response, 'Failed to remove friend');
    },

    suggestions: async (): Promise<FriendSuggestion[]> => {
        const response = await api.get('/chat/friends/suggestions');
        return unwrap<FriendSuggestion[]>(response, 'Failed to load suggestions');
    },

    // ------------------------------------------------------------------
    // Blocks
    // ------------------------------------------------------------------
    blockUser: async (userId: string): Promise<unknown> => {
        const response = await api.post('/chat/blocks', { user_id: userId });
        return unwrap<unknown>(response, 'Failed to block user');
    },

    unblockUser: async (userId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/blocks/${userId}`);
        return unwrap<unknown>(response, 'Failed to unblock user');
    },

    listBlocked: async (): Promise<BlockedUserView[]> => {
        const response = await api.get('/chat/blocks');
        return unwrap<BlockedUserView[]>(response, 'Failed to load blocked users');
    },

    // ------------------------------------------------------------------
    // Profiles
    // ------------------------------------------------------------------
    getProfile: async (userId: string): Promise<ChatProfileView> => {
        const response = await api.get(`/chat/profiles/${userId}`);
        return unwrap<ChatProfileView>(response, 'Failed to load profile');
    },

    updateMyProfile: async (dto: UpdateChatProfileInput): Promise<ChatProfileView> => {
        const response = await api.put('/chat/profiles/me', dto);
        return unwrap<ChatProfileView>(response, 'Failed to update profile');
    },

    // ------------------------------------------------------------------
    // Leaderboard
    // ------------------------------------------------------------------
    leaderboard: async (period: 'weekly' | 'monthly'): Promise<LeaderboardEntry[]> => {
        const response = await api.get('/chat/leaderboard', { params: { period } });
        return unwrap<LeaderboardEntry[]>(response, 'Failed to load leaderboard');
    },

    // ------------------------------------------------------------------
    // User search
    // ------------------------------------------------------------------
    searchUsers: async (q: string): Promise<ChatUserSummary[]> => {
        const response = await api.get('/chat/users/search', { params: { q } });
        return unwrap<ChatUserSummary[]>(response, 'Failed to search users');
    },

    // ------------------------------------------------------------------
    // Push tokens
    // ------------------------------------------------------------------
    registerPushToken: async (token: string, platform: 'web' | 'android' | 'ios' = 'web'): Promise<unknown> => {
        const response = await api.post('/chat/push-tokens', { token, platform });
        return unwrap<unknown>(response, 'Failed to register push token');
    },

    removePushToken: async (token: string): Promise<unknown> => {
        const response = await api.delete(`/chat/push-tokens/${encodeURIComponent(token)}`);
        return unwrap<unknown>(response, 'Failed to remove push token');
    },
};

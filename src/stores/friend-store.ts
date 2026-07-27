import { create } from 'zustand';
import { chatSocialService } from '@/services/api/chat-social.api';
import type { BlockedUserView, FriendRequestView, FriendSuggestion, FriendView } from '@/types/chat';

export interface FriendState {
    friends: FriendView[];
    requestsIn: FriendRequestView[];
    requestsOut: FriendRequestView[];
    suggestions: FriendSuggestion[];
    blocked: BlockedUserView[];

    loading: boolean;
    loaded: boolean;

    loadAll: () => Promise<void>;
    loadFriends: () => Promise<void>;
    loadRequests: () => Promise<void>;
    loadSuggestions: () => Promise<void>;
    loadBlocked: () => Promise<void>;

    sendRequest: (toUserId: string, message?: string) => Promise<void>;
    acceptRequest: (requestId: string) => Promise<void>;
    rejectRequest: (requestId: string) => Promise<void>;
    cancelRequest: (requestId: string) => Promise<void>;
    unfriend: (userId: string) => Promise<void>;
    block: (userId: string) => Promise<void>;
    unblock: (userId: string) => Promise<void>;

    /** Socket: an incoming friend request arrived. */
    applyIncomingRequest: (request: FriendRequestView) => void;
    /** Socket: someone accepted a request we sent. */
    applyAccepted: (by: { id: string; name: string }) => void;

    reset: () => void;
}

export const useFriendStore = create<FriendState>()((set, get) => ({
    friends: [],
    requestsIn: [],
    requestsOut: [],
    suggestions: [],
    blocked: [],
    loading: false,
    loaded: false,

    loadAll: async () => {
        set({ loading: true });
        try {
            const [friends, requestsIn, requestsOut, suggestions, blocked] = await Promise.all([
                chatSocialService.listFriends().catch(() => [] as FriendView[]),
                chatSocialService.listFriendRequests('in').catch(() => [] as FriendRequestView[]),
                chatSocialService.listFriendRequests('out').catch(() => [] as FriendRequestView[]),
                chatSocialService.suggestions().catch(() => [] as FriendSuggestion[]),
                chatSocialService.listBlocked().catch(() => [] as BlockedUserView[]),
            ]);
            set({ friends, requestsIn, requestsOut, suggestions, blocked, loaded: true });
        } finally {
            set({ loading: false });
        }
    },

    loadFriends: async () => {
        const friends = await chatSocialService.listFriends();
        set({ friends });
    },

    loadRequests: async () => {
        const [requestsIn, requestsOut] = await Promise.all([
            chatSocialService.listFriendRequests('in'),
            chatSocialService.listFriendRequests('out'),
        ]);
        set({ requestsIn, requestsOut });
    },

    loadSuggestions: async () => {
        const suggestions = await chatSocialService.suggestions();
        set({ suggestions });
    },

    loadBlocked: async () => {
        const blocked = await chatSocialService.listBlocked();
        set({ blocked });
    },

    sendRequest: async (toUserId, message) => {
        const request = await chatSocialService.sendFriendRequest(toUserId, message);
        set((s) => ({
            requestsOut: [request, ...s.requestsOut.filter((r) => r.id !== request.id)],
            suggestions: s.suggestions.filter((sg) => sg.id !== toUserId),
        }));
    },

    acceptRequest: async (requestId) => {
        const request = get().requestsIn.find((r) => r.id === requestId);
        // Optimistic: drop from the inbox immediately.
        set((s) => ({ requestsIn: s.requestsIn.filter((r) => r.id !== requestId) }));
        try {
            await chatSocialService.acceptFriendRequest(requestId);
            await get().loadFriends();
        } catch (err) {
            if (request) set((s) => ({ requestsIn: [request, ...s.requestsIn] }));
            throw err;
        }
    },

    rejectRequest: async (requestId) => {
        const request = get().requestsIn.find((r) => r.id === requestId);
        set((s) => ({ requestsIn: s.requestsIn.filter((r) => r.id !== requestId) }));
        try {
            await chatSocialService.rejectFriendRequest(requestId);
        } catch (err) {
            if (request) set((s) => ({ requestsIn: [request, ...s.requestsIn] }));
            throw err;
        }
    },

    cancelRequest: async (requestId) => {
        const request = get().requestsOut.find((r) => r.id === requestId);
        set((s) => ({ requestsOut: s.requestsOut.filter((r) => r.id !== requestId) }));
        try {
            await chatSocialService.cancelFriendRequest(requestId);
        } catch (err) {
            if (request) set((s) => ({ requestsOut: [request, ...s.requestsOut] }));
            throw err;
        }
    },

    unfriend: async (userId) => {
        const previous = get().friends;
        set((s) => ({ friends: s.friends.filter((f) => f.id !== userId) }));
        try {
            await chatSocialService.unfriend(userId);
        } catch (err) {
            set({ friends: previous });
            throw err;
        }
    },

    block: async (userId) => {
        await chatSocialService.blockUser(userId);
        set((s) => ({
            friends: s.friends.filter((f) => f.id !== userId),
            requestsIn: s.requestsIn.filter((r) => r.from_user_id !== userId),
            requestsOut: s.requestsOut.filter((r) => r.to_user_id !== userId),
            suggestions: s.suggestions.filter((sg) => sg.id !== userId),
        }));
        await get().loadBlocked().catch(() => undefined);
    },

    unblock: async (userId) => {
        const previous = get().blocked;
        set((s) => ({ blocked: s.blocked.filter((b) => b.id !== userId) }));
        try {
            await chatSocialService.unblockUser(userId);
        } catch (err) {
            set({ blocked: previous });
            throw err;
        }
    },

    applyIncomingRequest: (request) => {
        if (!request?.id) return;
        set((s) =>
            s.requestsIn.some((r) => r.id === request.id)
                ? {}
                : { requestsIn: [request, ...s.requestsIn] }
        );
    },

    applyAccepted: (by) => {
        if (!by?.id) return;
        set((s) => ({ requestsOut: s.requestsOut.filter((r) => r.to_user_id !== by.id) }));
        // Refresh the roster so the new friend shows up with presence/mutuals.
        get().loadFriends().catch(() => undefined);
    },

    reset: () =>
        set({
            friends: [],
            requestsIn: [],
            requestsOut: [],
            suggestions: [],
            blocked: [],
            loading: false,
            loaded: false,
        }),
}));

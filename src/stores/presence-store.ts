import { create } from 'zustand';
import { chatService } from '@/services/api/chat.api';
import { getPresenceNsp } from '@/services/chat-socket';
import { CHAT_EVENTS, type PresenceInfo, type PresenceStatus } from '@/types/chat';

/** Server caps presence subscriptions at 300 user ids per emit. */
const SUBSCRIBE_CAP = 300;

const OFFLINE: PresenceStatus = 'offline';

function normalize(entry: PresenceInfo | { userId: string; status: PresenceStatus; last_seen_at: string | null }): PresenceInfo {
    // The presence namespace emits `userOnline`/`userOffline` with a camelCase
    // `userId`, while `presenceState` rows use snake_case `user_id`.
    if ('user_id' in entry) {
        return {
            user_id: entry.user_id,
            status: entry.status || OFFLINE,
            last_seen_at: entry.last_seen_at ?? null,
        };
    }
    return {
        user_id: entry.userId,
        status: entry.status || OFFLINE,
        last_seen_at: entry.last_seen_at ?? null,
    };
}

export interface PresenceState {
    statuses: Record<string, PresenceInfo>;
    /** User ids already sent to the server (avoids re-subscribing). */
    subscribed: Record<string, true>;
    ownStatus: PresenceStatus;

    subscribe: (userIds: string[]) => void;
    applyPresence: (
        payload:
            | PresenceInfo
            | PresenceInfo[]
            | { userId: string; status: PresenceStatus; last_seen_at: string | null }
    ) => void;
    statusOf: (userId: string) => PresenceInfo;
    isOnline: (userId: string) => boolean;
    setOwnStatus: (status: PresenceStatus) => Promise<void>;
    /** Re-emit every known subscription (call after a socket reconnect). */
    resubscribeAll: () => void;
    reset: () => void;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
    statuses: {},
    subscribed: {},
    ownStatus: 'online',

    subscribe: (userIds) => {
        const { subscribed } = get();
        const fresh = Array.from(new Set(userIds.filter((id) => id && !subscribed[id]))).slice(0, SUBSCRIBE_CAP);
        if (fresh.length === 0) return;

        set((s) => {
            const next = { ...s.subscribed };
            for (const id of fresh) next[id] = true;
            return { subscribed: next };
        });

        try {
            const socket = getPresenceNsp();
            socket.emit(CHAT_EVENTS.SUBSCRIBE_PRESENCE, { userIds: fresh });
            // The server replies with a `presenceState` array, handled by
            // useChatSocket → applyPresence. If the socket is not connected yet,
            // fall back to REST so the UI is not left blank.
            if (!socket.connected) {
                chatService
                    .getPresence(fresh)
                    .then((rows) => get().applyPresence(rows))
                    .catch(() => undefined);
            }
        } catch {
            chatService
                .getPresence(fresh)
                .then((rows) => get().applyPresence(rows))
                .catch(() => undefined);
        }
    },

    applyPresence: (payload) => {
        const rows = (Array.isArray(payload) ? payload : [payload]).map(normalize).filter((r) => r.user_id);
        if (rows.length === 0) return;
        set((s) => {
            const statuses = { ...s.statuses };
            for (const row of rows) statuses[row.user_id] = row;
            return { statuses };
        });
    },

    statusOf: (userId) =>
        get().statuses[userId] || { user_id: userId, status: OFFLINE, last_seen_at: null },

    isOnline: (userId) => get().statuses[userId]?.status === 'online',

    setOwnStatus: async (status) => {
        const previous = get().ownStatus;
        set({ ownStatus: status });
        try {
            getPresenceNsp().emit(CHAT_EVENTS.SET_STATUS, { status });
            await chatService.setPresenceStatus(status);
        } catch (err) {
            set({ ownStatus: previous });
            throw err;
        }
    },

    resubscribeAll: () => {
        const ids = Object.keys(get().subscribed);
        if (ids.length === 0) return;
        try {
            const socket = getPresenceNsp();
            for (let i = 0; i < ids.length; i += SUBSCRIBE_CAP) {
                socket.emit(CHAT_EVENTS.SUBSCRIBE_PRESENCE, { userIds: ids.slice(i, i + SUBSCRIBE_CAP) });
            }
        } catch {
            // socket unavailable — presence will refresh on next subscribe()
        }
    },

    reset: () => set({ statuses: {}, subscribed: {}, ownStatus: 'online' }),
}));
